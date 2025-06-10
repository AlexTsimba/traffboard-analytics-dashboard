import { NextRequest, NextResponse } from 'next/server';

const publicPaths = ['/login'];
const apiAuthPaths = ['/api/auth'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow API auth endpoints
  if (apiAuthPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow public paths
  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  // For API routes (except auth), require authentication
  if (pathname.startsWith('/api/')) {
    // Check for cookie-based authentication
    const accessToken = request.cookies.get('access_token')?.value;
    const sessionId = request.cookies.get('session_id')?.value;
    
    // Also check for Bearer token (fallback)
    const authHeader = request.headers.get('authorization');
    
    if (!accessToken && !sessionId && !authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
