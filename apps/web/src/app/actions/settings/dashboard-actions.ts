/**
 * Dashboard Preferences Actions Module
 * Handles dashboard configuration and user interface preferences
 * Extracted from monolithic settings-actions.ts
 */

'use server'

import { z } from 'zod'
import type { ActionState, DashboardPreferences } from './types'
import { withErrorHandling, parseFormData, formatValidationErrors } from './utils'

// Validation schema for dashboard preferences
const dashboardPreferencesSchema = z.object({
  defaultDateRange: z.enum(['7d', '30d', '90d', '1y']),
  defaultChartType: z.enum(['area', 'line', 'bar']),
  defaultMetricGroup: z.enum(['general', 'visit-to-reg', 'reg-to-ftd', 'quality']),
  autoRefreshInterval: z.enum(['off', '30s', '1m', '5m', '15m']),
  compactMode: z.boolean(),
  darkMode: z.boolean(),
})

// Database operations using actual Drizzle ORM implementation
async function updateDashboardPreferences(
  userId: string,
  preferences: DashboardPreferences
): Promise<void> {
  const { databaseService } = await import('@traffboard/database')
  const userIdNum = parseInt(userId, 10)
  
  await databaseService.dashboardPreferences.upsert({
    userId: userIdNum,
    ...preferences,
  })
}

/**
 * Server Action for updating dashboard preferences
 * Uses centralized error handling and revalidates both settings and dashboard pages
 */
export async function updateDashboardPreferencesAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  // Parse form data using centralized utility
  const preferencesData = parseFormData<DashboardPreferences>(formData, [
    { key: 'defaultDateRange', type: 'string', required: true },
    { key: 'defaultChartType', type: 'string', required: true },
    { key: 'defaultMetricGroup', type: 'string', required: true },
    { key: 'autoRefreshInterval', type: 'string', required: true },
    { key: 'compactMode', type: 'boolean' },
    { key: 'darkMode', type: 'boolean' },
  ])

  // Validate form data
  const validatedFields = dashboardPreferencesSchema.safeParse(preferencesData)
  if (!validatedFields.success) {
    return formatValidationErrors(validatedFields.error)
  }

  // Use centralized error handling wrapper with multiple revalidation paths
  return await withErrorHandling(
    async (user) => {
      await updateDashboardPreferences(user.id, validatedFields.data)
      return { preferences: validatedFields.data, updated: true }
    },
    {
      revalidatePaths: ['/dashboard/settings', '/dashboard'],
      errorMessage: 'Failed to update dashboard preferences. Please try again.',
    }
  )
}
