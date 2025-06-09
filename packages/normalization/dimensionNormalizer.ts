import { db } from '@traffboard/database';
import { 
  buyers, 
  funnels, 
  trafficSources, 
  campaigns,
  type DimensionMappings
} from '@traffboard/database';
import { eq, and } from 'drizzle-orm';

export class DimensionNormalizer {
  constructor(
    private partnerId: number,
    private partnerName: string,
    private dimensionMappings: DimensionMappings
  ) {}

  async normalizeBuyer(data: Record<string, any>): Promise<number | null> {
    if (!this.dimensionMappings.buyer) return null;
    
    const originalValue = data[this.dimensionMappings.buyer];
    if (!originalValue) return null;

    return await this.getOrCreateDimension(
      buyers,
      'buyer',
      String(originalValue),
      this.dimensionMappings.buyer
    );
  }

  async normalizeFunnel(data: Record<string, any>): Promise<number | null> {
    if (!this.dimensionMappings.funnel) return null;
    
    const originalValue = data[this.dimensionMappings.funnel];
    if (!originalValue) return null;

    return await this.getOrCreateDimension(
      funnels,
      'funnel',
      String(originalValue),
      this.dimensionMappings.funnel
    );
  }

  async normalizeSource(data: Record<string, any>): Promise<number | null> {
    if (!this.dimensionMappings.source) return null;
    
    const originalValue = data[this.dimensionMappings.source];
    if (!originalValue) return null;

    return await this.getOrCreateDimension(
      trafficSources,
      'source',
      String(originalValue),
      this.dimensionMappings.source
    );
  }

  async normalizeCampaign(data: Record<string, any>): Promise<number | null> {
    if (!this.dimensionMappings.campaign) return null;
    
    const originalValue = data[this.dimensionMappings.campaign];
    if (!originalValue) return null;

    return await this.getOrCreateDimension(
      campaigns,
      'campaign',
      String(originalValue),
      this.dimensionMappings.campaign
    );
  }

  private async getOrCreateDimension(
    table: any,
    dimensionType: string,
    originalValue: string,
    originalField: string
  ): Promise<number> {
    // Try to find existing dimension
    const [existing] = await db
      .select()
      .from(table)
      .where(
        and(
          eq(table.partnerId, this.partnerId),
          eq(table.originalValue, originalValue)
        )
      );

    if (existing) {
      return existing.id;
    }

    // Create new dimension
    const name = this.generateDimensionName(dimensionType, originalValue);
    const [newDimension] = await db
      .insert(table)
      .values({
        name,
        partnerId: this.partnerId,
        originalValue,
        originalField,
      })
      .returning();

    return newDimension.id;
  }

  private generateDimensionName(dimensionType: string, originalValue: string): string {
    // Generate friendly names for dashboard
    return `${this.partnerName} ${dimensionType}: ${originalValue}`;
  }

  async normalizeAllDimensions(data: Record<string, any>) {
    const [buyerId, funnelId, sourceId, campaignId] = await Promise.all([
      this.normalizeBuyer(data),
      this.normalizeFunnel(data),
      this.normalizeSource(data),
      this.normalizeCampaign(data),
    ]);

    return {
      buyerId,
      funnelId,
      sourceId,
      campaignId,
    };
  }
}
