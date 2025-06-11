// Authentication Actions
export {
  loginAction,
  signupAction,
  logoutAction,
  generate2FASetupAction,
  setup2FAAction,
  disable2FAAction,
  type ActionState as AuthActionState,
  type User,
} from './auth-actions'

// Import Actions
export {
  validateCSVAction,
  executeCSVImportAction,
  clearImportHistoryAction,
  type ActionState as ImportActionState,
  type CSVValidationResult,
  type CSVImportResult,
} from './import-actions'

// Dashboard Actions
export {
  applyDashboardFiltersAction,
  clearDashboardFiltersAction,
  updateMetricViewAction,
  refreshAnalyticsDataAction,
  requestDataExportAction,
  saveDashboardLayoutAction,
  createMetricAlertAction,
  navigateToAnalyticsViewAction,
  type ActionState as DashboardActionState,
  type DashboardFilters,
  type MetricViewSettings,
} from './dashboard-actions'

// Settings Actions
export {
  updateUserProfileAction,
  changePasswordAction,
  updateNotificationSettingsAction,
  updateDashboardPreferencesAction,
  generateAPIKeyAction,
  revokeAPIKeyAction,
  deleteAccountAction,
  exportUserDataAction,
  type ActionState as SettingsActionState,
  type UserProfile,
  type NotificationSettings,
  type DashboardPreferences,
  type APIKey,
} from './settings-actions'

// Common types
export interface BaseActionState {
  message?: string
  errors?: Record<string, string[]>
  data?: any
}
