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
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const mode = formData.get('mode') as string || 'incremental';
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Parse CSV content
    const content = await file.text();
    const lines = content.trim().split('\n');
    const dataRows = lines.slice(1); // Skip header
    
    const today = new Date().toISOString().split('T')[0]!;
    const stats: ImportStats = {
      totalRows: dataRows.length,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: 0
    };

    // Process in chunks of 500 rows
    const CHUNK_SIZE = 500;
    const chunks = [];
    for (let i = 0; i < dataRows.length; i += CHUNK_SIZE) {
      chunks.push(dataRows.slice(i, i + CHUNK_SIZE));
    }

    console.log(`Processing ${dataRows.length} rows in ${chunks.length} chunks`);

    // Process each chunk
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      if (!chunk) continue;
      
      console.log(`Processing chunk ${chunkIndex + 1}/${chunks.length}`);
      
      for (const rowData of chunk) {
        try {
          const row = rowData.split(',').map(cell => cell.trim());
          const date = row[0];
          
          if (!date) {
            stats.errors++;
            continue;
          }
          
          // Smart date-based logic
          if (mode === 'incremental') {
            if (date < today) {
              stats.skipped++;
              continue; // Skip historical dates
            }
          }
          
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

          // Check if record exists (for today's data)
          if (date === today) {
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
          } else {
            // Future dates - just insert
            await databaseService.conversions.create(rowObj);
            stats.inserted++;
          }
          
        } catch (error) {
          console.error('Row processing error:', error);
          stats.errors++;
        }
      }
      
      // Small delay between chunks to prevent database overload
      if (chunkIndex < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
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
