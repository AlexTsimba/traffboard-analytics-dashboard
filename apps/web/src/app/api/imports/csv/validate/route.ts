import { NextRequest, NextResponse } from 'next/server';
import { databaseService } from '@traffboard/database';

interface CSVRow {
  date: string;
  foreign_partner_id: number;
  foreign_campaign_id: number;
  foreign_landing_id: number;
  os_family: string;
  country: string;
  all_clicks: number;
  unique_clicks: number;
  registrations_count: number;
  ftd_count: number;
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const dataType = formData.get('dataType') as string;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!['conversions', 'players'].includes(dataType)) {
      return NextResponse.json({ error: 'Invalid data type' }, { status: 400 });
    }

    // Check file size (1.5MB = ~1.57MB)
    const maxSize = 2 * 1024 * 1024; // 2MB limit
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large', 
        maxSize: '2MB',
        fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`
      }, { status: 400 });
    }

    // Parse CSV content
    const content = await file.text();
    const lines = content.trim().split('\n');
    
    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV must have header and at least one data row' }, { status: 400 });
    }

    // Validate headers for conversions
    const expectedHeaders = [
      'date', 'foreign_partner_id', 'foreign_campaign_id', 'foreign_landing_id',
      'os_family', 'country', 'all_clicks', 'unique_clicks', 
      'registrations_count', 'ftd_count'
    ];
    
    const headers = lines[0]?.split(',').map(h => h.trim().toLowerCase()) || [];
    const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      return NextResponse.json({ 
        error: 'Missing required headers', 
        missing: missingHeaders,
        found: headers
      }, { status: 400 });
    }

    // Parse sample rows for validation
    const dataRows = lines.slice(1, Math.min(11, lines.length)); // First 10 rows
    const parsedRows: CSVRow[] = [];
    const errors: string[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const rowData = dataRows[i];
      if (!rowData) continue;
      
      const row = rowData.split(',').map(cell => cell.trim());
      const rowNumber = i + 2; // Row number in CSV (1-indexed + header)
      
      try {
        const parsedRow: CSVRow = {
          date: row[0] || '',
          foreign_partner_id: parseInt(row[1] || '0'),
          foreign_campaign_id: parseInt(row[2] || '0'),
          foreign_landing_id: parseInt(row[3] || '0'),
          os_family: row[4] || '',
          country: row[5] || '',
          all_clicks: parseInt(row[6] || '0'),
          unique_clicks: parseInt(row[7] || '0'),
          registrations_count: parseInt(row[8] || '0'),
          ftd_count: parseInt(row[9] || '0'),
        };

        // Validate date format (YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(parsedRow.date)) {
          errors.push(`Row ${rowNumber}: Invalid date format "${parsedRow.date}". Expected YYYY-MM-DD`);
        }
        
        // Validate numeric fields
        if (isNaN(parsedRow.foreign_partner_id)) {
          errors.push(`Row ${rowNumber}: Invalid partner_id "${row[1]}"`);
        }
        if (isNaN(parsedRow.unique_clicks) || parsedRow.unique_clicks < 0) {
          errors.push(`Row ${rowNumber}: Invalid unique_clicks "${row[7]}"`);
        }
        
        parsedRows.push(parsedRow);
      } catch (error) {
        errors.push(`Row ${rowNumber}: Parse error - ${error}`);
      }
    }

    // Get current date for conflict analysis
    const today = new Date().toISOString().split('T')[0]!;
    const dates = parsedRows.map(row => row.date);
    const uniqueDates = [...new Set(dates)];
    
    const historical = uniqueDates.filter(date => date < today).length;
    const todayCount = uniqueDates.filter(date => date === today).length;
    const future = uniqueDates.filter(date => date > today).length;

    // Get existing data summary
    const maxDate = await databaseService.conversions.getMaxDate();

    return NextResponse.json({
      success: true,
      file: {
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
        totalRows: lines.length - 1,
        sampleRows: parsedRows.length,
      },
      analysis: {
        historical,
        today: todayCount,
        future,
        maxExistingDate: maxDate,
      },
      errors: errors.slice(0, 10), // First 10 errors
      preview: parsedRows.slice(0, 5), // First 5 rows
    });

  } catch (error) {
    console.error('CSV validation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
