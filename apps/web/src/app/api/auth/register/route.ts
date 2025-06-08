import { NextRequest, NextResponse } from 'next/server';
import { db } from '@traffboard/database';
import { users } from '@traffboard/database';
import { 
  registerSchema, 
  hashPassword 
} from '@traffboard/auth';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';

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
    const { email, password } = registerSchema.parse(body);
    
    // Check if user exists
    const existingUser = await db.select().from(users).where(eq(users.email, email));
    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Create user
    const passwordHash = await hashPassword(password);
    const result = await db.insert(users).values({
      email,
      passwordHash,
      isVerified: true, // Skip email verification for now
    }).returning();

    const newUser = result[0];
    if (!newUser) {
      throw new Error('Failed to create user');
    }

    return NextResponse.json({ 
      message: 'User created successfully',
      userId: newUser.id 
    }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Invalid input' },
      { status: 400 }
    );
  }
}
