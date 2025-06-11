import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@traffboard/auth';
import { databaseService } from '@traffboard/database';

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  apiRoutes: { requests: 100, windowMs: 60000 }, // 100 requests per minute for API
  serverActions: { requests: 30, windowMs: 60000 }, // 30 requests per minute for Server Actions
  auth: { requests: 5, windowMs: 300000 }, // 5 attempts per 5 minutes for auth
};

// Request size limits (in bytes)
const MAX_REQUEST_SIZE = {
  default: 1024 * 1024, // 1MB
  fileUpload: 2 * 1024 * 1024, // 2MB for file uploads
  api: 512 * 1024, // 512KB for API requests
};

// Protected routes that require authentication
const PROTECTED_ROUTES = [
  '/dashboard',
  '/api/conversions',
  '/api/players', 
  '/api/analytics',
  '/api/settings',
];

// Admin-only routes
const ADMIN_ROUTES = [
  '/api/admin',
  '/admin',
  '/api/users',
];

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/api/auth',
  '/api/health',
];

// Authentication-related routes for stricter rate limiting
const AUTH_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
];

// File upload routes for larger size limits
const FILE_UPLOAD_ROUTES = [
  '/api/import/csv',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const clientIP = getClientIP(request);
  
  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') && !pathname.includes('/api/')
  ) {
    return NextResponse.next();
  }

  // Apply rate limiting
  const rateLimitResult = checkRateLimit(clientIP, pathname);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { 
        status: 429,
        headers: {
          'Retry-After': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
        }
      }
    );
  }

  // Apply request size limits
  const sizeLimit = getRequestSizeLimit(pathname);
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > sizeLimit) {
    return NextResponse.json(
      { error: `Request too large. Maximum size: ${Math.round(sizeLimit / 1024)}KB` },
      { status: 413 }
    );
  }

  // Check if route is protected
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  const isAdminRoute = ADMIN_ROUTES.some(route => pathname.startsWith(route));
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));

  // Allow public routes
  if (isPublicRoute && !isProtectedRoute && !isAdminRoute) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Get access token from cookies
  const accessToken = request.cookies.get('access_token')?.value;
  
  if (!accessToken) {
    return redirectToLogin(request);
  }

  // Verify access token
  const payload = verifyAccessToken(accessToken);
  if (!payload) {
    return redirectToLogin(request);
  }

  // Get session from database
  const sessionId = request.cookies.get('session_id')?.value;
  if (!sessionId) {
    return redirectToLogin(request);
  }

  try {
    const session = await databaseService.sessions.getSession(sessionId);
    if (!session || session.userId !== payload.userId) {
      return redirectToLogin(request);
    }

    // Get user for role information
    const user = await databaseService.users.findById(payload.userId);
    if (!user) {
      return redirectToLogin(request);
    }

    // Check admin access for admin routes
    if (isAdminRoute) {
      if (user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Forbidden: Admin access required' }, 
          { status: 403 }
        );
      }
    }

    // Add user info to headers for API routes and Server Actions
    const response = NextResponse.next();
    response.headers.set('x-user-id', payload.userId.toString());
    response.headers.set('x-user-role', user.role || 'user');
    
    return addSecurityHeaders(response);
  } catch (error) {
    console.error('Session verification failed:', error);
    return redirectToLogin(request);
  }
}

// Rate limiting implementation
function checkRateLimit(clientIP: string, pathname: string): {
  allowed: boolean;
  limit: number;
  resetTime: number;
} {
  const now = Date.now();
  let config = RATE_LIMIT_CONFIG.apiRoutes;

  // Determine rate limit config based on route
  if (AUTH_ROUTES.some(route => pathname.startsWith(route))) {
    config = RATE_LIMIT_CONFIG.auth;
  } else if (pathname.startsWith('/api/')) {
    config = RATE_LIMIT_CONFIG.apiRoutes;
  } else {
    config = RATE_LIMIT_CONFIG.serverActions;
  }

  const key = `${clientIP}:${pathname.startsWith('/api/') ? 'api' : 'action'}`;
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    // Create new record or reset expired one
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return { allowed: true, limit: config.requests, resetTime: now + config.windowMs };
  }

  if (record.count >= config.requests) {
    return { allowed: false, limit: config.requests, resetTime: record.resetTime };
  }

  record.count++;
  return { allowed: true, limit: config.requests, resetTime: record.resetTime };
}

// Get request size limit based on route
function getRequestSizeLimit(pathname: string): number {
  if (FILE_UPLOAD_ROUTES.some(route => pathname.startsWith(route))) {
    return MAX_REQUEST_SIZE.fileUpload;
  }
  if (pathname.startsWith('/api/')) {
    return MAX_REQUEST_SIZE.api;
  }
  return MAX_REQUEST_SIZE.default;
}

// Extract client IP
function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

// Add security headers
function addSecurityHeaders(response: NextResponse): NextResponse {
  // CSRF protection headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:; font-src 'self' https:;"
  );

  return response;
}

function redirectToLogin(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', request.url));
  response.cookies.delete('access_token');
  response.cookies.delete('session_id');
  response.cookies.delete('refresh_token');
  return addSecurityHeaders(response);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
