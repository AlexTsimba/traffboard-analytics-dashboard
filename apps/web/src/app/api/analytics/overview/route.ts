import { NextRequest, NextResponse } from 'next/server';
import { databaseService } from '@traffboard/database';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [conversionsData, playersCount] = await Promise.all([
      databaseService.conversions.getAggregates(),
      databaseService.players.count(),
    ]);

    return NextResponse.json({
      totalClicks: conversionsData.totalUniqueClicks,
      totalRegistrations: conversionsData.totalRegistrations,
      totalFtdCount: conversionsData.totalFtdCount,
      totalPlayers: playersCount,
      conversionRate: conversionsData.conversionRate,
      ftdRate: conversionsData.ftdRate,
    });

  } catch (error) {
    console.error('Analytics overview error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
