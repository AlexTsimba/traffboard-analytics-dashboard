'use server'

import { revalidatePath } from 'next/cache'
import { revalidateAllDashboard, revalidateConversions, revalidatePlayers } from '@/lib/cache'

import type { ActionState, CSVImportResult } from './types'
import { csvUploadSchema } from './types'
import { parseCSVContent } from './utils'
import { processRowUpsert, processRowInsert, clearImportHistory } from './import-storage-actions'

/**
 * Server Action for executing CSV import
 * Processes the CSV file and imports data based on date logic
 * @param _prevState - Previous action state (unused)
 * @param formData - Form data containing file and data type
 * @returns Action state with import results
 */
export async function executeCSVImportAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    // Extract form data
    const dataType = formData.get('dataType') as string
    const file = formData.get('file') as File

    // Validate inputs
    const validatedFields = csvUploadSchema.safeParse({
      dataType,
      file,
    })

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Invalid form data.',
      }
    }

    // Parse CSV content
    const [_headers, ...rows] = await parseCSVContent(file)

    // Process rows based on date logic
    const today = new Date().toISOString().split('T')[0] || ''
    let processedRows = 0
    let skippedRows = 0
    let errorRows = 0
    let historicalSkipped = 0
    let todayUpserted = 0
    let futureInserted = 0
    const errors: string[] = []

    const dateField = dataType === 'conversions' ? 'date' : 'Sign up date'

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      
      try {
        let dateValue = row[dateField]
        if (!dateValue) {
          errors.push(`Row ${i + 2}: Missing date field`)
          errorRows++
          continue
        }

        // Handle different date formats
        if (dateValue.includes(' ')) {
          dateValue = dateValue.split(' ')[0]
        }

        const rowDate = new Date(dateValue).toISOString().split('T')[0]
        
        if (!rowDate) {
          errors.push(`Row ${i + 2}: Invalid date format`)
          errorRows++
          continue
        }

        if (rowDate < today) {
          // Historical dates - skip
          skippedRows++
          historicalSkipped++
        } else if (rowDate === today) {
          // Today's dates - upsert
          await processRowUpsert(row, dataType as 'conversions' | 'players')
          processedRows++
          todayUpserted++
        } else if (rowDate > today) {
          // Future dates - insert
          await processRowInsert(row, dataType as 'conversions' | 'players')
          processedRows++
          futureInserted++
        }
      } catch (error) {
        errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Processing error'}`)
        errorRows++
      }
    }

    // Prepare import result
    const importResult: CSVImportResult = {
      success: errorRows === 0,
      processedRows,
      skippedRows,
      errorRows,
      errors: errors.slice(0, 10), // Limit to first 10 errors
      summary: {
        totalRows: rows.length,
        historicalSkipped,
        todayUpserted,
        futureInserted,
      },
    }

    // Revalidate cache based on data type and processing results
    if (processedRows > 0) {
      // Trigger cache revalidation for affected data
      if (dataType === 'conversions') {
        await revalidateConversions()
      } else if (dataType === 'players') {
        await revalidatePlayers()
      }
      
      // Also revalidate the main dashboard if significant data was processed
      if (processedRows > 100) {
        await revalidateAllDashboard()
      }
    }

    // Legacy path revalidation (still needed for immediate UI updates)
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/analytics')

    return {
      data: importResult,
      message: importResult.success 
        ? `CSV import completed successfully! Processed ${processedRows} rows.`
        : `CSV import completed with ${errorRows} errors. Processed ${processedRows} rows.`,
    }
  } catch (error) {
    console.error('CSV import error:', error)
    return {
      message: 'Failed to import CSV file. Please try again.',
    }
  }
}

/**
 * Server Action for clearing import history
 * Removes historical import logs and data
 * @returns Action state indicating success or failure
 */
export async function clearImportHistoryAction(): Promise<ActionState> {
  try {
    await clearImportHistory()
    
    revalidatePath('/dashboard/imports')

    return {
      message: 'Import history cleared successfully.',
      data: { success: true },
    }
  } catch (error) {
    console.error('Clear import history error:', error)
    return {
      message: 'Failed to clear import history. Please try again.',
    }
  }
}
