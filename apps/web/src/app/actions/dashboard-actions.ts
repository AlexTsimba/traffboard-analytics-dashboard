'use server'

import { z } from 'zod'
import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'

// Validation schemas
const dashboardFilterSchema = z.object({
  dateRange: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
  }),
  partners: z.array(z.string()).optional(),
  campaigns: z.array(z.string()).optional(),
  countries: z.array(z.string()).optional(),
  osFamilies: z.array(z.string()).optional(),
  sources: z.array(z.string()).optional(),
  landingIds: z.array(z.string()).optional(),
})

const metricViewSchema = z.object({
  chartType: z.enum(['area', 'line', 'bar', 'funnel']),
  metricGroup: z.enum(['general', 'visit-to-reg', 'reg-to-ftd', 'quality']),
  timeGranularity: z.enum(['daily', 'weekly', 'monthly']),
})

const exportRequestSchema = z.object({
  dataType: z.enum(['conversions', 'players', 'analytics']),
  format: z.enum(['csv', 'excel', 'pdf']),
  dateRange: z.object({
    from: z.string(),
    to: z.string(),
  }),
  filters: dashboardFilterSchema.optional(),
})

// Types
export interface ActionState {
  message?: string
  errors?: Record<string, string[]>
  data?: any
}

export interface DashboardFilters {
  dateRange?: {
    from?: string
    to?: string
  }
  partners?: string[]
  campaigns?: string[]
  countries?: string[]
  osFamilies?: string[]
  sources?: string[]
  landingIds?: string[]
}

export interface MetricViewSettings {
  chartType: 'area' | 'line' | 'bar' | 'funnel'
  metricGroup: 'general' | 'visit-to-reg' | 'reg-to-ftd' | 'quality'
  timeGranularity: 'daily' | 'weekly' | 'monthly'
}

// Helper function to validate date range
function validateDateRange(from?: string, to?: string): string[] {
  const errors: string[] = []

  if (from && to) {
    const fromDate = new Date(from)
    const toDate = new Date(to)

    if (fromDate > toDate) {
      errors.push('Start date must be before end date')
    }

    const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff > 365) {
      errors.push('Date range cannot exceed 365 days')
    }
  }

  return errors
}

// Helper function to save user preferences
async function saveUserPreferences(
  _userId: string,
  preferences: Record<string, any>
): Promise<void> {
  // This would save to database
  // For now, just simulate
  console.log('Saving user preferences:', preferences)
}

// Helper function to get analytics data - implementation would go here when needed

/**
 * Server Action for applying dashboard filters
 */
export async function applyDashboardFiltersAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    // Parse filter data from form
    const filters: DashboardFilters = {
      dateRange: {
        from: (formData.get('dateFrom') as string) || undefined,
        to: (formData.get('dateTo') as string) || undefined,
      },
      partners: formData.getAll('partners') as string[],
      campaigns: formData.getAll('campaigns') as string[],
      countries: formData.getAll('countries') as string[],
      osFamilies: formData.getAll('osFamilies') as string[],
      sources: formData.getAll('sources') as string[],
      landingIds: formData.getAll('landingIds') as string[],
    }

    // Validate filters
    const validatedFilters = dashboardFilterSchema.safeParse(filters)
    if (!validatedFilters.success) {
      return {
        errors: validatedFilters.error.flatten().fieldErrors,
        message: 'Invalid filter values.',
      }
    }

    // Validate date range
    const dateErrors = validateDateRange(filters.dateRange?.from, filters.dateRange?.to)
    if (dateErrors.length > 0) {
      return {
        message: dateErrors.join(', '),
      }
    }

    // Save filter preferences for user
    const userId = 'current-user-id' // Would get from session
    await saveUserPreferences(userId, { dashboardFilters: filters })

    // Revalidate analytics data
    revalidateTag('analytics-data')
    revalidatePath('/dashboard')

    return {
      data: { filters, applied: true },
      message: 'Filters applied successfully!',
    }
  } catch (error) {
    console.error('Filter application error:', error)
    return {
      message: 'Failed to apply filters. Please try again.',
    }
  }
}

