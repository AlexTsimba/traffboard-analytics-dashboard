import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@traffboard/auth';
import { databaseService } from '@traffboard/database';

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check if route is protected
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  const isAdminRoute = ADMIN_ROUTES.some(route => pathname.startsWith(route));
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));

  // Allow public routes
  if (isPublicRoute && !isProtectedRoute && !isAdminRoute) {
    return NextResponse.next();
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

    // Check admin access for admin routes
    if (isAdminRoute) {
      const user = await databaseService.users.findById(payload.userId);
      if (!user || user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    }

    // Add user info to headers for API routes
    const response = NextResponse.next();
    response.headers.set('x-user-id', payload.userId.toString());
    
    return response;
  } catch (error) {
    console.error('Session verification failed:', error);
    return redirectToLogin(request);
  }
}

function redirectToLogin(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', request.url));
  response.cookies.delete('access_token');
  response.cookies.delete('session_id');
  response.cookies.delete('refresh_token');
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
