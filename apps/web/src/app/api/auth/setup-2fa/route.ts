import { NextRequest, NextResponse } from 'next/server';
import { db } from '@traffboard/database';
import { users } from '@traffboard/database';
import { 
  generateTOTPSecret,
  generateQRCode,
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

    // Generate TOTP secret
    const secret = generateTOTPSecret();
    const [user] = await db.select().from(users).where(eq(users.id, payload.userId));
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Generate QR code
    const qrCodeUrl = await generateQRCode(secret.base32, user.email);

    // Store secret (but don't enable 2FA yet)
    await db.update(users)
      .set({ twoFactorSecret: secret.base32 })
      .where(eq(users.id, payload.userId));

    return NextResponse.json({
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntryKey: secret.base32
    });

  } catch (error) {
    console.error('Setup 2FA error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
