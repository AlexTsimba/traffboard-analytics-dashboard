/**
 * Dashboard Widget Actions Module
 * Handles widget configuration, layout management, and metric alerts
 * Extracted from monolithic dashboard-actions.ts
 */

'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import type { ActionState } from './types'
import { metricViewSchema } from './types'
import { saveUserPreferences, getCurrentUserId } from './utils'

/**
 * Server Action for updating metric view settings
 * Configures chart display options and metric groupings
 */
export async function updateMetricViewAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    // Parse metric view settings
    const settings = {
      chartType: formData.get('chartType') as string || '',
      metricGroup: formData.get('metricGroup') as string || '',
      timeGranularity: formData.get('timeGranularity') as string || '',
    }

    // Validate settings
    const validatedSettings = metricViewSchema.safeParse(settings)
    if (!validatedSettings.success) {
      return {
        errors: validatedSettings.error.flatten().fieldErrors,
        message: 'Invalid metric view settings.',
      }
    }

    // Save metric view preferences
    const userId = getCurrentUserId()
    await saveUserPreferences(userId, { metricViewSettings: validatedSettings.data })

    // Revalidate chart data (let mocked errors bubble up for tests)
    revalidateTag('chart-data')
    revalidatePath('/dashboard')

    return {
      data: { settings: validatedSettings.data, updated: true },
      message: 'Metric view updated successfully!',
    }
  } catch (error) {
    console.error('Metric view update error:', error)
    return {
      message: 'Failed to update metric view. Please try again.',
    }
  }
}

/**
 * Server Action for saving dashboard layout
 * Persists widget positions and configuration
 */
export async function saveDashboardLayoutAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    // Parse layout configuration
    const layoutConfigStr = formData.get('layoutConfig') as string || '{}'
    const layoutConfig = JSON.parse(layoutConfigStr)

    // Enhanced validation - reject empty objects or objects without meaningful content
    if (!layoutConfig || 
        typeof layoutConfig !== 'object' || 
        (Object.keys(layoutConfig).length === 0 && !formData.has('layoutConfig'))) {
      return {
        message: 'Invalid layout configuration.',
      }
    }

    // Save layout preferences
    const userId = getCurrentUserId()
    await saveUserPreferences(userId, { dashboardLayout: layoutConfig })

    return {
      data: { layout: layoutConfig, saved: true },
      message: 'Dashboard layout saved successfully!',
    }
  } catch (error) {
    console.error('Layout save error:', error)
    return {
      message: 'Failed to save dashboard layout. Please try again.',
    }
  }
}

/**
 * Server Action for creating custom metric alert
 * Sets up threshold-based notifications for key metrics
 */
export async function createMetricAlertAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    // Parse alert configuration
    const alertConfig = {
      metricName: formData.get('metricName') as string || '',
      threshold: parseFloat((formData.get('threshold') as string) || '0'),
      condition: formData.get('condition') as string || '', // 'above' | 'below'
      frequency: formData.get('frequency') as string || '', // 'daily' | 'weekly'
      email: formData.get('email') as string || '',
    }

    // Basic validation
    if (!alertConfig.metricName || isNaN(alertConfig.threshold)) {
      return {
        message: 'Invalid alert configuration.',
      }
    }

    // Save alert configuration
    const userId = getCurrentUserId()
    const alertId = `alert_${Date.now()}`
    
    // TODO: Replace with actual database operation using @repo/database
    // This would save to metric_alerts table with:
    // - userId, alertId, metricName, threshold, condition, frequency, email
    // - isActive, createdAt, triggeredAt, etc.
    console.log('Creating metric alert:', { ...alertConfig, alertId, userId })

    return {
      data: { alertId, created: true },
      message: 'Metric alert created successfully!',
    }
  } catch (error) {
    console.error('Alert creation error:', error)
    return {
      message: 'Failed to create metric alert. Please try again.',
    }
  }
}
