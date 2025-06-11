import type { CSVValidationResult, ImportDataType } from './types'

/**
 * Parse CSV file content into headers and rows
 * @param file - The CSV file to parse
 * @returns Array with headers as first element, followed by data rows
 */
export async function parseCSVContent(file: File): Promise<any[]> {
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

/**
 * Validate CSV structure based on data type requirements
 * @param headers - CSV headers array
 * @param dataType - Type of data being imported
 * @returns Array of validation error messages
 */
export function validateCSVStructure(
  headers: string[],
  dataType: ImportDataType
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

/**
 * Analyze date distribution in the CSV data
 * @param rows - Data rows to analyze
 * @param dataType - Type of data being imported
 * @returns Date analysis results
 */
export function analyzeDates(rows: any[], dataType: ImportDataType): CSVValidationResult['dateAnalysis'] {
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
