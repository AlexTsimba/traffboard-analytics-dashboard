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
    const mode = formData.get('mode') as string || 'smart';
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Parse CSV content
    const content = await file.text();
    const lines = content.trim().split('\n');
    const dataRows = lines.slice(1); // Skip header
    
    const today = new Date().toISOString().split('T')[0]!;
    
    // Smart date logic: Import last 30 days of data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0]!;
    
    console.log(`Import mode: ${mode}`);
    console.log(`Today: ${today}, Cutoff date: ${cutoffDate}`);
    
    const stats: ImportStats = {
      totalRows: dataRows.length,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: 0
    };

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
          const date = row[0];
          
          if (!date) {
            stats.errors++;
            continue;
          }
          
          // Smart date-based logic
          if (mode === 'smart' || mode === 'incremental') {
            // Skip data older than 30 days (unless it's full import)
            if (date < cutoffDate) {
              stats.skipped++;
              continue;
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
            continue;
          }

          // Validate date format
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            stats.errors++;
            console.error(`Invalid date format: ${date}`);
            continue;
          }

          // Validate country code length (database expects max 2 chars)
          if (rowObj.country && rowObj.country.length > 2) {
            stats.errors++;
            console.error(`Country code too long: ${rowObj.country} (max 2 chars)`);
            continue;
          }

          // Use upsert logic for all fresh data (prevents duplicates)
          try {
            // Log the data being processed for debugging
            if (chunkIndex === 0 && chunk.indexOf(rowData) < 3) {
              console.log(`Processing row data:`, rowObj);
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
            console.error('Database error for row:', rowObj);
            console.error('Database error details:', dbError);
            stats.errors++;
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
      message: `Import completed: ${stats.inserted} inserted, ${stats.updated} updated, ${stats.skipped} skipped, ${stats.errors} errors`
    });

  } catch (error) {
    console.error('CSV import error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
