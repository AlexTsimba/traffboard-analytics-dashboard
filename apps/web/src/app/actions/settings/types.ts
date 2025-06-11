/**
 * Shared types for settings actions
 * Extracted from monolithic settings-actions.ts for better maintainability
 */

export interface ActionState {
  message?: string
  errors?: Record<string, string[]>
  data?: any
}

export interface UserProfile {
  id: string
  name: string
  email: string
  timezone: string
  language: string
  role: 'admin' | 'user'
  createdAt: Date
  lastLoginAt?: Date
}

export interface NotificationSettings {
  emailNotifications: boolean
  pushNotifications: boolean
  dailyReports: boolean
  weeklyReports: boolean
  alertThresholds: boolean
  systemUpdates: boolean
}

export interface DashboardPreferences {
  defaultDateRange: '7d' | '30d' | '90d' | '1y'
  defaultChartType: 'area' | 'line' | 'bar'
  defaultMetricGroup: 'general' | 'visit-to-reg' | 'reg-to-ftd' | 'quality'
  autoRefreshInterval: 'off' | '30s' | '1m' | '5m' | '15m'
  compactMode: boolean
  darkMode: boolean
}

export interface APIKey {
  id: string
  name: string
  key: string
  permissions: string[]
  expiresAt?: Date
  createdAt: Date
  lastUsedAt?: Date
}
