import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { cache } from './logger';

/**
 * Advanced cache management utilities for analytics dashboard
 * Provides sophisticated ISR caching with performance optimizations
 */

// Enhanced cache tags for granular invalidation
export const CACHE_TAGS = {
  // Data-level tags
  ANALYTICS_OVERVIEW: 'analytics-overview',
  CONVERSIONS: 'conversions',
  PLAYERS: 'players',
  DASHBOARD: 'dashboard',
  
  // Time-based tags
  DAILY_METRICS: 'daily-metrics',
  WEEKLY_METRICS: 'weekly-metrics',
  MONTHLY_METRICS: 'monthly-metrics',
  
  // User-specific tags
  USER_PREFERENCES: 'user-preferences',
  USER_FILTERS: 'user-filters',
  
  // Partner-specific tags
  PARTNER_DATA: 'partner-data',
  CAMPAIGN_DATA: 'campaign-data',
  
  // Import-related tags
  IMPORT_STATUS: 'import-status',
  DATA_FRESHNESS: 'data-freshness',
} as const;

// Cache configuration profiles
export const CACHE_PROFILES = {
  // Real-time data (1 minute cache)
  REAL_TIME: {
    revalidate: 60,
    staleWhileRevalidate: 30,
    tags: [CACHE_TAGS.DATA_FRESHNESS],
  },
  
  // Fast refresh data (5 minutes cache)
  FAST: {
    revalidate: 300,
    staleWhileRevalidate: 150,
    tags: [CACHE_TAGS.DASHBOARD],
  },
  
  // Standard analytics data (15 minutes cache)
  STANDARD: {
    revalidate: 900,
    staleWhileRevalidate: 450,
    tags: [CACHE_TAGS.ANALYTICS_OVERVIEW],
  },
  
  // Slow-changing data (1 hour cache)
  SLOW: {
    revalidate: 3600,
    staleWhileRevalidate: 1800,
    tags: [CACHE_TAGS.USER_PREFERENCES],
  },
  
  // Static-like data (6 hours cache)
  STATIC: {
    revalidate: 21600,
    staleWhileRevalidate: 10800,
    tags: [CACHE_TAGS.PARTNER_DATA],
  },
} as const;

// Cache paths for different dashboard sections
export const CACHE_PATHS = {
  DASHBOARD: '/dashboard',
  CONVERSIONS: '/dashboard/conversions',
  PLAYERS: '/dashboard/players',
  QUALITY: '/dashboard/quality',
  COHORTS: '/dashboard/cohorts',
  OVERVIEW: '/dashboard/overview',
} as const;

/**
 * Enhanced cache configuration builder
 */
export class CacheConfigBuilder {
  static forRoute(
    route: 'overview' | 'conversions' | 'players' | 'quality' | 'cohorts',
    options: {
      userSpecific?: boolean;
      partnerSpecific?: boolean;
      timeRange?: 'daily' | 'weekly' | 'monthly';
      freshness?: 'real-time' | 'fast' | 'standard' | 'slow' | 'static';
    } = {}
  ) {
    const { userSpecific, partnerSpecific, timeRange, freshness = 'standard' } = options;
    
    const baseConfig = CACHE_PROFILES[freshness.toUpperCase() as keyof typeof CACHE_PROFILES];
    const tags: string[] = [...baseConfig.tags];
    
    // Add route-specific tags
    switch (route) {
      case 'overview':
        tags.push(CACHE_TAGS.ANALYTICS_OVERVIEW, CACHE_TAGS.DASHBOARD);
        break;
      case 'conversions':
        tags.push(CACHE_TAGS.CONVERSIONS, CACHE_TAGS.DASHBOARD);
        break;
      case 'players':
        tags.push(CACHE_TAGS.PLAYERS, CACHE_TAGS.DASHBOARD);
        break;
      case 'quality':
        tags.push(CACHE_TAGS.PLAYERS, CACHE_TAGS.CONVERSIONS, CACHE_TAGS.DASHBOARD);
        break;
      case 'cohorts':
        tags.push(CACHE_TAGS.PLAYERS, CACHE_TAGS.DASHBOARD);
        break;
    }
    
    // Add time-based tags
    if (timeRange) {
      switch (timeRange) {
        case 'daily':
          tags.push(CACHE_TAGS.DAILY_METRICS);
          break;
        case 'weekly':
          tags.push(CACHE_TAGS.WEEKLY_METRICS);
          break;
        case 'monthly':
          tags.push(CACHE_TAGS.MONTHLY_METRICS);
          break;
      }
    }
    
    // Add user-specific tags
    if (userSpecific) {
      tags.push(CACHE_TAGS.USER_PREFERENCES, CACHE_TAGS.USER_FILTERS);
    }
    
    // Add partner-specific tags
    if (partnerSpecific) {
      tags.push(CACHE_TAGS.PARTNER_DATA, CACHE_TAGS.CAMPAIGN_DATA);
    }
    
    return {
      ...baseConfig,
      tags: [...new Set(tags)], // Remove duplicates
    };
  }