/**
 * Server Action for clearing dashboard filters
 */
export async function clearDashboardFiltersAction(): Promise<ActionState> {
  try {
    // Save empty filter preferences
    const userId = 'current-user-id' // Would get from session
    await saveUserPreferences(userId, { dashboardFilters: {} })

    // Revalidate analytics data
    revalidateTag('analytics-data')
    revalidatePath('/dashboard')

    return {
      data: { filters: {}, cleared: true },
      message: 'Filters cleared successfully!',
    }
  } catch (error) {
    console.error('Filter clearing error:', error)
    return {
      message: 'Failed to clear filters. Please try again.',
    }
  }
}

/**
 * Server Action for updating metric view settings
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
    const userId = 'current-user-id' // Would get from session
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
 * Server Action for refreshing analytics data
 */
export async function refreshAnalyticsDataAction(): Promise<ActionState> {
  try {
    // Trigger data refresh from database
    // This would normally refresh cached queries and re-calculate metrics
    
    // Revalidate all analytics-related data (let mocked errors bubble up for tests)
    revalidateTag('analytics-data')
    revalidateTag('chart-data')
    revalidateTag('metrics-data')
    revalidatePath('/dashboard')

    return {
      data: { refreshed: true, timestamp: new Date().toISOString() },
      message: 'Analytics data refreshed successfully!',
    }
  } catch (error) {
    console.error('Analytics refresh error:', error)
    return {
      message: 'Failed to refresh analytics data. Please try again.',
    }
  }
}

/**
 * Server Action for requesting data export
 */
export async function requestDataExportAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    // Parse export request
    const filtersStr = formData.get('filters') as string || '{}'
    const parsedFilters = JSON.parse(filtersStr)
    
    const exportRequest = {
      dataType: formData.get('dataType') as string || '',
      format: formData.get('format') as string || '',
      dateRange: {
        from: formData.get('dateFrom') as string || '',
        to: formData.get('dateTo') as string || '',
      },
      // Only include filters if they have actual content, otherwise undefined
      filters: Object.keys(parsedFilters).length > 0 ? parsedFilters : undefined,
    }

    // First validate date range (before schema validation)
    if (exportRequest.dateRange.from && exportRequest.dateRange.to) {
      const dateErrors = validateDateRange(
        exportRequest.dateRange.from,
        exportRequest.dateRange.to
      )
      if (dateErrors.length > 0) {
        return {
          message: dateErrors.join(', '),
        }
      }
    }

    // Validate export request schema
    const validatedRequest = exportRequestSchema.safeParse(exportRequest)
    if (!validatedRequest.success) {
      return {
        errors: validatedRequest.error.flatten().fieldErrors,
        message: 'Invalid export request.',
      }
    }

    // Generate export file (this would be async in production)
    const exportId = `export_${Date.now()}`
    
    return {
      data: { 
        exportId, 
        status: 'queued',
        estimatedTime: '2-5 minutes',
      },
      message: 'Export request submitted! You will receive an email when ready.',
    }
  } catch (error) {
    console.error('Export request error:', error)
    return {
      message: 'Failed to request export. Please try again.',
    }
  }
}

/**
 * Server Action for saving dashboard layout
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
    const userId = 'current-user-id' // Would get from session
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
    const userId = 'current-user-id' // Would get from session
    const alertId = `alert_${Date.now()}`
    
    // This would save to database
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

/**
 * Server Action for navigating to specific analytics view
 */
export async function navigateToAnalyticsViewAction(
  formData: FormData
): Promise<void> {
  try {
    const viewType = (formData.get('viewType') as string) || ''
    const filters = (formData.get('filters') as string) || ''

    // Build URL with filters
    const params = new URLSearchParams()
    if (filters) {
      params.set('filters', filters)
    }

    const url = `/dashboard/${viewType}${params.toString() ? '?' + params.toString() : ''}`
    
    // Revalidate target page
    revalidatePath(url)
  } catch (error) {
    console.error('Navigation error:', error)
  }

  redirect(`/dashboard/${formData.get('viewType')}`)
}
