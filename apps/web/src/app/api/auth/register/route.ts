import { NextRequest, NextResponse } from 'next/server';
import { registerSchema } from '@traffboard/auth';
import { databaseService } from '@traffboard/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    // Check if user already exists
    const existingUser = await databaseService.users.findByEmail(validatedData.email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Create new user
    const user = await databaseService.users.create({
      email: validatedData.email,
      password: validatedData.password,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        isVerified: user.isVerified,
      },
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
