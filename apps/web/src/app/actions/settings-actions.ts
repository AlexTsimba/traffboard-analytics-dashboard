'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'

// Validation schemas
const userProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  timezone: z.string().min(1, 'Please select a timezone'),
  language: z.string().min(1, 'Please select a language'),
})

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(6, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "New passwords don't match",
  path: ["confirmPassword"],
})

const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  dailyReports: z.boolean(),
  weeklyReports: z.boolean(),
  alertThresholds: z.boolean(),
  systemUpdates: z.boolean(),
})

const dashboardPreferencesSchema = z.object({
  defaultDateRange: z.enum(['7d', '30d', '90d', '1y']),
  defaultChartType: z.enum(['area', 'line', 'bar']),
  defaultMetricGroup: z.enum(['general', 'visit-to-reg', 'reg-to-ftd', 'quality']),
  autoRefreshInterval: z.enum(['off', '30s', '1m', '5m', '15m']),
  compactMode: z.boolean(),
  darkMode: z.boolean(),
})

const apiKeyGenerationSchema = z.object({
  name: z.string().min(1, 'API key name is required'),
  permissions: z.array(z.string()).min(1, 'At least one permission is required'),
  expiresIn: z.enum(['30d', '90d', '1y', 'never']),
})

// Types
export interface ActionState {
  message?: string
  errors?: Record<string, string[]>
  data?: any
}

export interface UserProfile {
  id: string
  name: string
  email: string
  timezone: string
  language: string
  role: 'admin' | 'user'
  createdAt: Date
  lastLoginAt?: Date
}

export interface NotificationSettings {
  emailNotifications: boolean
  pushNotifications: boolean
  dailyReports: boolean
  weeklyReports: boolean
  alertThresholds: boolean
  systemUpdates: boolean
}

export interface DashboardPreferences {
  defaultDateRange: '7d' | '30d' | '90d' | '1y'
  defaultChartType: 'area' | 'line' | 'bar'
  defaultMetricGroup: 'general' | 'visit-to-reg' | 'reg-to-ftd' | 'quality'
  autoRefreshInterval: 'off' | '30s' | '1m' | '5m' | '15m'
  compactMode: boolean
  darkMode: boolean
}

export interface APIKey {
  id: string
  name: string
  key: string
  permissions: string[]
  expiresAt?: Date
  createdAt: Date
  lastUsedAt?: Date
}

// Helper functions for database operations (placeholders)
async function getCurrentUser(): Promise<UserProfile | null> {
  // This would get user from session/JWT
  return {
    id: 'current-user-id',
    name: 'Current User',
    email: 'user@example.com',
    timezone: 'UTC',
    language: 'en',
    role: 'user',
    createdAt: new Date(),
  }
}

async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<void> {
  // This would update user in database
  console.log('Updating user profile:', { userId, updates })
}

async function updateUserPassword(
  userId: string,
  _hashedPassword: string
): Promise<void> {
  // This would update password in database
  console.log('Updating user password:', { userId })
}

async function updateNotificationSettings(
  userId: string,
  settings: NotificationSettings
): Promise<void> {
  // This would update notification settings in database
  console.log('Updating notification settings:', { userId, settings })
}

async function updateDashboardPreferences(
  userId: string,
  preferences: DashboardPreferences
): Promise<void> {
  // This would update dashboard preferences in database
  console.log('Updating dashboard preferences:', { userId, preferences })
}

