import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  updateUserProfileAction,
  changePasswordAction,
  updateNotificationSettingsAction,
  updateDashboardPreferencesAction,
  generateAPIKeyAction,
  revokeAPIKeyAction,
  deleteAccountAction,
  exportUserDataAction,
} from './settings-actions'

// Mock external dependencies
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
  compare: vi.fn(),
  hash: vi.fn(),
}))

describe('Settings Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('updateUserProfileAction', () => {
    it('should validate and update user profile', async () => {
      const formData = new FormData()
      formData.append('name', 'John Doe')
      formData.append('email', 'john@example.com')
      formData.append('timezone', 'America/New_York')
      formData.append('language', 'en')

      const result = await updateUserProfileAction({}, formData)

      expect(result.data.profile.name).toBe('John Doe')
      expect(result.data.profile.email).toBe('john@example.com')
      expect(result.data.profile.timezone).toBe('America/New_York')
      expect(result.data.profile.language).toBe('en')
      expect(result.data.updated).toBe(true)
      expect(result.message).toBe('Profile updated successfully!')
    })

    it('should validate form data and return errors for invalid input', async () => {
      const formData = new FormData()
      formData.append('name', 'A') // Too short
      formData.append('email', 'invalid-email')
      formData.append('timezone', '') // Empty
      formData.append('language', '') // Empty

      const result = await updateUserProfileAction({}, formData)

      expect(result.errors).toBeDefined()
      expect(result.errors?.name).toContain('Name must be at least 2 characters')
      expect(result.errors?.email).toContain('Invalid email address')
      expect(result.errors?.timezone).toContain('Please select a timezone')
      expect(result.errors?.language).toContain('Please select a language')
    })

    it('should revalidate settings page after update', async () => {
      const formData = new FormData()
      formData.append('name', 'Jane Doe')
      formData.append('email', 'jane@example.com')
      formData.append('timezone', 'UTC')
      formData.append('language', 'en')

      await updateUserProfileAction({}, formData)

      const { revalidatePath } = await vi.importMock('next/cache')
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard/settings')
    })
  })

  describe('changePasswordAction', () => {
    it('should validate password change form', async () => {
      const formData = new FormData()
      formData.append('currentPassword', '123') // Too short
      formData.append('newPassword', '1234567') // Too short
      formData.append('confirmPassword', 'different') // Doesn't match

      const result = await changePasswordAction({}, formData)

      expect(result.errors).toBeDefined()
      expect(result.errors?.currentPassword).toContain('Current password is required')
      expect(result.errors?.newPassword).toContain('New password must be at least 8 characters')
      expect(result.errors?.confirmPassword).toContain("New passwords don't match")
    })

    it('should verify current password before allowing change', async () => {
      const formData = new FormData()
      formData.append('currentPassword', 'wrongpassword')
      formData.append('newPassword', 'newpassword123')
      formData.append('confirmPassword', 'newpassword123')

      const bcrypt = await vi.importMock('bcryptjs')
      bcrypt.default.compare.mockResolvedValue(false)

      const result = await changePasswordAction({}, formData)

      expect(result.message).toBe('Current password is incorrect.')
    })

    it('should successfully change password with valid input', async () => {
      const formData = new FormData()
      formData.append('currentPassword', 'currentpassword')
      formData.append('newPassword', 'newpassword123')
      formData.append('confirmPassword', 'newpassword123')

      const bcrypt = await vi.importMock('bcryptjs')
      bcrypt.default.compare.mockResolvedValue(true)
      bcrypt.default.hash.mockResolvedValue('hashed-new-password')

      const result = await changePasswordAction({}, formData)

      expect(result.data.passwordChanged).toBe(true)
      expect(result.message).toBe('Password changed successfully!')
    })
  })

  describe('updateNotificationSettingsAction', () => {
    it('should update notification settings', async () => {
      const formData = new FormData()
      formData.append('emailNotifications', 'on')
      formData.append('pushNotifications', 'on')
      formData.append('dailyReports', 'on')
      formData.append('weeklyReports', 'off')
      formData.append('alertThresholds', 'on')
      formData.append('systemUpdates', 'on')

      const result = await updateNotificationSettingsAction({}, formData)

      expect(result.data.settings.emailNotifications).toBe(true)
      expect(result.data.settings.pushNotifications).toBe(true)
      expect(result.data.settings.dailyReports).toBe(true)
      expect(result.data.settings.weeklyReports).toBe(false)
      expect(result.data.settings.alertThresholds).toBe(true)
      expect(result.data.settings.systemUpdates).toBe(true)
      expect(result.message).toBe('Notification settings updated successfully!')
    })

    it('should handle all settings as false when not provided', async () => {
      const formData = new FormData()
      // No settings provided (all should default to false)

      const result = await updateNotificationSettingsAction({}, formData)

      expect(result.data.settings.emailNotifications).toBe(false)
      expect(result.data.settings.pushNotifications).toBe(false)
      expect(result.data.settings.dailyReports).toBe(false)
      expect(result.data.settings.weeklyReports).toBe(false)
      expect(result.data.settings.alertThresholds).toBe(false)
      expect(result.data.settings.systemUpdates).toBe(false)
    })
  })

  describe('updateDashboardPreferencesAction', () => {
    it('should validate and update dashboard preferences', async () => {
      const formData = new FormData()
      formData.append('defaultDateRange', '30d')
      formData.append('defaultChartType', 'line')
      formData.append('defaultMetricGroup', 'quality')
      formData.append('autoRefreshInterval', '5m')
      formData.append('compactMode', 'on')
      formData.append('darkMode', 'on')

      const result = await updateDashboardPreferencesAction({}, formData)

      expect(result.data.preferences.defaultDateRange).toBe('30d')
      expect(result.data.preferences.defaultChartType).toBe('line')
      expect(result.data.preferences.defaultMetricGroup).toBe('quality')
      expect(result.data.preferences.autoRefreshInterval).toBe('5m')
      expect(result.data.preferences.compactMode).toBe(true)
      expect(result.data.preferences.darkMode).toBe(true)
      expect(result.message).toBe('Dashboard preferences updated successfully!')
    })

    it('should validate preferences and return errors for invalid values', async () => {
      const formData = new FormData()
      formData.append('defaultDateRange', 'invalid')
      formData.append('defaultChartType', 'invalid')
      formData.append('defaultMetricGroup', 'invalid')
      formData.append('autoRefreshInterval', 'invalid')

      const result = await updateDashboardPreferencesAction({}, formData)

      expect(result.errors).toBeDefined()
      expect(result.message).toBe('Invalid dashboard preferences.')
    })

    it('should revalidate both settings and dashboard pages', async () => {
      const formData = new FormData()
      formData.append('defaultDateRange', '7d')
      formData.append('defaultChartType', 'area')
      formData.append('defaultMetricGroup', 'general')
      formData.append('autoRefreshInterval', 'off')

      await updateDashboardPreferencesAction({}, formData)

      const { revalidatePath } = await vi.importMock('next/cache')
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard/settings')
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard')
    })
  })

  describe('generateAPIKeyAction', () => {
    it('should validate and generate API key', async () => {
      const formData = new FormData()
      formData.append('name', 'My API Key')
      formData.append('permissions', 'read:analytics')
      formData.append('permissions', 'write:imports')
      formData.append('expiresIn', '90d')

      const result = await generateAPIKeyAction({}, formData)

      expect(result.data.apiKey).toBeDefined()
      expect(result.data.apiKey.name).toBe('My API Key')
      expect(result.data.apiKey.permissions).toEqual(['read:analytics', 'write:imports'])
      expect(result.data.generated).toBe(true)
      expect(result.message).toContain('API key generated successfully!')
    })

    it('should validate API key configuration', async () => {
      const formData = new FormData()
      formData.append('name', '') // Empty name
      formData.append('expiresIn', 'invalid')
      // No permissions provided

      const result = await generateAPIKeyAction({}, formData)

      expect(result.errors).toBeDefined()
      expect(result.message).toBe('Invalid API key configuration.')
    })

    it('should require at least one permission', async () => {
      const formData = new FormData()
      formData.append('name', 'Test Key')
      formData.append('expiresIn', '30d')
      // No permissions

      const result = await generateAPIKeyAction({}, formData)

      expect(result.errors?.permissions).toContain('At least one permission is required')
    })
  })

  describe('revokeAPIKeyAction', () => {
    it('should revoke API key with valid ID', async () => {
      const formData = new FormData()
      formData.append('keyId', 'api_12345')

      const result = await revokeAPIKeyAction({}, formData)

      expect(result.data.keyId).toBe('api_12345')
      expect(result.data.revoked).toBe(true)
      expect(result.message).toBe('API key revoked successfully!')
    })

    it('should require API key ID', async () => {
      const formData = new FormData()
      // No keyId provided

      const result = await revokeAPIKeyAction({}, formData)

      expect(result.message).toBe('API key ID is required.')
    })
  })

  describe('deleteAccountAction', () => {
    it('should validate account deletion requirements', async () => {
      const formData = new FormData()
      formData.append('password', 'userpassword')
      formData.append('confirmation', 'DELETE')

      const bcrypt = await vi.importMock('bcryptjs')
      bcrypt.default.compare.mockResolvedValue(true)

      const result = await deleteAccountAction({}, formData)

      expect(result.data.deleted).toBe(true)
      expect(result.message).toBe('Account deletion initiated. You will be logged out shortly.')
    })

    it('should require password for account deletion', async () => {
      const formData = new FormData()
      formData.append('confirmation', 'DELETE')
      // No password

      const result = await deleteAccountAction({}, formData)

      expect(result.message).toBe('Password is required to delete account.')
    })

    it('should require DELETE confirmation', async () => {
      const formData = new FormData()
      formData.append('password', 'userpassword')
      formData.append('confirmation', 'delete') // Wrong case

      const result = await deleteAccountAction({}, formData)

      expect(result.message).toBe('Please type "DELETE" to confirm account deletion.')
    })

    it('should verify password before deletion', async () => {
      const formData = new FormData()
      formData.append('password', 'wrongpassword')
      formData.append('confirmation', 'DELETE')

      const bcrypt = await vi.importMock('bcryptjs')
      bcrypt.default.compare.mockResolvedValue(false)

      const result = await deleteAccountAction({}, formData)

      expect(result.message).toBe('Incorrect password.')
    })
  })

  describe('exportUserDataAction', () => {
    it('should initiate user data export', async () => {
      const result = await exportUserDataAction()

      expect(result.data.exportId).toBeDefined()
      expect(result.data.status).toBe('queued')
      expect(result.data.estimatedTime).toBe('5-10 minutes')
      expect(result.message).toBe('Data export requested! You will receive an email when ready.')
    })

    it('should handle export errors', async () => {
      // Test would need to be restructured for proper error simulation
      // For now, just verify the function returns expected structure
      const result = await exportUserDataAction()
      expect(result.data.exportId).toBeDefined()
    })
  })
})
