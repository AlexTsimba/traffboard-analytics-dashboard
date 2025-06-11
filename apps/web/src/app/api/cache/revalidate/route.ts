import { NextRequest, NextResponse } from 'next/server';
import { 
  revalidateAnalyticsOverview, 
  revalidateConversions, 
  revalidatePlayers, 
  revalidateAllDashboard 
} from '@/lib/cache';
import { info, error, api } from '@/lib/logger';

/**
 * API route for on-demand cache revalidation
 * POST /api/cache/revalidate
 * 
 * Body: { type: 'overview' | 'conversions' | 'players' | 'all' }
 * 
 * This endpoint allows manual cache invalidation when:
 * - New data is imported via CSV
 * - Data processing jobs complete
 * - Manual cache refresh is needed
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Authentication check
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    
    if (!userId || userRole !== 'admin') {
      api('POST', '/api/cache/revalidate', 401, Date.now() - startTime);
      return NextResponse.json({ 
        error: 'Unauthorized - Admin access required' 
      }, { status: 401 });
    }

    const body = await request.json();
    const { type } = body;

    if (!type || !['overview', 'conversions', 'players', 'all'].includes(type)) {
      api('POST', '/api/cache/revalidate', 400, Date.now() - startTime);
      return NextResponse.json({ 
        error: 'Invalid type. Must be one of: overview, conversions, players, all' 
      }, { status: 400 });
    }

    let revalidatedPaths: string[] = [];

    switch (type) {
      case 'overview':
        await revalidateAnalyticsOverview();
        revalidatedPaths = ['/dashboard'];
        break;
        
      case 'conversions':
        await revalidateConversions();
        revalidatedPaths = ['/dashboard/conversions'];
        break;
        
      case 'players':
        await revalidatePlayers();
        revalidatedPaths = ['/dashboard/players'];
        break;
        
      case 'all':
        await revalidateAllDashboard();
        revalidatedPaths = ['/dashboard', '/dashboard/conversions', '/dashboard/players'];
        break;
    }

    info('Cache revalidation completed', { type, revalidatedPaths, userId });
    api('POST', '/api/cache/revalidate', 200, Date.now() - startTime);

    return NextResponse.json({
      message: `Cache revalidated successfully for type: ${type}`,
      revalidatedPaths,
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    error('Cache revalidation error', { type: 'cache_revalidation' }, err instanceof Error ? err : new Error(String(err)));
    api('POST', '/api/cache/revalidate', 500, Date.now() - startTime);
    return NextResponse.json({ 
      error: 'Cache revalidation failed',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET endpoint to check cache status
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      api('GET', '/api/cache/revalidate', 401, Date.now() - startTime);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    api('GET', '/api/cache/revalidate', 200, Date.now() - startTime);
    return NextResponse.json({
      cacheStatus: 'active',
      revalidationEndpoint: '/api/cache/revalidate',
      supportedTypes: ['overview', 'conversions', 'players', 'all'],
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    error('Cache status check error', {}, err instanceof Error ? err : new Error(String(err)));
    api('GET', '/api/cache/revalidate', 500, Date.now() - startTime);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