async function generateAPIKey(
  userId: string,
  name: string,
  permissions: string[],
  expiresIn: string
): Promise<APIKey> {
  // This would generate and store API key in database
  const key = `tk_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
  
  let expiresAt: Date | undefined
  if (expiresIn !== 'never') {
    const days = expiresIn === '30d' ? 30 : expiresIn === '90d' ? 90 : 365
    expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  }

  return {
    id: `api_${Date.now()}`,
    name,
    key,
    permissions,
    expiresAt,
    createdAt: new Date(),
  }
}

async function revokeAPIKey(userId: string, keyId: string): Promise<void> {
  // This would revoke API key in database
  console.log('Revoking API key:', { userId, keyId })
}

/**
 * Server Action for updating user profile
 */
export async function updateUserProfileAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    // Parse form data
    const profileData = {
      name: formData.get('name') as string || '',
      email: formData.get('email') as string || '',
      timezone: formData.get('timezone') as string || '',
      language: formData.get('language') as string || '',
    }

    // Validate form data
    const validatedFields = userProfileSchema.safeParse(profileData)
    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Invalid form data. Please check your inputs.',
      }
    }

    // Get current user
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return {
        message: 'User not found.',
      }
    }

    // Update user profile
    await updateUserProfile(currentUser.id, validatedFields.data)

    // Revalidate settings page
    revalidatePath('/dashboard/settings')

    return {
      data: { profile: validatedFields.data, updated: true },
      message: 'Profile updated successfully!',
    }
  } catch (error) {
    console.error('Profile update error:', error)
    return {
      message: 'Failed to update profile. Please try again.',
    }
  }
}

/**
 * Server Action for changing user password
 */
export async function changePasswordAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    // Parse form data
    const passwordData = {
      currentPassword: formData.get('currentPassword') as string || '',
      newPassword: formData.get('newPassword') as string || '',
      confirmPassword: formData.get('confirmPassword') as string || '',
    }

    // Validate form data
    const validatedFields = passwordChangeSchema.safeParse(passwordData)
    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Invalid form data.',
      }
    }

    // Get current user
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return {
        message: 'User not found.',
      }
    }

    // Verify current password (placeholder - would use actual hashed password)
    const isValidPassword = await bcrypt.compare(
      validatedFields.data.currentPassword,
      'current-hashed-password'
    )
    if (!isValidPassword) {
      return {
        message: 'Current password is incorrect.',
      }
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(validatedFields.data.newPassword, 12)

    // Update password
    await updateUserPassword(currentUser.id, hashedNewPassword)

    return {
      data: { passwordChanged: true },
      message: 'Password changed successfully!',
    }
  } catch (error) {
    console.error('Password change error:', error)
    return {
      message: 'Failed to change password. Please try again.',
    }
  }
}

/**
 * Server Action for updating notification settings
 */
export async function updateNotificationSettingsAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    // Parse form data
    const notificationData = {
      emailNotifications: formData.get('emailNotifications') === 'on',
      pushNotifications: formData.get('pushNotifications') === 'on',
      dailyReports: formData.get('dailyReports') === 'on',
      weeklyReports: formData.get('weeklyReports') === 'on',
      alertThresholds: formData.get('alertThresholds') === 'on',
      systemUpdates: formData.get('systemUpdates') === 'on',
    }

    // Validate form data
    const validatedFields = notificationSettingsSchema.safeParse(notificationData)
    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Invalid notification settings.',
      }
    }

    // Get current user
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return {
        message: 'User not found.',
      }
    }

    // Update notification settings
    await updateNotificationSettings(currentUser.id, validatedFields.data)

    // Revalidate settings page
    revalidatePath('/dashboard/settings')

    return {
      data: { settings: validatedFields.data, updated: true },
      message: 'Notification settings updated successfully!',
    }
  } catch (error) {
    console.error('Notification settings update error:', error)
    return {
      message: 'Failed to update notification settings. Please try again.',
    }
  }
}

/**
 * Server Action for updating dashboard preferences
 */
export async function updateDashboardPreferencesAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    // Parse form data
    const preferencesData = {
      defaultDateRange: formData.get('defaultDateRange') as string || '',
      defaultChartType: formData.get('defaultChartType') as string || '',
      defaultMetricGroup: formData.get('defaultMetricGroup') as string || '',
      autoRefreshInterval: formData.get('autoRefreshInterval') as string || '',
      compactMode: formData.get('compactMode') === 'on',
      darkMode: formData.get('darkMode') === 'on',
    }

    // Validate form data
    const validatedFields = dashboardPreferencesSchema.safeParse(preferencesData)
    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Invalid dashboard preferences.',
      }
    }

    // Get current user
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return {
        message: 'User not found.',
      }
    }

    // Update dashboard preferences
    await updateDashboardPreferences(currentUser.id, validatedFields.data)

    // Revalidate settings and dashboard pages
    revalidatePath('/dashboard/settings')
    revalidatePath('/dashboard')

    return {
      data: { preferences: validatedFields.data, updated: true },
      message: 'Dashboard preferences updated successfully!',
    }
  } catch (error) {
    console.error('Dashboard preferences update error:', error)
    return {
      message: 'Failed to update dashboard preferences. Please try again.',
    }
  }
}

/**
 * Server Action for generating API key
 */
export async function generateAPIKeyAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    // Parse form data
    const apiKeyData = {
      name: formData.get('name') as string || '',
      permissions: formData.getAll('permissions') as string[],
      expiresIn: formData.get('expiresIn') as string || '',
    }

    // Validate form data
    const validatedFields = apiKeyGenerationSchema.safeParse(apiKeyData)
    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Invalid API key configuration.',
      }
    }

    // Get current user
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return {
        message: 'User not found.',
      }
    }

    // Generate API key
    const apiKey = await generateAPIKey(
      currentUser.id,
      validatedFields.data.name,
      validatedFields.data.permissions,
      validatedFields.data.expiresIn
    )

    // Revalidate settings page
    revalidatePath('/dashboard/settings')

    return {
      data: { apiKey, generated: true },
      message: 'API key generated successfully! Make sure to copy it now - you won\'t see it again.',
    }
  } catch (error) {
    console.error('API key generation error:', error)
    return {
      message: 'Failed to generate API key. Please try again.',
    }
  }
}

/**
 * Server Action for revoking API key
 */
export async function revokeAPIKeyAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const keyId = formData.get('keyId') as string || ''

    if (!keyId) {
      return {
        message: 'API key ID is required.',
      }
    }

    // Get current user
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return {
        message: 'User not found.',
      }
    }

    // Revoke API key
    await revokeAPIKey(currentUser.id, keyId)

    // Revalidate settings page
    revalidatePath('/dashboard/settings')

    return {
      data: { keyId, revoked: true },
      message: 'API key revoked successfully!',
    }
  } catch (error) {
    console.error('API key revocation error:', error)
    return {
      message: 'Failed to revoke API key. Please try again.',
    }
  }
}

/**
 * Server Action for deleting user account
 */
export async function deleteAccountAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const password = formData.get('password') as string || ''
    const confirmation = formData.get('confirmation') as string || ''

    // Validate inputs
    if (!password) {
      return {
        message: 'Password is required to delete account.',
      }
    }

    if (confirmation !== 'DELETE') {
      return {
        message: 'Please type "DELETE" to confirm account deletion.',
      }
    }

    // Get current user
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return {
        message: 'User not found.',
      }
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, 'current-hashed-password')
    if (!isValidPassword) {
      return {
        message: 'Incorrect password.',
      }
    }

    // Delete user account (this would be implemented with actual database deletion)
    console.log('Deleting user account:', currentUser.id)

    // Note: In a real implementation, you would:
    // 1. Soft delete or hard delete the user
    // 2. Clean up related data
    // 3. Revoke all sessions
    // 4. Send confirmation email

    return {
      data: { deleted: true },
      message: 'Account deletion initiated. You will be logged out shortly.',
    }
  } catch (error) {
    console.error('Account deletion error:', error)
    return {
      message: 'Failed to delete account. Please try again.',
    }
  }
}

/**
 * Server Action for exporting user data
 */
export async function exportUserDataAction(): Promise<ActionState> {
  try {
    // Get current user
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return {
        message: 'User not found.',
      }
    }

    // Generate export (this would create a downloadable file)
    const exportId = `user_export_${Date.now()}`

    // In production, this would:
    // 1. Queue an export job
    // 2. Generate a comprehensive data export
    // 3. Send email with download link
    // 4. Auto-delete file after 7 days

    return {
      data: { 
        exportId, 
        status: 'queued',
        estimatedTime: '5-10 minutes',
      },
      message: 'Data export requested! You will receive an email when ready.',
    }
  } catch (error) {
    console.error('Data export error:', error)
    return {
      message: 'Failed to export user data. Please try again.',
    }
  }
}
