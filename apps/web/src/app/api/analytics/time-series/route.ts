import { NextRequest, NextResponse } from 'next/server';
import { databaseService } from '@traffboard/database';
import { timeSeriesQuerySchema } from '@/lib/validations/analytics';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    const validation = timeSeriesQuerySchema.safeParse(
      Object.fromEntries(searchParams.entries())
    );
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid parameters', 
        details: validation.error.issues 
      }, { status: 400 });
    }

    const query = validation.data;
    
    const filter: any = {};
    if (query.dateFrom) filter.dateFrom = new Date(query.dateFrom);
    if (query.dateTo) filter.dateTo = new Date(query.dateTo);
    if (query.countries) filter.countries = query.countries.split(',');
    if (query.osFamily) filter.osFamily = query.osFamily.split(',');
    if (query.partnerId) filter.partnerId = query.partnerId;
    if (query.campaignId) filter.campaignId = query.campaignId;

    // Get daily time series data (intervals handled by client-side aggregation)
    const timeSeriesData = await databaseService.conversions.getDailyTimeSeries(filter);

    return NextResponse.json({
      data: timeSeriesData.map(item => ({
        date: item.date,
        uniqueClicks: item.uniqueClicks,
        registrations: item.registrations,
        ftdCount: item.ftdCount,
        conversionRate: item.uniqueClicks > 0 ? (item.registrations / item.uniqueClicks) * 100 : 0,
        ftdRate: item.registrations > 0 ? (item.ftdCount / item.registrations) * 100 : 0,
      })),
      interval: query.interval,
      filters: filter,
    });

  } catch (error) {
    console.error('Time series API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
