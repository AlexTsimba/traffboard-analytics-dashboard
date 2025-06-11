/**
 * User Profile Actions Module
 * Handles user profile updates and password changes
 * Extracted from monolithic settings-actions.ts
 */

'use server'

import { z } from 'zod'
import bcrypt from 'bcryptjs'
import type { ActionState, UserProfile } from './types'
import { withErrorHandling, parseFormData, formatValidationErrors } from './utils'

// Validation schemas for user profile operations
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

// Database operations using actual Drizzle ORM implementation
async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<void> {
  const { databaseService } = await import('@repo/database')
  const userIdNum = parseInt(userId, 10)
  
  // Update user email if provided
  if (updates.email) {
    await databaseService.users.updateEmail(userIdNum, updates.email)
  }
  
  // Update profile information
  const profileData = {
    name: updates.name,
    timezone: updates.timezone,
    language: updates.language,
  }
  
  await databaseService.userProfiles.upsert({
    userId: userIdNum,
    ...profileData,
  })
}

async function updateUserPassword(
  userId: string,
  newPassword: string
): Promise<void> {
  const { databaseService } = await import('@repo/database')
  const userIdNum = parseInt(userId, 10)
  
  // Update password (repository will handle hashing)
  await databaseService.users.updatePassword(userIdNum, newPassword)
}

/**
 * Server Action for updating user profile
 * Uses centralized error handling to eliminate try-catch duplication
 */
export async function updateUserProfileAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  // Parse form data using centralized utility
  const profileData = parseFormData<UserProfile>(formData, [
    { key: 'name', type: 'string', required: true },
    { key: 'email', type: 'string', required: true },
    { key: 'timezone', type: 'string', required: true },
    { key: 'language', type: 'string', required: true },
  ])

  // Validate form data
  const validatedFields = userProfileSchema.safeParse(profileData)
  if (!validatedFields.success) {
    return formatValidationErrors(validatedFields.error)
  }

  // Use centralized error handling wrapper
  return await withErrorHandling(
    async (user) => {
      await updateUserProfile(user.id, validatedFields.data)
      return { profile: validatedFields.data, updated: true }
    },
    {
      revalidatePaths: ['/dashboard/settings'],
      errorMessage: 'Failed to update profile. Please try again.',
    }
  )
}

/**
 * Server Action for changing user password
 * Uses centralized error handling and validation
 */
export async function changePasswordAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  // Parse form data using centralized utility
  const passwordData = parseFormData(formData, [
    { key: 'currentPassword', type: 'string', required: true },
    { key: 'newPassword', type: 'string', required: true },
    { key: 'confirmPassword', type: 'string', required: true },
  ])

  // Validate form data
  const validatedFields = passwordChangeSchema.safeParse(passwordData)
  if (!validatedFields.success) {
    return formatValidationErrors(validatedFields.error)
  }

  // Use centralized error handling wrapper
  return await withErrorHandling(
    async (user) => {
      const { databaseService } = await import('@repo/database')
      
      // Verify current password using database
      const isValidPassword = await databaseService.users.verifyPassword(
        parseInt(user.id, 10),
        validatedFields.data.currentPassword
      )
      
      if (!isValidPassword) {
        throw new Error('Current password is incorrect.')
      }

      // Update password (repository handles hashing)
      await updateUserPassword(user.id, validatedFields.data.newPassword)
      
      return { passwordChanged: true }
    },
    {
      revalidatePaths: ['/dashboard/settings'],
      errorMessage: 'Failed to change password. Please try again.',
    }
  )
}
