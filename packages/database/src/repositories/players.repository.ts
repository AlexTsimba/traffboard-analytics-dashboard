import { eq, desc, sql, and, gte, lte, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { players, type Player, type NewPlayer } from '../schema/players';

export interface PlayersFilter {
  dateFrom?: Date;
  dateTo?: Date;
  countries?: string[];
  partnerIds?: number[];
  campaignIds?: number[];
  prequalified?: boolean;
  duplicate?: boolean;
}

export interface PlayersAggregates {
  totalPlayers: number;
  totalDepositsSum: number;
  totalCashoutsSum: number;
  totalCasinoRealNgr: number;
  totalCost: number;
  averageDepositSum: number;
}

export class PlayersRepository {
  constructor(private db: PostgresJsDatabase<any>) {}

  async create(data: NewPlayer): Promise<Player> {
    const result = await this.db.insert(players).values(data).returning();
    if (!result[0]) throw new Error('Failed to create player');
    return result[0];
  }

  async createMany(data: NewPlayer[]): Promise<Player[]> {
    if (data.length === 0) return [];
    return await this.db.insert(players).values(data).returning();
  }

  async findById(id: number): Promise<Player | undefined> {
    const result = await this.db.select().from(players)
      .where(eq(players.id, id)).limit(1);
    return result[0];
  }

  async findAll(filter?: PlayersFilter, limit = 100, offset = 0): Promise<Player[]> {
    const conditions = filter ? this.buildFilterConditions(filter) : [];
    
    const query = conditions.length > 0
      ? this.db.select().from(players).where(and(...conditions))
      : this.db.select().from(players);
    
    return await query.orderBy(desc(players.signUpDate)).limit(limit).offset(offset);
  }

  private buildFilterConditions(filter: PlayersFilter) {
    const conditions = [];
    if (filter.dateFrom) conditions.push(gte(players.date, filter.dateFrom.toISOString().split('T')[0]!));
    if (filter.dateTo) conditions.push(lte(players.date, filter.dateTo.toISOString().split('T')[0]!));
    if (filter.countries?.length) conditions.push(inArray(players.playerCountry, filter.countries));
    return conditions;
  }

  async count(filter?: PlayersFilter): Promise<number> {
    const conditions = filter ? this.buildFilterConditions(filter) : [];
    
    const query = conditions.length > 0
      ? this.db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(players).where(and(...conditions))
      : this.db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(players);
      
    const result = await query;
    return result[0]?.count || 0;
  }
}
