import { NextRequest, NextResponse } from 'next/server';
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

    return NextResponse.json({
      id: user.id,
      email: user.email,
      isVerified: user.isVerified,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt,
    });

  } catch (error) {
    console.error('User info error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
