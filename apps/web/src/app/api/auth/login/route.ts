import { NextRequest, NextResponse } from 'next/server';
import { loginSchema, verifyTOTP, generateAccessToken } from '@traffboard/auth';
import { databaseService } from '@traffboard/database';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = loginSchema.parse(body);

    const user = await databaseService.users.verifyCredentials(
      validatedData.email,
      validatedData.password
    );

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check 2FA if enabled
    if (user.twoFactorEnabled) {
      if (!validatedData.twoFactorCode) {
        return NextResponse.json(
          { requiresTwoFactor: true },
          { status: 200 }
        );
      }

      if (!user.twoFactorSecret) {
        return NextResponse.json(
          { error: 'Two-factor authentication not properly configured' },
          { status: 500 }
        );
      }

      const isValidTOTP = verifyTOTP(validatedData.twoFactorCode, user.twoFactorSecret);
      if (!isValidTOTP) {
        return NextResponse.json(
          { error: 'Invalid two-factor authentication code' },
          { status: 401 }
        );
      }
    }

    // Create session and tokens
    const session = await databaseService.sessions.createSession(user.id);
    const refreshToken = await databaseService.sessions.createRefreshToken(user.id);
    const accessToken = generateAccessToken(user.id);

    // Set secure cookies
    const cookieStore = await cookies();
    cookieStore.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60, // 15 minutes
    });
    
    cookieStore.set('session_id', session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours
    });
    
    cookieStore.set('refresh_token', refreshToken.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        isVerified: user.isVerified,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
