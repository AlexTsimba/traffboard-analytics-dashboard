/**
 * Dashboard Actions Module Index
 * Re-exports all dashboard action functions for backward compatibility
 * Extracted from monolithic dashboard-actions.ts
 */

// Export all types
export * from './types'

// Export utilities
export * from './utils'

// Export filter actions
export {
  applyDashboardFiltersAction,
  clearDashboardFiltersAction,
  navigateToAnalyticsViewAction,
} from './dashboard-filter-actions'

// Export export actions
export {
  requestDataExportAction,
} from './dashboard-export-actions'

// Export widget actions
export {
  updateMetricViewAction,
  saveDashboardLayoutAction,
  createMetricAlertAction,
} from './dashboard-widget-actions'

// Export data actions
export {
  refreshAnalyticsDataAction,
  getAnalyticsData,
  getCachedMetrics,
} from './dashboard-data-actions'