  static withCustomTags(baseProfile: keyof typeof CACHE_PROFILES, additionalTags: string[]) {
    const baseConfig = CACHE_PROFILES[baseProfile];
    return {
      ...baseConfig,
      tags: [...baseConfig.tags, ...additionalTags],
    };
  }
}

/**
 * Smart cache headers for API responses
 */
export function setCacheHeaders(
  response: NextResponse,
  config: {
    revalidate: number;
    staleWhileRevalidate: number;
    tags: string[];
    private?: boolean;
    mustRevalidate?: boolean;
  }
): NextResponse {
  const { revalidate, staleWhileRevalidate, tags, private: isPrivate, mustRevalidate } = config;
  
  // Set cache control headers
  const cacheControl = [
    isPrivate ? 'private' : 'public',
    `s-maxage=${revalidate}`,
    `stale-while-revalidate=${staleWhileRevalidate}`,
    mustRevalidate ? 'must-revalidate' : '',
  ].filter(Boolean).join(', ');
  
  response.headers.set('Cache-Control', cacheControl);
  response.headers.set('CDN-Cache-Control', `public, s-maxage=${revalidate}`);
  response.headers.set('Cache-Tag', tags.join(','));
  response.headers.set('X-Cache-Config', JSON.stringify({ revalidate, staleWhileRevalidate }));
  
  return response;
}

/**
 * Cache invalidation strategies
 */
export class CacheInvalidationManager {
  private static instance: CacheInvalidationManager;
  
  static getInstance(): CacheInvalidationManager {
    if (!CacheInvalidationManager.instance) {
      CacheInvalidationManager.instance = new CacheInvalidationManager();
    }
    return CacheInvalidationManager.instance;
  }

