/**
 * Settings Actions Index
 * Re-exports all settings actions from focused modules
 * Maintains backward compatibility during monolithic file refactoring
 */

// Export all types
export type {
  ActionState,
  UserProfile,
  NotificationSettings,
  DashboardPreferences,
  APIKey,
} from './types'

// Export utility functions
export {
  withErrorHandling,
  parseFormData,
  formatValidationErrors,
  getCurrentUser,
} from './utils'

// Export profile management actions
export {
  updateUserProfileAction,
  changePasswordAction,
} from './profile-actions'

// Export notification settings actions
export {
  updateNotificationSettingsAction,
} from './notification-actions'

// Export dashboard preferences actions
export {
  updateDashboardPreferencesAction,
} from './dashboard-actions'

// Export API key management actions
export {
  generateAPIKeyAction,
  revokeAPIKeyAction,
} from './api-key-actions'

// Export account management actions
export {
  deleteAccountAction,
  exportUserDataAction,
} from './account-actions'
