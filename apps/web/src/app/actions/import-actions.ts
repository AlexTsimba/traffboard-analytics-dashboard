'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { revalidateAllDashboard, revalidateConversions, revalidatePlayers } from '@/lib/cache'

// Validation schemas
const csvUploadSchema = z.object({
  dataType: z.enum(['conversions', 'players'], {
    errorMap: () => ({ message: 'Please select a valid data type' }),
  }),
  file: z.any().refine((file) => file instanceof File, {
    message: 'Please select a file to upload',
  }),
})

// CSV validation schema - implementation would go here when needed

// Types
export interface ActionState {
  message?: string
  errors?: Record<string, string[]>
  data?: any
}

export interface CSVValidationResult {
  isValid: boolean
  fileName: string
  fileSize: number
  rowCount: number
  columnCount: number
  headers: string[]
  sampleRows: any[]
  dateAnalysis: {
    hasHistoricalDates: boolean
    hasTodayDates: boolean
    hasFutureDates: boolean
    historicalCount: number
    todayCount: number
    futureCount: number
  }
  validationErrors: string[]
}

export interface CSVImportResult {
  success: boolean
  processedRows: number
  skippedRows: number
  errorRows: number
  errors: string[]
  summary: {
    totalRows: number
    historicalSkipped: number
    todayUpserted: number
    futureInserted: number
  }
}

// Helper function to parse CSV content
async function parseCSVContent(file: File): Promise<any[]> {
  const content = await file.text()
  const lines = content.split('\n').filter(line => line.trim())
  
  if (lines.length === 0) {
    throw new Error('File is empty')
  }

  const firstLine = lines[0]
  if (!firstLine) {
    throw new Error('File is empty')
  }

  const headers = firstLine.split(',').map(h => h.trim().replace(/"/g, ''))
  const rows = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
    const row: any = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    return row
  })

  return [headers, ...rows]
}

// Helper function to validate CSV structure based on data type
function validateCSVStructure(
  headers: string[],
  dataType: 'conversions' | 'players'
): string[] {
  const errors: string[] = []

  if (dataType === 'conversions') {
    const requiredHeaders = [
      'date',
      'foreign_partner_id', 
      'foreign_campaign_id',
      'foreign_landing_id',
      'os_family',
      'country',
      'all_clicks',
      'unique_clicks',
      'registrations_count',
      'ftd_count'
    ]

    const missingHeaders = requiredHeaders.filter(header => 
      !headers.includes(header)
    )

    if (missingHeaders.length > 0) {
      errors.push(`Missing required headers for conversions data: ${missingHeaders.join(', ')}`)
    }

    if (headers.length !== 10) {
      errors.push(`Conversions data should have exactly 10 columns, found ${headers.length}`)
    }
  } else if (dataType === 'players') {
    const requiredHeaders = [
      'Player ID',
      'Sign up date',
      'Partner ID',
      'Campaign ID',
      'Player country'
    ]

    const missingHeaders = requiredHeaders.filter(header => 
      !headers.some(h => h.toLowerCase().includes(header.toLowerCase()))
    )

    if (missingHeaders.length > 0) {
      errors.push(`Missing required headers for players data: ${missingHeaders.join(', ')}`)
    }

    // Players CSV should have around 35 columns
    if (headers.length < 30 || headers.length > 40) {
      errors.push(`Players data should have approximately 35 columns, found ${headers.length}`)
    }
  }

  return errors
}

// Helper function to analyze dates in the data
function analyzeDates(rows: any[], dataType: 'conversions' | 'players'): CSVValidationResult['dateAnalysis'] {
  const today = new Date().toISOString().split('T')[0] || ''
  let historicalCount = 0
  let todayCount = 0
  let futureCount = 0

  const dateField = dataType === 'conversions' ? 'date' : 'Sign up date'

  rows.forEach(row => {
    let dateValue = row[dateField]
    if (!dateValue) return

    // Handle different date formats
    if (dateValue.includes(' ')) {
      dateValue = dateValue.split(' ')[0] // Extract date part from datetime
    }

    try {
      const rowDate = new Date(dateValue).toISOString().split('T')[0]
      
      if (!rowDate) return // Skip if date parsing failed
      
      if (rowDate < today) {
        historicalCount++
      } else if (rowDate === today) {
        todayCount++
      } else if (rowDate > today) {
        futureCount++
      }
    } catch {
      // Skip invalid dates
      return
    }
  })

  return {
    hasHistoricalDates: historicalCount > 0,
    hasTodayDates: todayCount > 0,
    hasFutureDates: futureCount > 0,
    historicalCount,
    todayCount,
    futureCount,
  }
}

/**
 * Server Action for validating CSV file
 */
export async function validateCSVAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    // Extract form data
    const dataType = formData.get('dataType') as string
    const file = formData.get('file') as File

    // Validate basic inputs
    const validatedFields = csvUploadSchema.safeParse({
      dataType,
      file,
    })

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Invalid form data. Please check your inputs.',
      }
    }

    // Check file size (limit to ~2MB)
    if (file.size > 2 * 1024 * 1024) {
      return {
        message: 'File size exceeds 2MB limit. Please use a smaller file.',
      }
    }

    // Check file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return {
        message: 'Only CSV files are allowed.',
      }
    }

    // Parse CSV content
    const [headers, ...rows] = await parseCSVContent(file)

    if (rows.length === 0) {
      return {
        message: 'CSV file must contain at least one data row.',
      }
    }

    // Validate CSV structure
    const structureErrors = validateCSVStructure(headers, dataType as 'conversions' | 'players')

    // Analyze dates
    const dateAnalysis = analyzeDates(rows, dataType as 'conversions' | 'players')

    // Prepare validation result
    const validationResult: CSVValidationResult = {
      isValid: structureErrors.length === 0,
      fileName: file.name,
      fileSize: file.size,
      rowCount: rows.length,
      columnCount: headers.length,
      headers,
      sampleRows: rows.slice(0, 3), // First 3 rows as sample
      dateAnalysis,
      validationErrors: structureErrors,
    }

    return {
      data: validationResult,
      message: validationResult.isValid 
        ? 'CSV file validation successful!' 
        : 'CSV file validation failed. Please fix the errors and try again.',
    }
  } catch (error) {
    console.error('CSV validation error:', error)
    return {
      message: 'Failed to validate CSV file. Please check the file format and try again.',
    }
  }
}

/**
 * Server Action for executing CSV import
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
          // This would call the actual database upsert logic
          await processRowUpsert(row, dataType as 'conversions' | 'players')
          processedRows++
          todayUpserted++
        } else if (rowDate > today) {
          // Future dates - insert
          // This would call the actual database insert logic
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

// Helper function to process row upsert (placeholder)
async function processRowUpsert(
  _row: any, 
  _dataType: 'conversions' | 'players'
): Promise<void> {
  // This would contain actual database upsert logic
  // For now, just simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1))
}

// Helper function to process row insert (placeholder)
async function processRowInsert(
  _row: any, 
  _dataType: 'conversions' | 'players'
): Promise<void> {
  // This would contain actual database insert logic
  // For now, just simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1))
}

/**
 * Server Action for clearing import history
 */
export async function clearImportHistoryAction(): Promise<ActionState> {
  try {
    // This would clear import logs from database
    // For now, just simulate the action
    
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
