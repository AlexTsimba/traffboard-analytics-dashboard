import { NextResponse } from 'next/server';
import { db } from '@traffboard/database';
import { buyers, funnels, trafficSources, campaigns } from '@traffboard/database';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const [buyersList, funnelsList, sourcesList, campaignsList] = await Promise.all([
      db.select().from(buyers).where(eq(buyers.isActive, true)),
      db.select().from(funnels).where(eq(funnels.isActive, true)),
      db.select().from(trafficSources).where(eq(trafficSources.isActive, true)),
      db.select().from(campaigns).where(eq(campaigns.isActive, true)),
    ]);

    return NextResponse.json({
      buyers: buyersList,
      funnels: funnelsList,
      sources: sourcesList,
      campaigns: campaignsList,
    });
  } catch (error) {
    console.error('Error fetching dimensions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dimensions' },
      { status: 500 }
    );
  }
}
