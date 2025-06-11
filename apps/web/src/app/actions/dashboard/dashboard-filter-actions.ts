/**
 * Dashboard Filter Actions Module
 * Handles filter application, clearing, and navigation
 * Extracted from monolithic dashboard-actions.ts
 */

'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import type { ActionState, DashboardFilters } from './types'
import { dashboardFilterSchema } from './types'
import { validateDateRange, saveUserPreferences, getCurrentUserId } from './utils'

/**
 * Server Action for applying dashboard filters
 * Validates and applies filter criteria to dashboard views
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
    const userId = getCurrentUserId()
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
 * Removes all applied filters and resets to default view
 */
export async function clearDashboardFiltersAction(): Promise<ActionState> {
  try {
    // Save empty filter preferences
    const userId = getCurrentUserId()
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
 * Server Action for navigating to specific analytics view
 * Handles navigation with preserved filter state
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
