import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { dashboardPreferences, type DashboardPreferences, type NewDashboardPreferences } from '../schema/dashboardPreferences';

export class DashboardPreferencesRepository {
  constructor(private db: PostgresJsDatabase<any>) {}

  async create(data: NewDashboardPreferences): Promise<DashboardPreferences> {
    const result = await this.db.insert(dashboardPreferences).values(data).returning();
    if (!result[0]) throw new Error('Failed to create dashboard preferences');
    return result[0];
  }

  async findByUserId(userId: number): Promise<DashboardPreferences | undefined> {
    const result = await this.db.select().from(dashboardPreferences)
      .where(eq(dashboardPreferences.userId, userId)).limit(1);
    return result[0];
  }

  async update(userId: number, updates: Partial<Omit<DashboardPreferences, 'id' | 'userId' | 'createdAt'>>): Promise<void> {
    await this.db.update(dashboardPreferences)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(dashboardPreferences.userId, userId));
  }

  async delete(userId: number): Promise<void> {
    await this.db.delete(dashboardPreferences).where(eq(dashboardPreferences.userId, userId));
  }

  async upsert(data: NewDashboardPreferences): Promise<DashboardPreferences> {
    if (!data.userId) {
      throw new Error('userId is required for dashboard preferences');
    }
    
    const existing = await this.findByUserId(data.userId);
    if (existing) {
      await this.update(data.userId, data);
      return { ...existing, ...data, updatedAt: new Date() };
    } else {
      return await this.create(data);
    }
  }

  async getDefaults(userId: number): Promise<DashboardPreferences> {
    const existing = await this.findByUserId(userId);
    if (existing) return existing;
    
    // Create default preferences for new user
    return await this.create({
      userId,
      defaultDateRange: '30d',
      defaultChartType: 'area',
      defaultMetricGroup: 'general',
      autoRefreshInterval: 'off',
      compactMode: false,
      darkMode: false,
    });
  }
}
