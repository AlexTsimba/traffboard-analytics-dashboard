/**
 * Dashboard utilities module
 * Shared utility functions for dashboard operations
 * Extracted from monolithic dashboard-actions.ts
 */

import { debug } from '@/lib/logger';

/**
 * Validates date range constraints
 * @param from - Start date string
 * @param to - End date string
 * @returns Array of validation error messages
 */
export function validateDateRange(from?: string, to?: string): string[] {
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

/**
 * Saves user preferences to database
 * @param userId - User identifier
 * @param preferences - Preferences object to save
 */
export async function saveUserPreferences(
  _userId: string,
  preferences: Record<string, any>
): Promise<void> {
  // TODO: Replace with actual database operation using @traffboard/database
  // This would save to user preferences table
  // For now, just simulate the operation
  debug('Saving user preferences', { preferences })
}

/**
 * Gets current user ID from session
 * @returns Current user ID
 */
export function getCurrentUserId(): string {
  // TODO: Replace with actual session management
  // This would get the user ID from the current session
  return 'current-user-id'
}
