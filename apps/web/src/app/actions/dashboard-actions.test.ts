import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  applyDashboardFiltersAction,
  clearDashboardFiltersAction,
  updateMetricViewAction,
  refreshAnalyticsDataAction,
  requestDataExportAction,
  saveDashboardLayoutAction,
  createMetricAlertAction,
  navigateToAnalyticsViewAction,
} from './dashboard-actions'

// Mock external dependencies
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

describe('Dashboard Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('applyDashboardFiltersAction', () => {
    it('should validate and apply dashboard filters', async () => {
      const formData = new FormData()
      formData.append('dateFrom', '2024-01-01')
      formData.append('dateTo', '2024-01-31')
      formData.append('partners', 'partner1')
      formData.append('partners', 'partner2')
      formData.append('countries', 'US')
      formData.append('osFamilies', 'Windows')

      const result = await applyDashboardFiltersAction({}, formData)

      expect(result.data).toBeDefined()
      expect(result.data.filters.dateRange.from).toBe('2024-01-01')
      expect(result.data.filters.dateRange.to).toBe('2024-01-31')
      expect(result.data.filters.partners).toEqual(['partner1', 'partner2'])
      expect(result.data.applied).toBe(true)
      expect(result.message).toBe('Filters applied successfully!')
    })

    it('should validate date range and reject invalid ranges', async () => {
      const formData = new FormData()
      formData.append('dateFrom', '2024-12-31')
      formData.append('dateTo', '2024-01-01') // End before start

      const result = await applyDashboardFiltersAction({}, formData)

      expect(result.message).toBe('Start date must be before end date')
    })

    it('should reject date ranges exceeding 365 days', async () => {
      const fromDate = '2024-01-01'
      const toDate = '2025-01-02' // More than 365 days

      const formData = new FormData()
      formData.append('dateFrom', fromDate)
      formData.append('dateTo', toDate)

      const result = await applyDashboardFiltersAction({}, formData)

      expect(result.message).toBe('Date range cannot exceed 365 days')
    })

    it('should handle empty filters gracefully', async () => {
      const formData = new FormData()

      const result = await applyDashboardFiltersAction({}, formData)

      expect(result.data.applied).toBe(true)
      expect(result.message).toBe('Filters applied successfully!')
      
      const { revalidateTag } = await vi.importMock('next/cache')
      expect(revalidateTag).toHaveBeenCalledWith('analytics-data')
    })

    it('should revalidate analytics data after applying filters', async () => {
      const formData = new FormData()
      formData.append('dateFrom', '2024-01-01')
      formData.append('dateTo', '2024-01-31')

      await applyDashboardFiltersAction({}, formData)

      const { revalidateTag, revalidatePath } = await vi.importMock('next/cache')
      expect(revalidateTag).toHaveBeenCalledWith('analytics-data')
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard')
    })
  })

  describe('clearDashboardFiltersAction', () => {
    it('should clear filters and revalidate data', async () => {
      const result = await clearDashboardFiltersAction()

      expect(result.data.cleared).toBe(true)
      expect(result.data.filters).toEqual({})
      expect(result.message).toBe('Filters cleared successfully!')
      
      const { revalidateTag } = await vi.importMock('next/cache')
      expect(revalidateTag).toHaveBeenCalledWith('analytics-data')
    })

    it('should handle errors gracefully', async () => {
      const { revalidateTag } = await vi.importMock('next/cache')
      revalidateTag.mockImplementation(() => {
        throw new Error('Revalidation failed')
      })

      const result = await clearDashboardFiltersAction()

      expect(result.message).toBe('Failed to clear filters. Please try again.')
    })
  })

  describe('updateMetricViewAction', () => {
    beforeEach(() => {
      // Reset mocks for each test to prevent interference
      vi.clearAllMocks()
    })

    it('should validate metric view settings and return errors for invalid values', async () => {
      const formData = new FormData()
      formData.append('chartType', 'invalid')
      formData.append('metricGroup', 'invalid')
      formData.append('timeGranularity', 'invalid')

      const result = await updateMetricViewAction({}, formData)

      expect(result.errors).toBeDefined()
      expect(result.message).toBe('Invalid metric view settings.')
    })
  })

  describe('refreshAnalyticsDataAction', () => {
    it('should handle refresh errors', async () => {
      const { revalidateTag } = await vi.importMock('next/cache')
      revalidateTag.mockImplementation(() => {
        throw new Error('Refresh failed')
      })

      const result = await refreshAnalyticsDataAction()

      expect(result.message).toBe('Failed to refresh analytics data. Please try again.')
    })
  })

  describe('requestDataExportAction', () => {
    it('should validate and process data export request', async () => {
      const formData = new FormData()
      formData.append('dataType', 'analytics')
      formData.append('format', 'csv')
      formData.append('dateFrom', '2024-01-01')
      formData.append('dateTo', '2024-01-31')
      formData.append('filters', '{}')

      const result = await requestDataExportAction({}, formData)

      expect(result.data.exportId).toBeDefined()
      expect(result.data.status).toBe('queued')
      expect(result.data.estimatedTime).toBe('2-5 minutes')
      expect(result.message).toBe('Export request submitted! You will receive an email when ready.')
    })

    it('should validate export request and return errors for invalid data', async () => {
      const formData = new FormData()
      formData.append('dataType', 'invalid')
      formData.append('format', 'invalid')

      const result = await requestDataExportAction({}, formData)

      expect(result.errors).toBeDefined()
      expect(result.message).toBe('Invalid export request.')
    })

    it('should validate date range for export', async () => {
      const formData = new FormData()
      formData.append('dataType', 'analytics')
      formData.append('format', 'csv')
      formData.append('dateFrom', '2024-12-31')
      formData.append('dateTo', '2024-01-01') // Invalid range
      formData.append('filters', '{}')

      const result = await requestDataExportAction({}, formData)

      expect(result.message).toBe('Start date must be before end date')
    })
  })

  describe('saveDashboardLayoutAction', () => {
    it('should save valid dashboard layout configuration', async () => {
      const layoutConfig = {
        widgets: [
          { id: 'metrics', position: { x: 0, y: 0, w: 6, h: 2 } },
          { id: 'chart', position: { x: 6, y: 0, w: 6, h: 4 } },
        ],
        theme: 'light',
      }

      const formData = new FormData()
      formData.append('layoutConfig', JSON.stringify(layoutConfig))

      const result = await saveDashboardLayoutAction({}, formData)

      expect(result.data.layout).toEqual(layoutConfig)
      expect(result.data.saved).toBe(true)
      expect(result.message).toBe('Dashboard layout saved successfully!')
    })

    it('should reject invalid layout configuration', async () => {
      const formData = new FormData()
      formData.append('layoutConfig', 'invalid json')

      const result = await saveDashboardLayoutAction({}, formData)

      expect(result.message).toBe('Failed to save dashboard layout. Please try again.')
    })

    it('should handle missing layout configuration', async () => {
      const formData = new FormData()

      const result = await saveDashboardLayoutAction({}, formData)

      expect(result.message).toBe('Invalid layout configuration.')
    })
  })

  describe('createMetricAlertAction', () => {
    it('should create valid metric alert', async () => {
      const formData = new FormData()
      formData.append('metricName', 'revenue')
      formData.append('threshold', '1000')
      formData.append('condition', 'above')
      formData.append('frequency', 'daily')
      formData.append('email', 'user@example.com')

      const result = await createMetricAlertAction({}, formData)

      expect(result.data.alertId).toBeDefined()
      expect(result.data.created).toBe(true)
      expect(result.message).toBe('Metric alert created successfully!')
    })

    it('should validate alert configuration', async () => {
      const formData = new FormData()
      formData.append('threshold', 'invalid') // Invalid number

      const result = await createMetricAlertAction({}, formData)

      expect(result.message).toBe('Invalid alert configuration.')
    })

    it('should require metric name and threshold', async () => {
      const formData = new FormData()
      // Missing required fields

      const result = await createMetricAlertAction({}, formData)

      expect(result.message).toBe('Invalid alert configuration.')
    })
  })

  describe('navigateToAnalyticsViewAction', () => {
    it('should navigate to analytics view with filters', async () => {
      const formData = new FormData()
      formData.append('viewType', 'conversions')
      formData.append('filters', JSON.stringify({ country: 'US' }))

      await navigateToAnalyticsViewAction(formData)

      const { redirect } = await vi.importMock('next/navigation')
      expect(redirect).toHaveBeenCalledWith('/dashboard/conversions')
    })

    it('should navigate to analytics view without filters', async () => {
      const formData = new FormData()
      formData.append('viewType', 'quality')

      await navigateToAnalyticsViewAction(formData)

      const { redirect } = await vi.importMock('next/navigation')
      expect(redirect).toHaveBeenCalledWith('/dashboard/quality')
    })

    it('should revalidate target page before navigation', async () => {
      const formData = new FormData()
      formData.append('viewType', 'cohorts')

      await navigateToAnalyticsViewAction(formData)

      const { revalidatePath } = await vi.importMock('next/cache')
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard/cohorts')
    })
  })
})