  /**
   * Invalidate cache after data import
   */
  async invalidateAfterImport(dataType: 'conversions' | 'players', importSize: number): Promise<void> {
    try {
      const tags = [];
      
      // Always invalidate dashboard
      tags.push(CACHE_TAGS.DASHBOARD, CACHE_TAGS.DATA_FRESHNESS);
      
      // Add data-specific tags
      if (dataType === 'conversions') {
        tags.push(CACHE_TAGS.CONVERSIONS, CACHE_TAGS.ANALYTICS_OVERVIEW);
      } else {
        tags.push(CACHE_TAGS.PLAYERS, CACHE_TAGS.ANALYTICS_OVERVIEW);
      }
      
      // For large imports, invalidate more aggressively
      if (importSize > 1000) {
        tags.push(
          CACHE_TAGS.DAILY_METRICS,
          CACHE_TAGS.WEEKLY_METRICS,
          CACHE_TAGS.MONTHLY_METRICS
        );
      }
      
      // Invalidate tags
      for (const tag of tags) {
        revalidateTag(tag);
      }
      
      // Invalidate specific paths
      revalidatePath(CACHE_PATHS.DASHBOARD);
      revalidatePath(CACHE_PATHS.OVERVIEW);
      
      cache('invalidate', dataType, { importSize, tags });
    } catch (error) {
      cache('error', 'invalidateAfterImport', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * Invalidate user-specific cache
   */
  async invalidateUserCache(userId: string): Promise<void> {
    try {
      revalidateTag(CACHE_TAGS.USER_PREFERENCES);
      revalidateTag(CACHE_TAGS.USER_FILTERS);
      revalidatePath(CACHE_PATHS.DASHBOARD);
      
      cache('invalidate', 'user-cache', { userId });
    } catch (error) {
      cache('error', 'invalidateUserCache', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * Invalidate partner-specific cache
   */
  async invalidatePartnerCache(partnerId: number): Promise<void> {
    try {
      revalidateTag(CACHE_TAGS.PARTNER_DATA);
      revalidateTag(CACHE_TAGS.CAMPAIGN_DATA);
      revalidateTag(CACHE_TAGS.ANALYTICS_OVERVIEW);
      
      cache('invalidate', 'partner-cache', { partnerId });
    } catch (error) {
      cache('error', 'invalidatePartnerCache', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * Scheduled cache warming for critical paths
   */
  async warmCriticalPaths(): Promise<void> {
    try {
      const criticalPaths = [
        CACHE_PATHS.DASHBOARD,
        CACHE_PATHS.OVERVIEW,
        CACHE_PATHS.CONVERSIONS,
        CACHE_PATHS.PLAYERS,
      ];

      for (const path of criticalPaths) {
        revalidatePath(path);
      }

      cache('set', 'critical-paths-warmed');
    } catch (error) {
      cache('error', 'warmCriticalPaths', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * Emergency cache purge
   */
  async emergencyPurge(): Promise<void> {
    try {
      // Invalidate all cache tags
      Object.values(CACHE_TAGS).forEach(tag => {
        revalidateTag(tag);
      });

      // Invalidate all paths
      Object.values(CACHE_PATHS).forEach(path => {
        revalidatePath(path);
      });

      cache('clear', 'emergency-purge-completed');
    } catch (error) {
      cache('error', 'emergencyPurge', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
}

/**
 * Cache performance monitoring
 */
export class CacheMonitor {
  private static hitCount = 0;
  private static missCount = 0;
  private static errorCount = 0;

  static recordHit(): void {
    this.hitCount++;
  }

  static recordMiss(): void {
    this.missCount++;
  }

  static recordError(): void {
    this.errorCount++;
  }

  static getStats(): { hits: number; misses: number; errors: number; hitRate: number } {
    const total = this.hitCount + this.missCount;
    const hitRate = total > 0 ? (this.hitCount / total) * 100 : 0;

    return {
      hits: this.hitCount,
      misses: this.missCount,
      errors: this.errorCount,
      hitRate: Math.round(hitRate * 100) / 100,
    };
  }

  static reset(): void {
    this.hitCount = 0;
    this.missCount = 0;
    this.errorCount = 0;
  }
}

/**
 * Cache middleware for API routes
 */
export function withCache(
  handler: (request: NextRequest) => Promise<NextResponse>,
  cacheConfig: {
    profile: keyof typeof CACHE_PROFILES;
    additionalTags?: string[];
    private?: boolean;
    mustRevalidate?: boolean;
  }
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const response = await handler(request);
      
      // Only cache successful responses
      if (response.status === 200) {
        const config = CACHE_PROFILES[cacheConfig.profile];
        const tags = [...config.tags, ...(cacheConfig.additionalTags || [])];
        
        setCacheHeaders(response, {
          revalidate: config.revalidate,
          staleWhileRevalidate: config.staleWhileRevalidate,
          tags,
          private: cacheConfig.private,
          mustRevalidate: cacheConfig.mustRevalidate,
        });

        CacheMonitor.recordHit();
      } else {
        CacheMonitor.recordMiss();
      }

      return response;
    } catch (error) {
      CacheMonitor.recordError();
      throw error;
    }
  };
}

/**
 * Revalidation utilities for specific use cases
 */
export const revalidateAnalyticsOverview = async (): Promise<void> => {
  try {
    revalidateTag(CACHE_TAGS.ANALYTICS_OVERVIEW);
    revalidatePath(CACHE_PATHS.DASHBOARD);
    cache('invalidate', 'analytics-overview');
  } catch (error) {
    cache('error', 'revalidateAnalyticsOverview', { error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const revalidateConversions = async (): Promise<void> => {
  try {
    revalidateTag(CACHE_TAGS.CONVERSIONS);
    revalidatePath(CACHE_PATHS.CONVERSIONS);
    cache('invalidate', 'conversions');
  } catch (error) {
    cache('error', 'revalidateConversions', { error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const revalidatePlayers = async (): Promise<void> => {
  try {
    revalidateTag(CACHE_TAGS.PLAYERS);
    revalidatePath(CACHE_PATHS.PLAYERS);
    cache('invalidate', 'players');
  } catch (error) {
    cache('error', 'revalidatePlayers', { error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const revalidateAllDashboard = async (): Promise<void> => {
  try {
    await Promise.all([
      revalidateAnalyticsOverview(),
      revalidateConversions(),
      revalidatePlayers(),
    ]);
    
    revalidateTag(CACHE_TAGS.DASHBOARD);
    revalidatePath(CACHE_PATHS.DASHBOARD);
    
    cache('invalidate', 'all-dashboard');
  } catch (error) {
    cache('error', 'revalidateAllDashboard', { error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

/**
 * Legacy compatibility - keep existing function names
 */
export const getCacheConfig = (dataType: 'overview' | 'conversions' | 'players') => {
  return CacheConfigBuilder.forRoute(dataType);
};
