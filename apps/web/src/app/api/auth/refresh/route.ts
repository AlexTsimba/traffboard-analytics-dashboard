import { NextRequest, NextResponse } from 'next/server';
import { generateAccessToken } from '@traffboard/auth';
import { databaseService } from '@traffboard/database';
import { cookies } from 'next/headers';

export async function POST(_request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const refreshTokenId = cookieStore.get('refresh_token')?.value;

    if (!refreshTokenId) {
      return NextResponse.json(
        { error: 'No refresh token provided' },
        { status: 401 }
      );
    }

    // Verify refresh token
    const refreshToken = await databaseService.sessions.getRefreshToken(refreshTokenId);
    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      );
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(refreshToken.userId);

    // Set new access token cookie
    cookieStore.set('access_token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60, // 15 minutes
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
