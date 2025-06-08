import { NextRequest, NextResponse } from 'next/server';
import { db } from '@traffboard/database';
import { users, sessions, refreshTokens } from '@traffboard/database';
import { 
  loginSchema,
  verifyPassword,
  verifyTOTP,
  generateAccessToken,
  generateRefreshToken
} from '@traffboard/auth';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { randomBytes } from 'crypto';

// Rate limiting storage (in production, use Redis)
const attempts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;

  const userAttempts = attempts.get(ip);
  if (!userAttempts || now > userAttempts.resetTime) {
    attempts.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (userAttempts.count >= maxAttempts) {
    return false;
  }

  userAttempts.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';
    
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many attempts, try again later' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, password, twoFactorCode } = loginSchema.parse(body);
    
    // Find user
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check 2FA if enabled
    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        return NextResponse.json({ requiresTwoFactor: true });
      }
      
      if (!user.twoFactorSecret || !verifyTOTP(twoFactorCode, user.twoFactorSecret)) {
        return NextResponse.json(
          { error: 'Invalid 2FA code' },
          { status: 401 }
        );
      }
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken();
    const sessionId = randomBytes(32).toString('hex');

    // Store session and refresh token
    await db.insert(sessions).values({
      id: sessionId,
      userId: user.id,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    });

    await db.insert(refreshTokens).values({
      id: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    return NextResponse.json({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, twoFactorEnabled: user.twoFactorEnabled }
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Invalid input' },
      { status: 400 }
    );
  }
}
