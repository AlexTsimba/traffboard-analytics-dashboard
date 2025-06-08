import { NextRequest, NextResponse } from 'next/server';
import { db } from '@traffboard/database';
import { partnerSettings } from '@traffboard/database';

// GET - List all partner settings
export async function GET() {
  try {
    const partners = await db.select().from(partnerSettings);
    return NextResponse.json({ partners });
  } catch (error) {
    console.error('Error fetching partner settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch partner settings' },
      { status: 500 }
    );
  }
}

// POST - Create new partner settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const result = await db.insert(partnerSettings).values({
      partnerId: body.partnerId,
      partnerName: body.partnerName,
      isActive: body.isActive ?? true,
      fieldMappings: body.fieldMappings,
      dateFormats: body.dateFormats,
      validationRules: body.validationRules,
      defaultValues: body.defaultValues,
      processingSettings: body.processingSettings,
    }).returning();

    return NextResponse.json({ partner: result[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating partner settings:', error);
    return NextResponse.json(
      { error: 'Failed to create partner settings' },
      { status: 500 }
    );
  }
}
