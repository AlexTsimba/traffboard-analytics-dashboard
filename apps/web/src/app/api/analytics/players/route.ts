import { NextRequest, NextResponse } from 'next/server';
import { databaseService } from '@traffboard/database';
import { playersQuerySchema } from '@/lib/validations/analytics';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    const validation = playersQuerySchema.safeParse(
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

    const filter: any = {};
    if (query.dateFrom) filter.dateFrom = new Date(query.dateFrom);
    if (query.dateTo) filter.dateTo = new Date(query.dateTo);
    if (query.countries) filter.countries = query.countries.split(',');
    if (query.partnerId) filter.partnerId = query.partnerId;
    if (query.campaignId) filter.campaignId = query.campaignId;

    const [players, total] = await Promise.all([
      databaseService.players.findAll(filter, query.limit, offset),
      databaseService.players.count(filter),
    ]);

    return NextResponse.json({
      data: players,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
      filters: filter,
    });

  } catch (error) {
    console.error('Players API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
