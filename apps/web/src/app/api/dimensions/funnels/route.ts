import { NextResponse } from 'next/server';
import { db } from '@traffboard/database';
import { funnels } from '@traffboard/database';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const funnelsList = await db
      .select()
      .from(funnels)
      .where(eq(funnels.isActive, true))
      .orderBy(funnels.name);

    return NextResponse.json({ funnels: funnelsList });
  } catch (error) {
    console.error('Error fetching funnels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch funnels' },
      { status: 500 }
    );
  }
}
