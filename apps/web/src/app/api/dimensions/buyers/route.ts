import { NextResponse } from 'next/server';
import { db } from '@traffboard/database';
import { buyers } from '@traffboard/database';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const buyersList = await db
      .select()
      .from(buyers)
      .where(eq(buyers.isActive, true))
      .orderBy(buyers.name);

    return NextResponse.json({ buyers: buyersList });
  } catch (error) {
    console.error('Error fetching buyers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch buyers' },
      { status: 500 }
    );
  }
}
