'use server'

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { authenticator } from 'otplib'
import QRCode from 'qrcode'

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  totpCode: z.string().optional(),
})

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

const setup2FASchema = z.object({
  totpCode: z.string().length(6, 'TOTP code must be 6 digits'),
})

const disable2FASchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  totpCode: z.string().length(6, 'TOTP code must be 6 digits'),
})

// Types for form state management
export interface ActionState {
  message?: string
  errors?: Record<string, string[]>
  data?: any
}

export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'user'
  twoFactorEnabled: boolean
  createdAt: Date
}

// Helper function to get user from database (to be implemented with actual DB)
async function getUserByEmail(_email: string): Promise<User | null> {
  // This would be replaced with actual database query
  // For now, return null as placeholder
  return null
}

// Helper function to create user in database
async function createUser(userData: {
  email: string
  password: string
  name: string
}): Promise<User> {
  // This would be replaced with actual database insertion
  // For now, return mock user
  return {
    id: 'mock-id',
    email: userData.email,
    name: userData.name,
    role: 'user',
    twoFactorEnabled: false,
    createdAt: new Date(),
  }
}

// Helper function to update user 2FA settings
async function updateUser2FA(
  _userId: string,
  _twoFactorSecret?: string,
  _twoFactorEnabled?: boolean
): Promise<void> {
  // This would be replaced with actual database update
}

// Helper function to create JWT token
function createJWTToken(user: User): string {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  )
}

// Helper function to set authentication cookie
async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
}

// Helper function to clear authentication cookie
async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete('auth-token')
}

/**
 * Server Action for user login
 */
export async function loginAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    // Validate form data
    const validatedFields = loginSchema.safeParse({
      email: formData.get('email') || '',
      password: formData.get('password') || '',
      totpCode: formData.get('totpCode') || undefined,
    })

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Invalid form data. Please check your inputs.',
      }
    }

    const { email, password, totpCode } = validatedFields.data

    // Get user from database
    const user = await getUserByEmail(email)
    if (!user) {
      return {
        message: 'Invalid email or password',
      }
    }

    // Verify password (placeholder - would use actual hashed password comparison)
    const isValidPassword = await bcrypt.compare(password, 'hashed-password')
    if (!isValidPassword) {
      return {
        message: 'Invalid email or password',
      }
    }

    // Check 2FA if enabled
    if (user.twoFactorEnabled) {
      if (!totpCode) {
        return {
          message: 'Two-factor authentication code is required',
          data: { requires2FA: true },
        }
      }

      // Verify TOTP code (placeholder - would use actual secret)
      const isValid2FA = authenticator.verify({
        token: totpCode,
        secret: 'user-2fa-secret',
      })

      if (!isValid2FA) {
        return {
          message: 'Invalid two-factor authentication code',
          data: { requires2FA: true },
        }
      }
    }

    // Create JWT token and set cookie
    const token = createJWTToken(user)
    await setAuthCookie(token)

    // Revalidate and redirect
    revalidatePath('/dashboard')
  } catch (error) {
    console.error('Login error:', error)
    return {
      message: 'An unexpected error occurred. Please try again.',
    }
  }

  redirect('/dashboard')
}

/**
 * Server Action for user signup
 */
export async function signupAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    // Validate form data
    const validatedFields = signupSchema.safeParse({
      email: formData.get('email') || '',
      password: formData.get('password') || '',
      confirmPassword: formData.get('confirmPassword') || '',
      name: formData.get('name') || '',
    })

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Invalid form data. Please check your inputs.',
      }
    }

    const { email, password, name } = validatedFields.data

    // Check if user already exists
    const existingUser = await getUserByEmail(email)
    if (existingUser) {
      return {
        message: 'A user with this email already exists',
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = await createUser({
      email,
      password: hashedPassword,
      name,
    })

    // Create JWT token and set cookie
    const token = createJWTToken(user)
    await setAuthCookie(token)

    // Revalidate and redirect
    revalidatePath('/dashboard')
  } catch (error) {
    console.error('Signup error:', error)
    return {
      message: 'An unexpected error occurred. Please try again.',
    }
  }

  redirect('/dashboard')
}

