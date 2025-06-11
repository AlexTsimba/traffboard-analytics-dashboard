import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getHealthMetrics } from '@/lib/advanced-middleware';
import { databaseService } from '@traffboard/database';

// Health check response schema
const healthResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.string(),
  version: z.string(),
  environment: z.string(),
  uptime: z.number(),
  services: z.object({
    database: z.object({
      status: z.enum(['healthy', 'unhealthy']),
      responseTime: z.number().optional(),
      error: z.string().optional(),
    }),
    cache: z.object({
      status: z.enum(['healthy', 'degraded', 'unhealthy']),
      hitRate: z.number(),
      hits: z.number(),
      misses: z.number(),
    }),
    memory: z.object({
      status: z.enum(['healthy', 'warning', 'critical']),
      usage: z.object({
        rss: z.number(),
        heapTotal: z.number(),
        heapUsed: z.number(),
        external: z.number(),
        arrayBuffers: z.number(),
      }),
      usagePercent: z.number(),
    }),
  }),
  performance: z.object({
    averageResponseTime: z.number(),
    errorRate: z.number(),
    recentRequests: z.number(),
    slowestPaths: z.array(z.object({
      path: z.string(),
      avgDuration: z.number(),
      count: z.number(),
    })),
  }),
  checks: z.array(z.object({
    name: z.string(),
    status: z.enum(['pass', 'fail', 'warn']),
    message: z.string().optional(),
    duration: z.number().optional(),
  })),
});

// Health check handler function
async function healthCheck(): Promise<z.infer<typeof healthResponseSchema>> {
    const startTime = Date.now();
    const checks: Array<{ name: string; status: 'pass' | 'fail' | 'warn'; message?: string; duration?: number }> = [];

    // Database health check
    let dbStatus: 'healthy' | 'unhealthy' = 'healthy';
    let dbResponseTime: number | undefined;
    let dbError: string | undefined;

    try {
      const dbStartTime = Date.now();
      await databaseService.testConnection();
      dbResponseTime = Date.now() - dbStartTime;
      
      checks.push({
        name: 'database_connection',
        status: 'pass',
        duration: dbResponseTime,
      });
    } catch (error) {
      dbStatus = 'unhealthy';
      dbError = error instanceof Error ? error.message : 'Unknown database error';
      
      checks.push({
        name: 'database_connection',
        status: 'fail',
        message: dbError,
        duration: Date.now() - startTime,
      });
    }

    // Get system metrics
    const metrics = getHealthMetrics();
    
    // Memory status assessment
    const memoryUsagePercent = (metrics.memory.heapUsed / metrics.memory.heapTotal) * 100;
    let memoryStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (memoryUsagePercent > 90) {
      memoryStatus = 'critical';
      checks.push({
        name: 'memory_usage',
        status: 'fail',
        message: `Memory usage critical: ${memoryUsagePercent.toFixed(1)}%`,
      });
    } else if (memoryUsagePercent > 75) {
      memoryStatus = 'warning';
      checks.push({
        name: 'memory_usage',
        status: 'warn',
        message: `Memory usage high: ${memoryUsagePercent.toFixed(1)}%`,
      });
    } else {
      checks.push({
        name: 'memory_usage',
        status: 'pass',
      });
    }

    // Cache health assessment
    let cacheStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (metrics.cache.hitRate < 30) {
      cacheStatus = 'unhealthy';
      checks.push({
        name: 'cache_performance',
        status: 'fail',
        message: `Cache hit rate too low: ${metrics.cache.hitRate}%`,
      });
    } else if (metrics.cache.hitRate < 60) {
      cacheStatus = 'degraded';
      checks.push({
        name: 'cache_performance',
        status: 'warn',
        message: `Cache hit rate suboptimal: ${metrics.cache.hitRate}%`,
      });
    } else {
      checks.push({
        name: 'cache_performance',
        status: 'pass',
      });
    }

    // Performance checks
    if (metrics.requests.errorRate > 5) {
      checks.push({
        name: 'error_rate',
        status: 'fail',
        message: `Error rate too high: ${metrics.requests.errorRate}%`,
      });
    } else if (metrics.requests.errorRate > 2) {
      checks.push({
        name: 'error_rate',
        status: 'warn',
        message: `Error rate elevated: ${metrics.requests.errorRate}%`,
      });
    } else {
      checks.push({
        name: 'error_rate',
        status: 'pass',
      });
    }

    if (metrics.requests.averageResponseTime > 2000) {
      checks.push({
        name: 'response_time',
        status: 'fail',
        message: `Response time too slow: ${metrics.requests.averageResponseTime}ms`,
      });
    } else if (metrics.requests.averageResponseTime > 1000) {
      checks.push({
        name: 'response_time',
        status: 'warn',
        message: `Response time elevated: ${metrics.requests.averageResponseTime}ms`,
      });
    } else {
      checks.push({
        name: 'response_time',
        status: 'pass',
      });
    }

    // Overall status determination
    const hasFailures = checks.some(check => check.status === 'fail');
    const hasWarnings = checks.some(check => check.status === 'warn');
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (hasFailures) {
      overallStatus = 'unhealthy';
    } else if (hasWarnings) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: metrics.uptime,
      services: {
        database: {
          status: dbStatus,
          responseTime: dbResponseTime,
          error: dbError,
        },
        cache: {
          status: cacheStatus,
          hitRate: metrics.cache.hitRate,
          hits: metrics.cache.hits,
          misses: metrics.cache.misses,
        },
        memory: {
          status: memoryStatus,
          usage: metrics.memory,
          usagePercent: Math.round(memoryUsagePercent * 100) / 100,
        },
      },
      performance: {
        averageResponseTime: Math.round(metrics.requests.averageResponseTime * 100) / 100,
        errorRate: Math.round(metrics.requests.errorRate * 100) / 100,
        recentRequests: metrics.requests.recent,
        slowestPaths: metrics.performance.slowestPaths,
      },
      checks,
    };
}

export async function GET(): Promise<NextResponse> {
  try {
    const healthData = await healthCheck();
    
    // Validate the response against our schema
    const validatedData = healthResponseSchema.parse(healthData);
    
    return NextResponse.json(validatedData, {
      status: healthData.status === 'unhealthy' ? 503 : 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Disable caching for health checks to get real-time status
export const dynamic = 'force-dynamic';
export const revalidate = 0;
