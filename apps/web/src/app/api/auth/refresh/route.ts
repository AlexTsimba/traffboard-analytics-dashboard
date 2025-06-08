import { NextRequest, NextResponse } from 'next/server';
import { db } from '@traffboard/database';
import { refreshTokens, users, sessions } from '@traffboard/database';
import { generateAccessToken, generateRefreshToken } from '@traffboard/auth';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json();

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token required' },
        { status: 401 }
      );
    }

    // Find and validate refresh token
    const [tokenRecord] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.id, refreshToken));

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }

    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, tokenRecord.userId));

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      );
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(user.id);
    const newRefreshToken = generateRefreshToken();
    const sessionId = randomBytes(32).toString('hex');

    // Delete old refresh token and create new ones
    await db.delete(refreshTokens).where(eq(refreshTokens.id, refreshToken));
    
    await Promise.all([
      db.insert(sessions).values({
        id: sessionId,
        userId: user.id,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      }),
      db.insert(refreshTokens).values({
        id: newRefreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      }),
    ]);

    return NextResponse.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: { 
        id: user.id, 
        email: user.email, 
        twoFactorEnabled: user.twoFactorEnabled 
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'Token refresh failed' },
      { status: 500 }
    );
  }
}
