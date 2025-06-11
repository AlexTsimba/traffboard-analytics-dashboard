'use server'

import type { ActionState, CSVValidationResult } from './types'
import { csvUploadSchema } from './types'
import { parseCSVContent, validateCSVStructure, analyzeDates } from './utils'

/**
 * Server Action for validating CSV file
 * Validates file format, structure, and provides analysis of the data
 * @param _prevState - Previous action state (unused)
 * @param formData - Form data containing file and data type
 * @returns Action state with validation results
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
