import { NextRequest, NextResponse } from 'next/server';
import { CacheMonitor } from '@/lib/cache';
import { debug, warn, error } from '@/lib/logger';

/**
 * Advanced middleware utilities for enhanced security and performance
 * Extends the base middleware with additional features
 */

// Bot detection patterns
const BOT_USER_AGENTS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /scraper/i,
  /curl/i,
  /wget/i,
  /python/i,
  /php/i,
  /node/i,
  /java/i,
  /go-http/i,
  /postman/i,
  /insomnia/i,
];

// Suspicious request patterns
const SUSPICIOUS_PATTERNS = {
  sqlInjection: [
    /('|(\\')|(;|\\;)|(\||\\\|)|(\*|\\\*))/i,
    /(union|select|insert|update|delete|drop|create|alter)/i,
    /(script|javascript|vbscript|onload|onerror)/i,
  ],
  xss: [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe[^>]*>.*?<\/iframe>/gi,
  ],
  pathTraversal: [
    /\.\.\//,
    /\.\.\\]/,
    /%2e%2e%2f/i,
    /%2e%2e%5c/i,
  ],
};

// Geolocation-based restrictions can be added here if needed
// const RESTRICTED_COUNTRIES = ['CN', 'RU', etc.];

// Request monitoring store
interface RequestMetrics {
  timestamp: number;
  method: string;
  path: string;
  userAgent: string;
  ip: string;
  responseTime?: number;
  status?: number;
  errorType?: string;
}

class RequestMonitor {
  private static metrics: RequestMetrics[] = [];
  private static readonly MAX_METRICS = 1000;

  static addMetric(metric: RequestMetrics): void {
    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }
  }

  static getRecentMetrics(minutes: number = 10): RequestMetrics[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.metrics.filter(metric => metric.timestamp > cutoff);
  }

  static getAverageResponseTime(minutes: number = 10): number {
    const recent = this.getRecentMetrics(minutes);
    const withResponseTime = recent.filter(m => m.responseTime);
    
    if (withResponseTime.length === 0) return 0;
    
    const total = withResponseTime.reduce((sum, m) => sum + (m.responseTime || 0), 0);
    return total / withResponseTime.length;
  }

  static getErrorRate(minutes: number = 10): number {
    const recent = this.getRecentMetrics(minutes);
    if (recent.length === 0) return 0;
    
    const errors = recent.filter(m => m.status && m.status >= 400);
    return (errors.length / recent.length) * 100;
  }
}

/**
 * Security scanner for detecting malicious requests
 */
export class SecurityScanner {
  static scanRequest(request: NextRequest): {
    isMalicious: boolean;
    threats: string[];
    riskLevel: 'low' | 'medium' | 'high';
  } {
    const threats: string[] = [];
    const url = request.nextUrl.pathname + request.nextUrl.search;
    const userAgent = request.headers.get('user-agent') || '';
    
    // Check for SQL injection patterns
    for (const pattern of SUSPICIOUS_PATTERNS.sqlInjection) {
      if (pattern.test(url) || pattern.test(userAgent)) {
        threats.push('SQL_INJECTION');
        break;
      }
    }
    
    // Check for XSS patterns
    for (const pattern of SUSPICIOUS_PATTERNS.xss) {
      if (pattern.test(url) || pattern.test(userAgent)) {
        threats.push('XSS');
        break;
      }
    }
    
    // Check for path traversal
    for (const pattern of SUSPICIOUS_PATTERNS.pathTraversal) {
      if (pattern.test(url)) {
        threats.push('PATH_TRAVERSAL');
        break;
      }
    }
    
    // Check for bot traffic
    for (const pattern of BOT_USER_AGENTS) {
      if (pattern.test(userAgent)) {
        threats.push('BOT_TRAFFIC');
        break;
      }
    }
    
    // Check for suspicious headers
    const referer = request.headers.get('referer');
    if (referer && !referer.includes(request.nextUrl.hostname)) {
      threats.push('SUSPICIOUS_REFERER');
    }
    
    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (threats.includes('SQL_INJECTION') || threats.includes('XSS') || threats.includes('PATH_TRAVERSAL')) {
      riskLevel = 'high';
    } else if (threats.length > 1) {
      riskLevel = 'medium';
    }
    
    return {
      isMalicious: threats.length > 0 && riskLevel !== 'low',
      threats,
      riskLevel,
    };
  }
}

/**
 * Performance monitor for request optimization
 */
export class PerformanceMonitor {
  private static slowRequests: Array<{ path: string; duration: number; timestamp: number }> = [];
  
  static recordSlowRequest(path: string, duration: number): void {
    this.slowRequests.push({
      path,
      duration,
      timestamp: Date.now(),
    });
    
    // Keep only recent slow requests
    const cutoff = Date.now() - (60 * 60 * 1000); // 1 hour
    this.slowRequests = this.slowRequests.filter(req => req.timestamp > cutoff);
  }
  
