import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  validateCSVAction,
  executeCSVImportAction,
  clearImportHistoryAction,
} from './import-actions'

// Mock external dependencies
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

// Helper to create mock File objects
function createMockFile(name: string, content: string, size: number): File {
  const file = new File([content], name, { type: 'text/csv' })
  // Override the size property
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('Import Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validateCSVAction', () => {
    it('should validate form data and return errors for missing inputs', async () => {
      const formData = new FormData()
      // Not providing dataType or file

      const result = await validateCSVAction({}, formData)

      expect(result.errors).toBeDefined()
      expect(result.message).toBe('Invalid form data. Please check your inputs.')
    })

    it('should reject non-CSV files', async () => {
      const formData = new FormData()
      formData.append('dataType', 'conversions')
      
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' })
      formData.append('file', mockFile)

      const result = await validateCSVAction({}, formData)

      expect(result.message).toBe('Only CSV files are allowed.')
    })

    it('should reject files exceeding size limit', async () => {
      const formData = new FormData()
      formData.append('dataType', 'conversions')
      
      // Create a mock file with size > 2MB
      const largeMockFile = createMockFile('large.csv', 'header1,header2\nvalue1,value2', 3 * 1024 * 1024)
      formData.append('file', largeMockFile)

      const result = await validateCSVAction({}, formData)

      expect(result.message).toBe('File size exceeds 2MB limit. Please use a smaller file.')
    })

    it('should validate conversions CSV structure', async () => {
      const formData = new FormData()
      formData.append('dataType', 'conversions')
      
      const csvContent = `date,foreign_partner_id,foreign_campaign_id,foreign_landing_id,os_family,country,all_clicks,unique_clicks,registrations_count,ftd_count
2024-01-01,1,1,1,Windows,US,100,80,10,2`

      const mockFile = createMockFile('conversions.csv', csvContent, 1024)
      formData.append('file', mockFile)

      const result = await validateCSVAction({}, formData)

      expect(result.data).toBeDefined()
      expect(result.data.isValid).toBe(true)
      expect(result.data.headers).toHaveLength(10)
      expect(result.data.rowCount).toBe(1)
      expect(result.message).toBe('CSV file validation successful!')
    })

    it('should validate players CSV structure', async () => {
      const formData = new FormData()
      formData.append('dataType', 'players')
      
      const csvContent = `Player ID,Original player ID,Sign up date,First deposit date,Date,Partner ID,Company name,Partners email,Partner tags,Campaign ID,Campaign name,Promo ID,Promo code,Player country,Tag: clickid,Tag: os,Tag: source,Tag: sub2,Prequalified,Duplicate,Self-excluded,Disabled,Currency,FTD count,FTD sum,Deposits count,Deposits sum,Cashouts count,Cashouts sum,Casino bets count,Casino Real NGR,Fixed per player,Casino bets sum,Extra1,Extra2
12345,12345,2024-01-01,2024-01-02,2024-01-01,1,Test Company,test@example.com,tag1,1,Test Campaign,1,PROMO123,US,click123,Windows,source1,sub2val,1,0,0,0,USD,1,100.00,2,200.00,1,50.00,10,150.00,50,250.00,extra1,extra2`

      const mockFile = createMockFile('players.csv', csvContent, 1024)
      formData.append('file', mockFile)

      const result = await validateCSVAction({}, formData)

      expect(result.data).toBeDefined()
      expect(result.data.isValid).toBe(true)
      expect(result.data.headers).toHaveLength(35)
      expect(result.data.rowCount).toBe(1)
    })

    it('should detect invalid conversions CSV structure', async () => {
      const formData = new FormData()
      formData.append('dataType', 'conversions')
      
      const csvContent = `invalid_header1,invalid_header2
value1,value2`

      const mockFile = createMockFile('invalid.csv', csvContent, 1024)
      formData.append('file', mockFile)

      const result = await validateCSVAction({}, formData)

      expect(result.data).toBeDefined()
      expect(result.data.isValid).toBe(false)
      expect(result.data.validationErrors).toEqual(
        expect.arrayContaining([expect.stringMatching(/Missing required headers/)])
      )
      expect(result.message).toBe('CSV file validation failed. Please fix the errors and try again.')
    })

    it('should analyze date distribution in data', async () => {
      const today = new Date().toISOString().split('T')[0]
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const formData = new FormData()
      formData.append('dataType', 'conversions')
      
      const csvContent = `date,foreign_partner_id,foreign_campaign_id,foreign_landing_id,os_family,country,all_clicks,unique_clicks,registrations_count,ftd_count
${yesterday},1,1,1,Windows,US,100,80,10,2
${today},1,1,1,Windows,US,100,80,10,2
${tomorrow},1,1,1,Windows,US,100,80,10,2`

      const mockFile = createMockFile('conversions.csv', csvContent, 1024)
      formData.append('file', mockFile)

      const result = await validateCSVAction({}, formData)

      expect(result.data.dateAnalysis).toBeDefined()
      expect(result.data.dateAnalysis.hasHistoricalDates).toBe(true)
      expect(result.data.dateAnalysis.hasTodayDates).toBe(true)
      expect(result.data.dateAnalysis.hasFutureDates).toBe(true)
      expect(result.data.dateAnalysis.historicalCount).toBe(1)
      expect(result.data.dateAnalysis.todayCount).toBe(1)
      expect(result.data.dateAnalysis.futureCount).toBe(1)
    })

    it('should reject empty CSV files', async () => {
      const formData = new FormData()
      formData.append('dataType', 'conversions')
      
      const mockFile = createMockFile('empty.csv', '', 0)
      formData.append('file', mockFile)

      const result = await validateCSVAction({}, formData)

      expect(result.message).toBe('Failed to validate CSV file. Please check the file format and try again.')
    })
  })

  describe('executeCSVImportAction', () => {
    it('should validate form data before processing', async () => {
      const formData = new FormData()
      // Not providing required fields

      const result = await executeCSVImportAction({}, formData)

      expect(result.errors).toBeDefined()
      expect(result.message).toBe('Invalid form data.')
    })

    it('should process CSV import with date-based logic', async () => {
      const today = new Date().toISOString().split('T')[0]
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const formData = new FormData()
      formData.append('dataType', 'conversions')
      
      const csvContent = `date,foreign_partner_id,foreign_campaign_id,foreign_landing_id,os_family,country,all_clicks,unique_clicks,registrations_count,ftd_count
${yesterday},1,1,1,Windows,US,100,80,10,2
${today},1,1,1,Windows,US,100,80,10,2
${tomorrow},1,1,1,Windows,US,100,80,10,2`

      const mockFile = createMockFile('conversions.csv', csvContent, 1024)
      formData.append('file', mockFile)

      const result = await executeCSVImportAction({}, formData)

      expect(result.data).toBeDefined()
      expect(result.data.summary.totalRows).toBe(3)
      expect(result.data.summary.historicalSkipped).toBe(1)
      expect(result.data.summary.todayUpserted).toBe(1)
      expect(result.data.summary.futureInserted).toBe(1)
      expect(result.data.processedRows).toBe(2) // today + future
      expect(result.data.skippedRows).toBe(1) // historical
    })

    it('should handle rows with missing date fields', async () => {
      const formData = new FormData()
      formData.append('dataType', 'conversions')
      
      const csvContent = `date,foreign_partner_id,foreign_campaign_id,foreign_landing_id,os_family,country,all_clicks,unique_clicks,registrations_count,ftd_count
,1,1,1,Windows,US,100,80,10,2
2024-01-01,1,1,1,Windows,US,100,80,10,2`

      const mockFile = createMockFile('conversions.csv', csvContent, 1024)
      formData.append('file', mockFile)

      const result = await executeCSVImportAction({}, formData)

      expect(result.data.errorRows).toBe(1)
      expect(result.data.errors).toEqual(
        expect.arrayContaining([expect.stringMatching(/Missing date field/)])
      )
    })

    it('should revalidate dashboard paths after import', async () => {
      const formData = new FormData()
      formData.append('dataType', 'conversions')
      
      const csvContent = `date,foreign_partner_id,foreign_campaign_id,foreign_landing_id,os_family,country,all_clicks,unique_clicks,registrations_count,ftd_count
2024-01-01,1,1,1,Windows,US,100,80,10,2`

      const mockFile = createMockFile('conversions.csv', csvContent, 1024)
      formData.append('file', mockFile)

      await executeCSVImportAction({}, formData)

      const { revalidatePath } = await vi.importMock('next/cache')
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard')
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard/analytics')
    })
  })

  describe('clearImportHistoryAction', () => {
    it('should clear import history and revalidate page', async () => {
      const result = await clearImportHistoryAction()

      expect(result.message).toBe('Import history cleared successfully.')
      expect(result.data?.success).toBe(true)
      
      const { revalidatePath } = await vi.importMock('next/cache')
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard/imports')
    })

    it('should handle errors gracefully', async () => {
      // Mock an error in revalidatePath
      const { revalidatePath } = await vi.importMock('next/cache')
      revalidatePath.mockImplementation(() => {
        throw new Error('Revalidation failed')
      })

      const result = await clearImportHistoryAction()

      expect(result.message).toBe('Failed to clear import history. Please try again.')
    })
  })
})