/**
 * Server Action for user logout
 */
export async function logoutAction(): Promise<void> {
  try {
    await clearAuthCookie()
    revalidatePath('/')
  } catch (error) {
    console.error('Logout error:', error)
  }

  redirect('/login')
}

/**
 * Server Action for generating 2FA setup QR code
 */
export async function generate2FASetupAction(): Promise<ActionState> {
  try {
    // Get current user (would be from session/JWT)
    // const userId = 'current-user-id' // Placeholder - would be retrieved from session

    // Generate secret
    const secret = authenticator.generateSecret()
    const serviceName = 'Traffboard Analytics'
    const accountName = 'user@example.com' // Would be actual user email

    // Generate QR code URL
    const otpauth = authenticator.keyuri(accountName, serviceName, secret)
    const qrCodeDataURL = await QRCode.toDataURL(otpauth)

    return {
      data: {
        secret,
        qrCode: qrCodeDataURL,
        manualEntryKey: secret,
      },
    }
  } catch (error) {
    console.error('2FA setup generation error:', error)
    return {
      message: 'Failed to generate 2FA setup. Please try again.',
    }
  }
}

/**
 * Server Action for enabling 2FA
 */
export async function setup2FAAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    // Validate form data
    const validatedFields = setup2FASchema.safeParse({
      totpCode: formData.get('totpCode') || '',
    })

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Invalid TOTP code format.',
      }
    }

    const { totpCode } = validatedFields.data
    const secret = formData.get('secret') as string

    if (!secret) {
      return {
        message: 'Invalid setup session. Please restart 2FA setup.',
      }
    }

    // Verify TOTP code
    const isValidCode = authenticator.verify({
      token: totpCode,
      secret,
    })

    if (!isValidCode) {
      return {
        message: 'Invalid authentication code. Please try again.',
      }
    }

    // Update user with 2FA enabled
    const userId = 'current-user-id' // Would be from session
    await updateUser2FA(userId, secret, true)

    // Revalidate settings page
    revalidatePath('/dashboard/settings')

    return {
      message: 'Two-factor authentication has been successfully enabled.',
      data: { success: true },
    }
  } catch (error) {
    console.error('2FA setup error:', error)
    return {
      message: 'Failed to enable two-factor authentication. Please try again.',
    }
  }
}

/**
 * Server Action for disabling 2FA
 */
export async function disable2FAAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    // Validate form data
    const validatedFields = disable2FASchema.safeParse({
      password: formData.get('password') || '',
      totpCode: formData.get('totpCode') || '',
    })

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Invalid form data.',
      }
    }

    const { password, totpCode } = validatedFields.data

    // Get current user
    const userId = 'current-user-id' // Would be from session
    const user = await getUserByEmail('user@example.com') // Would get from session

    if (!user) {
      return {
        message: 'User not found.',
      }
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, 'hashed-password')
    if (!isValidPassword) {
      return {
        message: 'Invalid password.',
      }
    }

    // Verify TOTP code
    const isValid2FA = authenticator.verify({
      token: totpCode,
      secret: 'user-2fa-secret', // Would be from database
    })

    if (!isValid2FA) {
      return {
        message: 'Invalid authentication code.',
      }
    }

    // Disable 2FA
    await updateUser2FA(userId, undefined, false)

    // Revalidate settings page
    revalidatePath('/dashboard/settings')

    return {
      message: 'Two-factor authentication has been disabled.',
      data: { success: true },
    }
  } catch (error) {
    console.error('2FA disable error:', error)
    return {
      message: 'Failed to disable two-factor authentication. Please try again.',
    }
  }
}
