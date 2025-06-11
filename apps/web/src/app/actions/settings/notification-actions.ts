/**
 * Notification Settings Actions Module
 * Handles notification preferences and alert configurations
 * Extracted from monolithic settings-actions.ts
 */

'use server'

import { z } from 'zod'
import type { ActionState, NotificationSettings } from './types'
import { withErrorHandling, parseFormData, formatValidationErrors } from './utils'

// Validation schema for notification settings
const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  dailyReports: z.boolean(),
  weeklyReports: z.boolean(),
  alertThresholds: z.boolean(),
  systemUpdates: z.boolean(),
})

// Database operations using actual Drizzle ORM implementation
async function updateNotificationSettings(
  userId: string,
  settings: NotificationSettings
): Promise<void> {
  const { databaseService } = await import('@traffboard/database')
  const userIdNum = parseInt(userId, 10)
  
  await databaseService.notificationSettings.upsert({
    userId: userIdNum,
    ...settings,
  })
}

/**
 * Server Action for updating notification settings
 * Uses centralized error handling and validation patterns
 */
export async function updateNotificationSettingsAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  // Parse form data using centralized utility
  const notificationData = parseFormData<NotificationSettings>(formData, [
    { key: 'emailNotifications', type: 'boolean' },
    { key: 'pushNotifications', type: 'boolean' },
    { key: 'dailyReports', type: 'boolean' },
    { key: 'weeklyReports', type: 'boolean' },
    { key: 'alertThresholds', type: 'boolean' },
    { key: 'systemUpdates', type: 'boolean' },
  ])

  // Validate form data
  const validatedFields = notificationSettingsSchema.safeParse(notificationData)
  if (!validatedFields.success) {
    return formatValidationErrors(validatedFields.error)
  }

  // Use centralized error handling wrapper
  return await withErrorHandling(
    async (user) => {
      await updateNotificationSettings(user.id, validatedFields.data)
      return { settings: validatedFields.data, updated: true }
    },
    {
      revalidatePaths: ['/dashboard/settings'],
      errorMessage: 'Failed to update notification settings. Please try again.',
    }
  )
}
