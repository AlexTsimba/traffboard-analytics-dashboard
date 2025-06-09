import { NextRequest, NextResponse } from 'next/server';
import { databaseService } from '@traffboard/database';
import { conversionsQuerySchema } from '@/lib/validations/analytics';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Validate query parameters
    const validation = conversionsQuerySchema.safeParse(
      Object.fromEntries(searchParams.entries())
    );
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid parameters', 
        details: validation.error.issues 
      }, { status: 400 });
    }

    const query = validation.data;
    const offset = (query.page - 1) * query.limit;

    // Build enhanced filter
    const filter: any = {};
    if (query.dateFrom) filter.dateFrom = new Date(query.dateFrom);
    if (query.dateTo) filter.dateTo = new Date(query.dateTo);
    if (query.countries) filter.countries = query.countries.split(',');
    if (query.osFamily) filter.osFamily = query.osFamily.split(',');
    if (query.partnerId) filter.partnerId = query.partnerId;
    if (query.campaignId) filter.campaignId = query.campaignId;
    if (query.landingId) filter.landingId = query.landingId;

    const [conversions, aggregates, total] = await Promise.all([
      databaseService.conversions.findAll(filter, query.limit, offset),
      databaseService.conversions.getAggregates(filter),
      databaseService.conversions.count(filter),
    ]);

    return NextResponse.json({
      data: conversions,
      aggregates,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
      filters: filter,
    });

  } catch (error) {
    console.error('Conversions API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