  static getSlowestPaths(limit: number = 10): Array<{ path: string; avgDuration: number; count: number }> {
    const pathStats = new Map<string, { total: number; count: number }>();
    
    this.slowRequests.forEach(req => {
      const existing = pathStats.get(req.path) || { total: 0, count: 0 };
      pathStats.set(req.path, {
        total: existing.total + req.duration,
        count: existing.count + 1,
      });
    });
    
    return Array.from(pathStats.entries())
      .map(([path, stats]) => ({
        path,
        avgDuration: stats.total / stats.count,
        count: stats.count,
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, limit);
  }
}

/**
 * Enhanced rate limiting with sliding window
 */
export class SlidingWindowRateLimit {
  private static windows = new Map<string, number[]>();
  
  static isRateLimited(
    key: string,
    windowMs: number,
    maxRequests: number
  ): { limited: boolean; resetTime: number; remaining: number } {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Get or create window for this key
    let window = this.windows.get(key) || [];
    
    // Remove old timestamps
    window = window.filter(timestamp => timestamp > windowStart);
    
    // Add current request
    window.push(now);
    
    // Update the window
    this.windows.set(key, window);
    
    const remaining = Math.max(0, maxRequests - window.length);
    const resetTime = now + windowMs;
    
    return {
      limited: window.length > maxRequests,
      resetTime,
      remaining,
    };
  }
  
  static cleanup(): void {
    const cutoff = Date.now() - (60 * 60 * 1000); // 1 hour
    
    for (const [key, window] of this.windows.entries()) {
      const filtered = window.filter(timestamp => timestamp > cutoff);
      
      if (filtered.length === 0) {
        this.windows.delete(key);
      } else {
        this.windows.set(key, filtered);
      }
    }
  }
}

/**
 * Request context builder for enhanced logging
 */
export function buildRequestContext(request: NextRequest): {
  requestId: string;
  ip: string;
  userAgent: string;
  method: string;
  path: string;
  referer?: string;
  timestamp: number;
} {
  const requestId = crypto.randomUUID();
  
  return {
    requestId,
    ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 
        request.headers.get('x-real-ip') || 
        'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    method: request.method,
    path: request.nextUrl.pathname,
    referer: request.headers.get('referer') || undefined,
    timestamp: Date.now(),
  };
}

/**
 * Enhanced security headers
 */
export function setAdvancedSecurityHeaders(response: NextResponse): NextResponse {
  // Existing security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Enhanced CSP
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "connect-src 'self' https:",
    "font-src 'self' https:",
    "object-src 'none'",
    "media-src 'self'",
    "frame-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', csp);
  
  // Additional security headers
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  
  // Prevent information disclosure
  response.headers.set('Server', '');
  response.headers.set('X-Powered-By', '');
  
  return response;
}

/**
 * Request logger with enhanced context
 */
export function logRequest(
  context: ReturnType<typeof buildRequestContext>,
  response?: { status: number; responseTime?: number }
): void {
  const logData = {
    ...context,
    ...response,
    level: response?.status && response.status >= 400 ? 'error' : 'info',
  };
  
  // Add to request monitor
  RequestMonitor.addMetric({
    timestamp: context.timestamp,
    method: context.method,
    path: context.path,
    userAgent: context.userAgent,
    ip: context.ip,
    responseTime: response?.responseTime,
    status: response?.status,
  });
  
  // Log based on status
  if (response?.status && response.status >= 500) {
    error('Server error occurred', logData);
  } else if (response?.status && response.status >= 400) {
    warn('Client error occurred', logData);
  } else {
    debug('Request processed', logData);
  }
}

/**
 * Health check endpoint data
 */
export function getHealthMetrics(): {
  uptime: number;
  memory: NodeJS.MemoryUsage;
  cache: { hits: number; misses: number; hitRate: number };
  requests: {
    recent: number;
    averageResponseTime: number;
    errorRate: number;
  };
  performance: {
    slowestPaths: Array<{ path: string; avgDuration: number; count: number }>;
  };
} {
  const cacheStats = CacheMonitor.getStats();
  const recentRequests = RequestMonitor.getRecentMetrics(10);
  
  return {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cache: {
      hits: cacheStats.hits,
      misses: cacheStats.misses,
      hitRate: cacheStats.hitRate,
    },
    requests: {
      recent: recentRequests.length,
      averageResponseTime: RequestMonitor.getAverageResponseTime(),
      errorRate: RequestMonitor.getErrorRate(),
    },
    performance: {
      slowestPaths: PerformanceMonitor.getSlowestPaths(),
    },
  };
}

/**
 * Request validation utilities
 */
export function validateRequestSize(request: NextRequest, maxSizeBytes: number): boolean {
  const contentLength = request.headers.get('content-length');
  if (!contentLength) return true; // Can't validate without content-length
  
  return parseInt(contentLength) <= maxSizeBytes;
}

export function validateRequestMethod(request: NextRequest, allowedMethods: string[]): boolean {
  return allowedMethods.includes(request.method.toUpperCase());
}

export function validateOrigin(request: NextRequest, allowedOrigins: string[]): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true; // No origin header (direct requests)
  
  return allowedOrigins.some(allowed => 
    allowed === '*' || origin === allowed || origin.endsWith(`.${allowed}`)
  );
}

/**
 * Cleanup function for periodic maintenance
 */
export function runMaintenanceTasks(): void {
  // Clean up rate limiting windows
  SlidingWindowRateLimit.cleanup();
  
  // Reset cache monitor if needed
  const cacheStats = CacheMonitor.getStats();
  if (cacheStats.hits + cacheStats.misses > 10000) {
    CacheMonitor.reset();
  }
  
  debug('Maintenance tasks completed', {
    cacheHits: cacheStats.hits,
    cacheMisses: cacheStats.misses,
    cacheReset: cacheStats.hits + cacheStats.misses > 10000
  });
}

// Schedule maintenance tasks every hour
if (typeof process !== 'undefined') {
  setInterval(runMaintenanceTasks, 60 * 60 * 1000);
}
