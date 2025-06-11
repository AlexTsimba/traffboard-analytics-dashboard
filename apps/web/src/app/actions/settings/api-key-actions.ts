/**
 * API Key Management Actions Module
 * Handles API key generation, revocation, and management
 * Extracted from monolithic settings-actions.ts
 */

'use server'

import { z } from 'zod'
import type { ActionState, APIKey } from './types'
import { withErrorHandling, parseFormData, formatValidationErrors } from './utils'

// Validation schema for API key generation
const apiKeyGenerationSchema = z.object({
  name: z.string().min(1, 'API key name is required'),
  permissions: z.array(z.string()).min(1, 'At least one permission is required'),
  expiresIn: z.enum(['30d', '90d', '1y', 'never']),
})

// Database operations using actual Drizzle ORM implementation
async function generateAPIKey(
  userId: string,
  name: string,
  permissions: string[],
  expiresIn: string
): Promise<APIKey> {
  const { databaseService } = await import('@traffboard/database')
  const userIdNum = parseInt(userId, 10)
  
  let expiresAt: Date | undefined
  if (expiresIn !== 'never') {
    const days = expiresIn === '30d' ? 30 : expiresIn === '90d' ? 90 : 365
    expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  }

  const result = await databaseService.apiKeys.create({
    userId: userIdNum,
    name,
    permissions,
    expiresAt,
  })

  return {
    id: result.id.toString(),
    name: result.name,
    key: result.key, // This includes the actual key for one-time display
    permissions: result.permissions,
    expiresAt: result.expiresAt ?? undefined, // Convert null to undefined
    createdAt: result.createdAt!,
  }
}

async function revokeAPIKey(userId: string, keyId: string): Promise<void> {
  const { databaseService } = await import('@traffboard/database')
  const userIdNum = parseInt(userId, 10)
  const keyIdNum = parseInt(keyId, 10)
  
  await databaseService.apiKeys.revoke(userIdNum, keyIdNum)
}

/**
 * Server Action for generating API key
 * Uses centralized error handling and validation
 */
export async function generateAPIKeyAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  // Parse form data using centralized utility
  const apiKeyData = parseFormData(formData, [
    { key: 'name', type: 'string', required: true },
    { key: 'permissions', type: 'array', required: true },
    { key: 'expiresIn', type: 'string', required: true },
  ])

  // Validate form data
  const validatedFields = apiKeyGenerationSchema.safeParse(apiKeyData)
  if (!validatedFields.success) {
    return formatValidationErrors(validatedFields.error)
  }

  // Use centralized error handling wrapper
  return await withErrorHandling(
    async (user) => {
      const apiKey = await generateAPIKey(
        user.id,
        validatedFields.data.name,
        validatedFields.data.permissions,
        validatedFields.data.expiresIn
      )
      
      return { 
        apiKey, 
        generated: true,
        message: 'API key generated successfully! Make sure to copy it now - you won\'t see it again.'
      }
    },
    {
      revalidatePaths: ['/dashboard/settings'],
      errorMessage: 'Failed to generate API key. Please try again.',
    }
  )
}

/**
 * Server Action for revoking API key
 * Validates required parameters and uses centralized error handling
 */
export async function revokeAPIKeyAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const keyId = formData.get('keyId') as string || ''

  if (!keyId) {
    return {
      message: 'API key ID is required.',
    }
  }

  // Use centralized error handling wrapper
  return await withErrorHandling(
    async (user) => {
      await revokeAPIKey(user.id, keyId)
      return { keyId, revoked: true }
    },
    {
      revalidatePaths: ['/dashboard/settings'],
      errorMessage: 'Failed to revoke API key. Please try again.',
    }
  )
}
