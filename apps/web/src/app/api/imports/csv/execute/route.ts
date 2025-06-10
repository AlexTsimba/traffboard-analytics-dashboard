import { NextRequest, NextResponse } from 'next/server';
import { databaseService } from '@traffboard/database';

interface ImportStats {
  totalRows: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
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
    const mode = formData.get('mode') as string || 'smart';
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!['conversions', 'players'].includes(dataType)) {
      return NextResponse.json({ error: 'Invalid data type' }, { status: 400 });
    }

    // Parse CSV content
    const content = await file.text();
    const lines = content.trim().split('\n');
    const headers = lines[0]?.split(',').map(h => h.trim().toLowerCase()) || [];
    const dataRows = lines.slice(1); // Skip header
    
    const today = new Date().toISOString().split('T')[0]!;
    
    // Smart date logic: Import last 30 days of data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0]!;
    
    console.log(`Import mode: ${mode}, Data type: ${dataType}`);
    console.log(`Today: ${today}, Cutoff date: ${cutoffDate}`);
    
    const stats: ImportStats = {
      totalRows: dataRows.length,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: 0
    };

    // Helper function to get header index
    const getHeaderIndex = (headerName: string) => headers.indexOf(headerName);

    // Process in smaller chunks of 100 rows to prevent connection issues
    const CHUNK_SIZE = 100;
    const chunks = [];
    for (let i = 0; i < dataRows.length; i += CHUNK_SIZE) {
      chunks.push(dataRows.slice(i, i + CHUNK_SIZE));
    }

    console.log(`Processing ${dataRows.length} rows in ${chunks.length} chunks of ${CHUNK_SIZE}`);

    // Process each chunk sequentially to avoid connection pool exhaustion
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      if (!chunk) continue;
      
      console.log(`Processing chunk ${chunkIndex + 1}/${chunks.length} (${chunk.length} rows)`);
      
      // Process each row in the chunk sequentially
      for (const rowData of chunk) {
        try {
          const row = rowData.split(',').map(cell => cell.trim());
          
          if (dataType === 'conversions') {
            await processConversionsRow(row, mode, cutoffDate, stats, chunkIndex, chunk, rowData);
          } else {
            await processPlayersRow(row, headers, getHeaderIndex, mode, cutoffDate, stats, chunkIndex, chunk, rowData);
          }
          
        } catch (error) {
          console.error('Row processing error:', error);
          stats.errors++;
        }
      }
      
      // Longer delay between chunks to prevent database overload
      if (chunkIndex < chunks.length - 1) {
        console.log(`Completed chunk ${chunkIndex + 1}, waiting before next chunk...`);
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
      }
    }

    console.log('Import completed:', stats);

    return NextResponse.json({
      success: true,
      stats,
      dataType,
      message: `Import completed: ${stats.inserted} inserted, ${stats.updated} updated, ${stats.skipped} skipped, ${stats.errors} errors`
    });

  } catch (error) {
    console.error('CSV import error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Process conversions row
async function processConversionsRow(
  row: string[], 
  mode: string, 
  cutoffDate: string, 
  stats: ImportStats, 
  chunkIndex: number, 
  chunk: string[], 
  rowData: string
) {
  const date = row[0];
  
  if (!date) {
    stats.errors++;
    return;
  }
  
  // Smart date-based logic
  if (mode === 'smart' || mode === 'incremental') {
    // Skip data older than 30 days (unless it's full import)
    if (date < cutoffDate) {
      stats.skipped++;
      return;
    }
  }
  // Full mode imports everything regardless of date
  
  const rowObj = {
    date,
    foreignPartnerId: parseInt(row[1] || '0'),
    foreignCampaignId: parseInt(row[2] || '0'),
    foreignLandingId: parseInt(row[3] || '0'),
    osFamily: row[4] || '',
    country: row[5] || '',
    allClicks: parseInt(row[6] || '0'),
    uniqueClicks: parseInt(row[7] || '0'),
    registrationsCount: parseInt(row[8] || '0'),
    ftdCount: parseInt(row[9] || '0'),
  };

  // Validate required fields
  if (isNaN(rowObj.foreignPartnerId) || isNaN(rowObj.uniqueClicks)) {
    stats.errors++;
    console.error(`Invalid data in row: partner_id=${row[1]}, unique_clicks=${row[7]}`);
    return;
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    stats.errors++;
    console.error(`Invalid date format: ${date}`);
    return;
  }

  // Validate country code length (database expects max 2 chars)
  if (rowObj.country && rowObj.country.length > 2) {
    stats.errors++;
    console.error(`Country code too long: ${rowObj.country} (max 2 chars)`);
    return;
  }

  // Use upsert logic for all fresh data (prevents duplicates)
  try {
    // Log the data being processed for debugging
    if (chunkIndex === 0 && chunk.indexOf(rowData) < 3) {
      console.log(`Processing conversions row data:`, rowObj);
    }
    
    const existing = await databaseService.conversions.findByCompositeKey(
      date, rowObj.foreignPartnerId, rowObj.foreignCampaignId, rowObj.foreignLandingId
    );
    
    if (existing) {
      // Update existing record
      await databaseService.conversions.updateByCompositeKey(
        date, rowObj.foreignPartnerId, rowObj.foreignCampaignId, rowObj.foreignLandingId, rowObj
      );
      stats.updated++;
    } else {
      // Insert new record
      await databaseService.conversions.create(rowObj);
      stats.inserted++;
    }
  } catch (dbError) {
    console.error('Database error for conversions row:', rowObj);
    console.error('Database error details:', dbError);
    stats.errors++;
  }
}

// Process players row (excluding email for privacy/security)
async function processPlayersRow(
  row: string[], 
  headers: string[], 
  getHeaderIndex: (name: string) => number,
  mode: string, 
  cutoffDate: string, 
  stats: ImportStats, 
  chunkIndex: number, 
  chunk: string[], 
  rowData: string
) {
  try {
    const signUpDateRaw = row[getHeaderIndex('sign up date')] || '';
    const dateRaw = row[getHeaderIndex('date')] || signUpDateRaw;
    
    if (!signUpDateRaw || !dateRaw) {
      stats.errors++;
      console.error(`Missing required dates: signUp=${signUpDateRaw}, date=${dateRaw}`);
      return;
    }
    
    // Parse dates properly (handle "2023-02-16 00:00:00 UTC" format)
    const signUpDate = signUpDateRaw.split(' ')[0]; // Extract date part
    const date = dateRaw.split(' ')[0]; // Extract date part
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(signUpDate) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      stats.errors++;
      console.error(`Invalid date format: signUp=${signUpDate}, date=${date}`);
      return;
    }
    
    // Smart date-based logic for players (based on sign up date)
    if (mode === 'smart' || mode === 'incremental') {
      if (signUpDate < cutoffDate) {
        stats.skipped++;
        return;
      }
    }
    
    // Helper function to parse numeric values safely
    const parseNumeric = (value: string, defaultValue: number = 0): number => {
      if (!value || value.trim() === '') return defaultValue;
      const parsed = parseFloat(value);
      return isNaN(parsed) ? defaultValue : parsed;
    };
    
    const parseInt = (value: string, defaultValue: number = 0): number => {
      if (!value || value.trim() === '') return defaultValue;
      const parsed = Number.parseInt(value);
      return isNaN(parsed) ? defaultValue : parsed;
    };
    
    // Parse first deposit date if present
    const firstDepositDateRaw = row[getHeaderIndex('first deposit date')] || '';
    const firstDepositDate = firstDepositDateRaw ? firstDepositDateRaw.split(' ')[0] : null;
    
    const rowObj = {
      playerId: parseInt(row[getHeaderIndex('player id')] || '0'),
      originalPlayerId: parseInt(row[getHeaderIndex('original player id')] || '0'),
      signUpDate,
      firstDepositDate,
      campaignId: parseInt(row[getHeaderIndex('campaign id')] || '0'),
      campaignName: row[getHeaderIndex('campaign name')] || '',
      playerCountry: (row[getHeaderIndex('player country')] || '').substring(0, 2), // Limit to 2 chars
      tagClickid: row[getHeaderIndex('tag: clickid')] || '',
      tagOs: (row[getHeaderIndex('tag: os')] || '').substring(0, 50), // Limit to 50 chars
      tagSource: row[getHeaderIndex('tag: source')] || '',
      tagSub2: parseNumeric(row[getHeaderIndex('tag: sub2')] || '0'), // Convert to decimal
      tagWebId: parseNumeric(row[getHeaderIndex('tag: webid')] || '0'), // Convert to decimal
      date,
      partnerId: parseInt(row[getHeaderIndex('partner id')] || '0'),
      companyName: row[getHeaderIndex('company name')] || '',
      // partners_email intentionally excluded - not stored for privacy/security
      partnerTags: row[getHeaderIndex('partner tags')] || '',
      promoId: parseInt(row[getHeaderIndex('promo id')] || '0') || null,
      promoCode: (row[getHeaderIndex('promo code')] || '').substring(0, 100), // Limit to 100 chars
      prequalified: parseInt(row[getHeaderIndex('prequalified')] || '0') === 1,
      duplicate: parseInt(row[getHeaderIndex('duplicate')] || '0') === 1,
      selfExcluded: parseInt(row[getHeaderIndex('self-excluded')] || '0') === 1,
      disabled: parseInt(row[getHeaderIndex('disabled')] || '0') === 1,
      currency: (row[getHeaderIndex('currency')] || '').substring(0, 3), // Limit to 3 chars
      ftdCount: parseInt(row[getHeaderIndex('ftd count')] || '0'),
      ftdSum: parseNumeric(row[getHeaderIndex('ftd sum')] || '0'),
      depositsCount: parseInt(row[getHeaderIndex('deposits count')] || '0'),
      depositsSum: parseNumeric(row[getHeaderIndex('deposits sum')] || '0'),
      cashoutsCount: parseInt(row[getHeaderIndex('cashouts count')] || '0'),
      cashoutsSum: parseNumeric(row[getHeaderIndex('cashouts sum')] || '0'),
      casinoBetsCount: parseInt(row[getHeaderIndex('casino bets count')] || '0'),
      casinoRealNgr: parseNumeric(row[getHeaderIndex('casino real ngr')] || '0'),
      fixedPerPlayer: parseNumeric(row[getHeaderIndex('fixed per player')] || '0'),
      casinoBetsSum: parseNumeric(row[getHeaderIndex('casino bets sum')] || '0'),
      casinoWinsSum: parseNumeric(row[getHeaderIndex('casino wins sum')] || '0'),
    };

    // Validate required fields
    if (isNaN(rowObj.playerId) || rowObj.playerId <= 0) {
      stats.errors++;
      console.error(`Invalid player ID: ${row[getHeaderIndex('player id')]}`);
      return;
    }

    if (isNaN(rowObj.partnerId) || rowObj.partnerId <= 0) {
      stats.errors++;
      console.error(`Invalid partner ID: ${row[getHeaderIndex('partner id')]}`);
      return;
    }

    // Use upsert logic for players (based on player ID and date)
    try {
      // Log the data being processed for debugging (first few rows only)
      if (chunkIndex === 0 && chunk.indexOf(rowData) < 3) {
        console.log(`Processing players row data:`, JSON.stringify(rowObj, null, 2));
      }
      
      // Check if player record exists for this date
      const existing = await databaseService.players.findByPlayerIdAndDate(
        rowObj.playerId, rowObj.date
      );
      
      if (existing) {
        // Update existing record
        await databaseService.players.updateByPlayerIdAndDate(
          rowObj.playerId, rowObj.date, rowObj
        );
        stats.updated++;
      } else {
        // Insert new record
        await databaseService.players.create(rowObj);
        stats.inserted++;
      }
    } catch (dbError) {
      console.error('Database error for players row:', rowObj);
      console.error('Database error details:', dbError);
      stats.errors++;
    }
  } catch (error) {
    console.error('Row processing error in processPlayersRow:', error);
    stats.errors++;
  }
}
