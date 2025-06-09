import { NextRequest, NextResponse } from 'next/server';
import { databaseService } from '@traffboard/database';
import { cookies } from 'next/headers';

export async function POST(_request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    // Get session and refresh token IDs
    const sessionId = cookieStore.get('session_id')?.value;
    const refreshTokenId = cookieStore.get('refresh_token')?.value;

    // Delete session and refresh token from database
    if (sessionId) {
      await databaseService.sessions.deleteSession(sessionId);
    }
    
    if (refreshTokenId) {
      await databaseService.sessions.deleteRefreshToken(refreshTokenId);
    }

    // Clear all auth cookies
    const response = NextResponse.json({ success: true });
    response.cookies.delete('access_token');
    response.cookies.delete('session_id');
    response.cookies.delete('refresh_token');

    return response;

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
