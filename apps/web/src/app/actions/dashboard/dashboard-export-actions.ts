/**
 * Dashboard Export Actions Module
 * Handles data export operations and file generation
 * Extracted from monolithic dashboard-actions.ts
 */

'use server'

import type { ActionState } from './types'
import { exportRequestSchema } from './types'
import { validateDateRange } from './utils'

/**
 * Server Action for requesting data export
 * Validates export parameters and queues export job
 */
export async function requestDataExportAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    // Parse export request
    const filtersStr = formData.get('filters') as string || '{}'
    const parsedFilters = JSON.parse(filtersStr)
    
    const exportRequest = {
      dataType: formData.get('dataType') as string || '',
      format: formData.get('format') as string || '',
      dateRange: {
        from: formData.get('dateFrom') as string || '',
        to: formData.get('dateTo') as string || '',
      },
      // Only include filters if they have actual content, otherwise undefined
      filters: Object.keys(parsedFilters).length > 0 ? parsedFilters : undefined,
    }

    // First validate date range (before schema validation)
    if (exportRequest.dateRange.from && exportRequest.dateRange.to) {
      const dateErrors = validateDateRange(
        exportRequest.dateRange.from,
        exportRequest.dateRange.to
      )
      if (dateErrors.length > 0) {
        return {
          message: dateErrors.join(', '),
        }
      }
    }

    // Validate export request schema
    const validatedRequest = exportRequestSchema.safeParse(exportRequest)
    if (!validatedRequest.success) {
      return {
        errors: validatedRequest.error.flatten().fieldErrors,
        message: 'Invalid export request.',
      }
    }

    // Generate export file (this would be async in production)
    const exportId = `export_${Date.now()}`
    
    // TODO: Queue actual export job using background task system
    // This would:
    // 1. Query database with filters and date range
    // 2. Generate file in requested format
    // 3. Store temporarily and send email notification
    // 4. Clean up file after download or expiration
    
    return {
      data: { 
        exportId, 
        status: 'queued',
        estimatedTime: '2-5 minutes',
      },
      message: 'Export request submitted! You will receive an email when ready.',
    }
  } catch (error) {
    console.error('Export request error:', error)
    return {
      message: 'Failed to request export. Please try again.',
    }
  }
}
