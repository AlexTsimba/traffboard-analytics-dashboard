import { z } from 'zod'

/**
 * Validation schema for CSV upload form data
 */
export const csvUploadSchema = z.object({
  dataType: z.enum(['conversions', 'players'], {
    errorMap: () => ({ message: 'Please select a valid data type' }),
  }),
  file: z.any().refine((file) => file instanceof File, {
    message: 'Please select a file to upload',
  }),
})

/**
 * Standard action state interface for server actions
 */
export interface ActionState {
  message?: string
  errors?: Record<string, string[]>
  data?: any
}

/**
 * Result of CSV file validation
 */
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

/**
 * Result of CSV import execution
 */
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

/**
 * Data types supported for import
 */
export type ImportDataType = 'conversions' | 'players'
