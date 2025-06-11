import { NextRequest, NextResponse } from 'next/server';
import { databaseService } from '@traffboard/database';

interface ConversionsCSVRow {
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

interface PlayersCSVRow {
  player_id: number;
  original_player_id: number;
  sign_up_date: string;
  first_deposit_date?: string;
  campaign_id: number;
  campaign_name: string;
  player_country: string;
  tag_clickid?: string;
  tag_os?: string;
  tag_source?: string;
  tag_sub2?: string;
  tag_webid?: string;
  date: string;
  partner_id: number;
  company_name: string;
  // partners_email excluded - not stored for privacy/security
  partner_tags?: string;
  promo_id?: number;
  promo_code?: string;
  prequalified: number;
  duplicate: number;
  self_excluded: number;
  disabled: number;
  currency: string;
  ftd_count: number;
  ftd_sum: number;
  deposits_count: number;
  deposits_sum: number;
  cashouts_count: number;
  cashouts_sum: number;
  casino_bets_count: number;
  casino_real_ngr: number;
  fixed_per_player: number;
  casino_bets_sum: number;
  casino_wins_sum: number;
}

export async function POST(request: NextRequest) {
  try {
    // Check for authentication via cookies
    const accessToken = request.cookies.get('access_token')?.value;
    const sessionId = request.cookies.get('session_id')?.value;
    
    if (!accessToken && !sessionId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
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

    // Define expected headers for conversions CSV
    const conversionsHeaders = [
      'date', 'foreign_partner_id', 'foreign_campaign_id', 'foreign_landing_id',
      'os_family', 'country', 'all_clicks', 'unique_clicks', 
      'registrations_count', 'ftd_count'
    ];
    
    const headers = lines[0]?.split(',').map(h => h.trim().toLowerCase()) || [];
    
    // Define required headers (subset of all headers that must be present)
    const requiredHeaders = dataType === 'conversions'
      ? conversionsHeaders // All conversions headers are required
      : [ // Essential players headers only (lowercase for comparison)
          'player id', 'sign up date', 'partner id', 'campaign id',
          'prequalified', 'duplicate', 'self-excluded', 'disabled'
        ];
    
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      return NextResponse.json({ 
        error: 'Missing required headers', 
        missing: missingHeaders,
        found: headers,
        foundCount: headers.length,
        dataType,
        requiredHeaders,
        hint: dataType === 'players' 
          ? 'Ensure your CSV has headers like: Player ID, Sign up date, Partner ID, Campaign ID, etc.'
          : 'Ensure your CSV has headers like: date, foreign_partner_id, foreign_campaign_id, etc.'
      }, { status: 400 });
    }

    // Parse sample rows for validation based on CSV type
    const dataRows = lines.slice(1, Math.min(11, lines.length)); // First 10 rows
    const parsedRows: (ConversionsCSVRow | PlayersCSVRow)[] = [];
    const errors: string[] = [];

    // Create header index mapping for players CSV
    const getHeaderIndex = (headerName: string) => headers.indexOf(headerName);

    for (let i = 0; i < dataRows.length; i++) {
      const rowData = dataRows[i];
      if (!rowData) continue;
      
      const row = rowData.split(',').map(cell => cell.trim());
      const rowNumber = i + 2; // Row number in CSV (1-indexed + header)
      
      try {
        if (dataType === 'conversions') {
          const parsedRow: ConversionsCSVRow = {
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
        } else {
          // Players CSV parsing - use header indices for flexible column order
          const parsedRow: PlayersCSVRow = {
            player_id: parseInt(row[getHeaderIndex('player id')] || '0'),
            original_player_id: parseInt(row[getHeaderIndex('original player id')] || '0'),
            sign_up_date: row[getHeaderIndex('sign up date')] || '',
            first_deposit_date: row[getHeaderIndex('first deposit date')] || '',
            campaign_id: parseInt(row[getHeaderIndex('campaign id')] || '0'),
            campaign_name: row[getHeaderIndex('campaign name')] || '',
            player_country: row[getHeaderIndex('player country')] || '',
            tag_clickid: row[getHeaderIndex('tag: clickid')] || '',
            tag_os: row[getHeaderIndex('tag: os')] || '',
            tag_source: row[getHeaderIndex('tag: source')] || '',
            tag_sub2: row[getHeaderIndex('tag: sub2')] || '',
            tag_webid: row[getHeaderIndex('tag: webid')] || '',
            date: row[getHeaderIndex('date')] || '',
            partner_id: parseInt(row[getHeaderIndex('partner id')] || '0'),
            company_name: row[getHeaderIndex('company name')] || '',
            // partners_email intentionally skipped - not stored for privacy/security
            partner_tags: row[getHeaderIndex('partner tags')] || '',
            promo_id: parseInt(row[getHeaderIndex('promo id')] || '0') || undefined,
            promo_code: row[getHeaderIndex('promo code')] || '',
            prequalified: parseInt(row[getHeaderIndex('prequalified')] || '0'),
            duplicate: parseInt(row[getHeaderIndex('duplicate')] || '0'),
            self_excluded: parseInt(row[getHeaderIndex('self-excluded')] || '0'),
            disabled: parseInt(row[getHeaderIndex('disabled')] || '0'),
            currency: row[getHeaderIndex('currency')] || '',
            ftd_count: parseInt(row[getHeaderIndex('ftd count')] || '0'),
            ftd_sum: parseFloat(row[getHeaderIndex('ftd sum')] || '0'),
            deposits_count: parseInt(row[getHeaderIndex('deposits count')] || '0'),
            deposits_sum: parseFloat(row[getHeaderIndex('deposits sum')] || '0'),
            cashouts_count: parseInt(row[getHeaderIndex('cashouts count')] || '0'),
            cashouts_sum: parseFloat(row[getHeaderIndex('cashouts sum')] || '0'),
            casino_bets_count: parseInt(row[getHeaderIndex('casino bets count')] || '0'),
            casino_real_ngr: parseFloat(row[getHeaderIndex('casino real ngr')] || '0'),
            fixed_per_player: parseInt(row[getHeaderIndex('fixed per player')] || '0'),
            casino_bets_sum: parseFloat(row[getHeaderIndex('casino bets sum')] || '0'),
            casino_wins_sum: parseFloat(row[getHeaderIndex('casino wins sum')] || '0'),
          };

          // Validate essential fields for players
          if (isNaN(parsedRow.player_id) || parsedRow.player_id <= 0) {
            errors.push(`Row ${rowNumber}: Invalid player_id "${row[getHeaderIndex('player id')]}"`);
          }
          if (isNaN(parsedRow.partner_id)) {
            errors.push(`Row ${rowNumber}: Invalid partner_id "${row[getHeaderIndex('partner id')]}"`);
          }
          if (!parsedRow.sign_up_date) {
            errors.push(`Row ${rowNumber}: Missing sign_up_date`);
          }
          
          parsedRows.push(parsedRow);
        }
      } catch (error) {
        errors.push(`Row ${rowNumber}: Parse error - ${error}`);
      }
    }

    // Get current date for conflict analysis
    const today = new Date().toISOString().split('T')[0]!;
    
    // Extract dates based on CSV type
    const dates = dataType === 'conversions' 
      ? parsedRows.map(row => (row as ConversionsCSVRow).date)
      : parsedRows.map(row => (row as PlayersCSVRow).sign_up_date || (row as PlayersCSVRow).date);
    
    const validDates = dates.filter(date => date && /^\d{4}-\d{2}-\d{2}$/.test(date));
    const uniqueDates = [...new Set(validDates)];
    
    const historical = uniqueDates.filter(date => date < today).length;
    const todayCount = uniqueDates.filter(date => date === today).length;
    const future = uniqueDates.filter(date => date > today).length;

    // Get existing data summary (for conversions only, players might not have this)
    const maxDate = dataType === 'conversions' 
      ? await databaseService.conversions.getMaxDate()
      : null;

    return NextResponse.json({
      success: true,
      dataType,
      file: {
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
        totalRows: lines.length - 1,
        sampleRows: parsedRows.length,
        headers: headers.length,
      },
      analysis: {
        historical,
        today: todayCount,
        future,
        validDates: validDates.length,
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
