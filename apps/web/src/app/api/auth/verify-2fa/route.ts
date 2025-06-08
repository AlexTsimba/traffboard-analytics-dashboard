import { NextRequest, NextResponse } from 'next/server';
import { db } from '@traffboard/database';
import { users } from '@traffboard/database';
import { 
  twoFactorSchema,
  verifyTOTP,
  verifyAccessToken
} from '@traffboard/auth';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { token: twoFactorCode } = twoFactorSchema.parse(body);
    
    const [user] = await db.select().from(users).where(eq(users.id, payload.userId));
    if (!user || !user.twoFactorSecret) {
      return NextResponse.json(
        { error: 'Setup 2FA first' },
        { status: 400 }
      );
    }

    // Verify the code
    if (!verifyTOTP(twoFactorCode, user.twoFactorSecret)) {
      return NextResponse.json(
        { error: 'Invalid 2FA code' },
        { status: 400 }
      );
    }

    // Enable 2FA
    await db.update(users)
      .set({ twoFactorEnabled: true })
      .where(eq(users.id, payload.userId));

    return NextResponse.json({ message: '2FA enabled successfully' });

  } catch (error) {
    console.error('Verify 2FA error:', error);
    return NextResponse.json(
      { error: 'Invalid input' },
      { status: 400 }
    );
  }
}
