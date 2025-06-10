import { eq, desc, sql, and, gte, lte, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { conversions, type Conversion, type NewConversion } from '../schema/conversions';

export interface ConversionsFilter {
  dateFrom?: Date;
  dateTo?: Date;
  countries?: string[];
  osFamily?: string[];
  foreignPartnerIds?: number[];
  foreignCampaignIds?: number[];
}

export interface ConversionsAggregates {
  totalUniqueClicks: number;
  totalRegistrations: number;
  totalFtdCount: number;
  conversionRate: number;
  ftdRate: number;
}

export class ConversionsRepository {
  constructor(private db: PostgresJsDatabase<any>) {}

  async create(data: NewConversion): Promise<Conversion> {
    const result = await this.db.insert(conversions).values(data).returning();
    if (!result[0]) throw new Error('Failed to create conversion');
    return result[0];
  }

  async createMany(data: NewConversion[]): Promise<Conversion[]> {
    if (data.length === 0) return [];
    return await this.db.insert(conversions).values(data).returning();
  }

  async findById(id: number): Promise<Conversion | undefined> {
    const result = await this.db.select().from(conversions)
      .where(eq(conversions.id, id)).limit(1);
    return result[0];
  }

  async findAll(filter?: ConversionsFilter, limit = 100, offset = 0): Promise<Conversion[]> {
    const conditions = filter ? this.buildFilterConditions(filter) : [];
    
    const query = conditions.length > 0
      ? this.db.select().from(conversions).where(and(...conditions))
      : this.db.select().from(conversions);
    
    return await query.orderBy(desc(conversions.date)).limit(limit).offset(offset);
  }

  private buildFilterConditions(filter: ConversionsFilter) {
    const conditions = [];
    
    if (filter.dateFrom) {
      conditions.push(gte(conversions.date, filter.dateFrom.toISOString().split('T')[0]!));
    }
    
    if (filter.dateTo) {
      conditions.push(lte(conversions.date, filter.dateTo.toISOString().split('T')[0]!));
    }
    
    if (filter.countries?.length) {
      conditions.push(inArray(conversions.country, filter.countries));
    }
    
    if (filter.osFamily?.length) {
      conditions.push(inArray(conversions.osFamily, filter.osFamily));
    }
    
    if (filter.foreignPartnerIds?.length) {
      conditions.push(inArray(conversions.foreignPartnerId, filter.foreignPartnerIds));
    }
    
    if (filter.foreignCampaignIds?.length) {
      conditions.push(inArray(conversions.foreignCampaignId, filter.foreignCampaignIds));
    }

    return conditions;
  }

  async getAggregates(filter?: ConversionsFilter): Promise<ConversionsAggregates> {
    const conditions = filter ? this.buildFilterConditions(filter) : [];
    
    const query = conditions.length > 0
      ? this.db.select({
          totalUniqueClicks: sql<number>`sum(${conversions.uniqueClicks})`.mapWith(Number),
          totalRegistrations: sql<number>`sum(${conversions.registrationsCount})`.mapWith(Number),
          totalFtdCount: sql<number>`sum(${conversions.ftdCount})`.mapWith(Number),
        }).from(conversions).where(and(...conditions))
      : this.db.select({
          totalUniqueClicks: sql<number>`sum(${conversions.uniqueClicks})`.mapWith(Number),
          totalRegistrations: sql<number>`sum(${conversions.registrationsCount})`.mapWith(Number),
          totalFtdCount: sql<number>`sum(${conversions.ftdCount})`.mapWith(Number),
        }).from(conversions);

    const result = await query;
    const data = result[0] || { totalUniqueClicks: 0, totalRegistrations: 0, totalFtdCount: 0 };
    const conversionRate = data.totalUniqueClicks > 0 
      ? (data.totalRegistrations / data.totalUniqueClicks) * 100 : 0;
    const ftdRate = data.totalRegistrations > 0 
      ? (data.totalFtdCount / data.totalRegistrations) * 100 : 0;

    return {
      totalUniqueClicks: data.totalUniqueClicks || 0,
      totalRegistrations: data.totalRegistrations || 0,
      totalFtdCount: data.totalFtdCount || 0,
      conversionRate: Number(conversionRate.toFixed(2)),
      ftdRate: Number(ftdRate.toFixed(2)),
    };
  }

  async count(filter?: ConversionsFilter): Promise<number> {
    const conditions = filter ? this.buildFilterConditions(filter) : [];
    
    const query = conditions.length > 0
      ? this.db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(conversions).where(and(...conditions))
      : this.db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(conversions);

    const result = await query;
    return result[0]?.count || 0;
  }

  async getDailyTimeSeries(filter?: ConversionsFilter): Promise<Array<{
    date: string;
    uniqueClicks: number;
    registrations: number;
    ftdCount: number;
  }>> {
    const conditions = filter ? this.buildFilterConditions(filter) : [];
    
    const query = conditions.length > 0
      ? this.db.select({
          date: conversions.date,
          uniqueClicks: sql<number>`sum(${conversions.uniqueClicks})`.mapWith(Number),
          registrations: sql<number>`sum(${conversions.registrationsCount})`.mapWith(Number),
          ftdCount: sql<number>`sum(${conversions.ftdCount})`.mapWith(Number),
        }).from(conversions).where(and(...conditions))
      : this.db.select({
          date: conversions.date,
          uniqueClicks: sql<number>`sum(${conversions.uniqueClicks})`.mapWith(Number),
          registrations: sql<number>`sum(${conversions.registrationsCount})`.mapWith(Number),
          ftdCount: sql<number>`sum(${conversions.ftdCount})`.mapWith(Number),
        }).from(conversions);

    const result = await query.groupBy(conversions.date).orderBy(desc(conversions.date));
    return result.map(item => ({
      date: item.date,
      uniqueClicks: item.uniqueClicks || 0,
      registrations: item.registrations || 0,
      ftdCount: item.ftdCount || 0,
    }));
  }

  async getMaxDate(): Promise<string | null> {
    const result = await this.db.select({
      maxDate: sql<string>`max(${conversions.date})`.mapWith(String)
    }).from(conversions);
    
    return result[0]?.maxDate || null;
  }

  async findByCompositeKey(date: string, partnerId: number, campaignId: number, landingId: number): Promise<Conversion | undefined> {
    const result = await this.db.select().from(conversions)
      .where(and(
        eq(conversions.date, date),
        eq(conversions.foreignPartnerId, partnerId),
        eq(conversions.foreignCampaignId, campaignId),
        eq(conversions.foreignLandingId, landingId)
      )).limit(1);
    return result[0];
  }

  async updateByCompositeKey(date: string, partnerId: number, campaignId: number, landingId: number, data: Partial<NewConversion>): Promise<Conversion | undefined> {
    const result = await this.db.update(conversions)
      .set({ ...data, updatedAt: new Date() })
      .where(and(
        eq(conversions.date, date),
        eq(conversions.foreignPartnerId, partnerId),
        eq(conversions.foreignCampaignId, campaignId),
        eq(conversions.foreignLandingId, landingId)
      )).returning();
    return result[0];
  }
}
