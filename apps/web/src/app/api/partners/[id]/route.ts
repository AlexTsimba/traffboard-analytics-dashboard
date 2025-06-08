import { NextRequest, NextResponse } from 'next/server';
import { db } from '@traffboard/database';
import { partnerSettings } from '@traffboard/database';
import { eq } from 'drizzle-orm';

// GET - Get specific partner settings
export async function GET(
  _request: NextRequest, 
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const partnerId = parseInt(params.id);
    
    const [partner] = await db
      .select()
      .from(partnerSettings)
      .where(eq(partnerSettings.partnerId, partnerId));

    if (!partner) {
      return NextResponse.json(
        { error: 'Partner not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ partner });
  } catch (error) {
    console.error('Error fetching partner:', error);
    return NextResponse.json(
      { error: 'Failed to fetch partner' },
      { status: 500 }
    );
  }
}

// PUT - Update partner settings
export async function PUT(
  request: NextRequest, 
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const partnerId = parseInt(params.id);
    const body = await request.json();

    const result = await db
      .update(partnerSettings)
      .set({
        partnerName: body.partnerName,
        isActive: body.isActive,
        fieldMappings: body.fieldMappings,
        dateFormats: body.dateFormats,
        validationRules: body.validationRules,
        defaultValues: body.defaultValues,
        processingSettings: body.processingSettings,
        updatedAt: new Date(),
      })
      .where(eq(partnerSettings.partnerId, partnerId))
      .returning();

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Partner not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ partner: result[0] });
  } catch (error) {
    console.error('Error updating partner:', error);
    return NextResponse.json(
      { error: 'Failed to update partner' },
      { status: 500 }
    );
  }
}

// DELETE - Delete partner settings
export async function DELETE(
  _request: NextRequest, 
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const partnerId = parseInt(params.id);

    const result = await db
      .delete(partnerSettings)
      .where(eq(partnerSettings.partnerId, partnerId))
      .returning();

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Partner not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Partner deleted successfully' });
  } catch (error) {
    console.error('Error deleting partner:', error);
    return NextResponse.json(
      { error: 'Failed to delete partner' },
      { status: 500 }
    );
  }
}
