import { NextRequest, NextResponse } from 'next/server';
import { databaseService } from '@traffboard/database';
import { qualityQuerySchema } from '@/lib/validations/analytics';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    const validation = qualityQuerySchema.safeParse(
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
    if (query.partnerId) filter.partnerId = query.partnerId;
    if (query.campaignId) filter.campaignId = query.campaignId;

    const playersData = await databaseService.players.findAll(filter, 1000, 0);
    
    // Calculate quality metrics
    const totalPlayers = playersData.length;
    const duplicateCount = playersData.filter(p => p.duplicate).length;
    const disabledCount = playersData.filter(p => p.disabled).length;
    const selfExcludedCount = playersData.filter(p => p.selfExcluded).length;
    const prequalifiedCount = playersData.filter(p => p.prequalified).length;
    
    const totalDepositsSum = playersData.reduce((sum, p) => sum + Number(p.depositsSum || 0), 0);
    const totalCashoutsSum = playersData.reduce((sum, p) => sum + Number(p.cashoutsSum || 0), 0);
    const totalCasinoNgr = playersData.reduce((sum, p) => sum + Number(p.casinoRealNgr || 0), 0);
    const totalCost = playersData.reduce((sum, p) => sum + Number(p.fixedPerPlayer || 0), 0);
    
    const playersWithDeposits = playersData.filter(p => Number(p.depositsCount || 0) > 0);
    const oneTimers = playersData.filter(p => Number(p.depositsCount || 0) === 1);

    return NextResponse.json({
      totalDepositsSum,
      totalCashoutsSum,
      totalCasinoNgr,
      roas: totalCost > 0 ? (totalCasinoNgr / totalCost) : 0,
      dep2Cost: totalCost > 0 ? (totalDepositsSum / totalCost) : 0,
      duplicateRate: totalPlayers > 0 ? (duplicateCount / totalPlayers) * 100 : 0,
      approvalRate: totalPlayers > 0 ? ((totalPlayers - duplicateCount - disabledCount - selfExcludedCount) / totalPlayers) * 100 : 0,
      averageDepositSum: playersWithDeposits.length > 0 ? totalDepositsSum / playersWithDeposits.length : 0,
      onetimersRate: totalPlayers > 0 ? (oneTimers.length / totalPlayers) * 100 : 0,
      prequalifiedCount,
      totalPlayers,
      filters: filter,
    });

  } catch (error) {
    console.error('Quality API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
