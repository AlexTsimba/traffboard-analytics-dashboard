/**
 * Shared utilities for settings actions
 * Eliminates code duplication and provides consistent error handling
 */

'use server'

import { revalidatePath } from 'next/cache'
import type { ActionState, UserProfile } from './types'

/**
 * Centralized error handling wrapper for settings actions
 * Eliminates the 80+ scattered try-catch patterns
 */
export async function withErrorHandling<T>(
  action: (user: UserProfile) => Promise<T>,
  options: {
    requireUser?: boolean
    revalidatePaths?: string[]
    errorMessage?: string
  } = {}
): Promise<ActionState> {
  const requireUser = options.requireUser ?? true
  const revalidatePaths = options.revalidatePaths ?? ['/dashboard/settings']
  const errorMessage = options.errorMessage ?? 'Operation failed. Please try again.'

  try {
    // Get current user if required
    let currentUser: UserProfile | null = null
    if (requireUser) {
      currentUser = await getCurrentUser()
      if (!currentUser) {
        return {
          message: 'User not found.',
        }
      }
    }

    // Execute the action
    const result = await action(currentUser!)

    // Revalidate specified paths
    for (const path of revalidatePaths) {
      revalidatePath(path)
    }

    return {
      data: result,
      message: 'Operation completed successfully!',
    }
  } catch (error) {
    console.error('Settings action error:', error)
    return {
      message: errorMessage,
    }
  }
}

/**
 * Centralized form data parsing utility
 * Reduces duplication in form data extraction
 */
export function parseFormData<T>(
  formData: FormData,
  fields: Array<{ key: keyof T; type: 'string' | 'boolean' | 'array'; required?: boolean }>
): Record<string, any> {
  const result: Record<string, any> = {}

  for (const field of fields) {
    const key = field.key as string
    
    switch (field.type) {
      case 'string':
        result[key] = (formData.get(key) as string) || ''
        break
      case 'boolean':
        result[key] = formData.get(key) === 'on'
        break
      case 'array':
        result[key] = formData.getAll(key) as string[]
        break
    }
  }

  return result
}

/**
 * Helper function for database operations (placeholder)
 * This will be replaced with actual database implementation
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
  // This would get user from session/JWT in real implementation
  return {
    id: 'current-user-id',
    name: 'Current User',
    email: 'user@example.com',
    timezone: 'UTC',
    language: 'en',
    role: 'user',
    createdAt: new Date(),
  }
}

/**
 * Validation error formatter
 * Provides consistent error message formatting
 */
export function formatValidationErrors(errors: any): ActionState {
  return {
    errors: errors.flatten().fieldErrors,
    message: 'Invalid form data. Please check your inputs.',
  }
}
