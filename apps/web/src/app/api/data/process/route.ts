import { NextRequest, NextResponse } from 'next/server';
import { DataProcessingPipeline } from '@traffboard/normalization';

export async function POST(request: NextRequest) {
  try {
    const { partnerId, dataType, data } = await request.json();

    if (!partnerId || !dataType || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: partnerId, dataType, data' },
        { status: 400 }
      );
    }

    if (!Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Data must be an array' },
        { status: 400 }
      );
    }

    const pipeline = new DataProcessingPipeline();
    let result;

    if (dataType === 'conversions') {
      result = await pipeline.processConversions(partnerId, data);
    } else if (dataType === 'players') {
      result = await pipeline.processPlayers(partnerId, data);
    } else {
      return NextResponse.json(
        { error: 'Invalid dataType. Must be "conversions" or "players"' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: result.success,
      processed: result.processed,
      total: data.length,
      errors: result.errors,
      summary: {
        successRate: ((result.processed / data.length) * 100).toFixed(2) + '%',
        errorCount: result.errors.length,
      }
    });

  } catch (error) {
    console.error('Data processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
