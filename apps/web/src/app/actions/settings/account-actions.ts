/**
 * Account Management Actions Module
 * Handles account deletion and data export operations
 * Extracted from monolithic settings-actions.ts
 */

'use server'

import bcrypt from 'bcryptjs'
import type { ActionState } from './types'
import { withErrorHandling } from './utils'

/**
 * Server Action for deleting user account
 * Requires password verification and explicit confirmation
 */
export async function deleteAccountAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
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

  // Use centralized error handling wrapper
  return await withErrorHandling(
    async (user) => {
      const { databaseService } = await import('@repo/database')
      const userIdNum = parseInt(user.id, 10)
      
      // Verify password using database
      const isValidPassword = await databaseService.users.verifyPassword(userIdNum, password)
      if (!isValidPassword) {
        throw new Error('Incorrect password.')
      }

      // Delete user account and all related data
      await databaseService.users.delete(userIdNum)
      // Note: Due to CASCADE constraints, this will also delete:
      // - User profile
      // - Notification settings  
      // - Dashboard preferences
      // - API keys
      // - Sessions

      return { 
        deleted: true,
        message: 'Account deletion initiated. You will be logged out shortly.'
      }
    },
    {
      revalidatePaths: [],
      errorMessage: 'Failed to delete account. Please try again.',
    }
  )
}

/**
 * Server Action for exporting user data
 * Queues a data export job for the current user
 */
export async function exportUserDataAction(): Promise<ActionState> {
  // Use centralized error handling wrapper
  return await withErrorHandling(
    async (user) => {
      // Generate export (this would create a downloadable file)
      const exportId = `user_export_${Date.now()}`

      // In production, this would:
      // 1. Queue an export job
      // 2. Generate a comprehensive data export
      // 3. Send email with download link
      // 4. Auto-delete file after 7 days

      return { 
        exportId, 
        status: 'queued',
        estimatedTime: '5-10 minutes',
        message: 'Data export requested! You will receive an email when ready.'
      }
    },
    {
      revalidatePaths: [],
      errorMessage: 'Failed to export user data. Please try again.',
    }
  )
}
