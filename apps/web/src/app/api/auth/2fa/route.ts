import { NextRequest, NextResponse } from 'next/server';
import { generateTOTPSecret, generateQRCode, verifyTOTP } from '@traffboard/auth';
import { databaseService } from '@traffboard/database';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await databaseService.users.findById(parseInt(userId));
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate new TOTP secret
    const secret = generateTOTPSecret();
    const qrCode = await generateQRCode(secret.base32, user.email);

    return NextResponse.json({
      secret: secret.base32,
      qrCode,
    });

  } catch (error) {
    console.error('2FA setup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { secret, token } = await request.json();
    
    // Verify the TOTP token
    const isValid = verifyTOTP(token, secret);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    // Save the secret and enable 2FA
    await databaseService.users.updateTwoFactor(parseInt(userId), secret, true);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('2FA enable error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
