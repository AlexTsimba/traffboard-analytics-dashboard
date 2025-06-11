import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { notificationSettings, type NotificationSettings, type NewNotificationSettings } from '../schema/notificationSettings';

export class NotificationSettingsRepository {
  constructor(private db: PostgresJsDatabase<any>) {}

  async create(data: NewNotificationSettings): Promise<NotificationSettings> {
    const result = await this.db.insert(notificationSettings).values(data).returning();
    if (!result[0]) throw new Error('Failed to create notification settings');
    return result[0];
  }

  async findByUserId(userId: number): Promise<NotificationSettings | undefined> {
    const result = await this.db.select().from(notificationSettings)
      .where(eq(notificationSettings.userId, userId)).limit(1);
    return result[0];
  }

  async update(userId: number, updates: Partial<Omit<NotificationSettings, 'id' | 'userId' | 'createdAt'>>): Promise<void> {
    await this.db.update(notificationSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(notificationSettings.userId, userId));
  }

  async delete(userId: number): Promise<void> {
    await this.db.delete(notificationSettings).where(eq(notificationSettings.userId, userId));
  }

  async upsert(data: NewNotificationSettings): Promise<NotificationSettings> {
    const existing = await this.findByUserId(data.userId);
    if (existing) {
      await this.update(data.userId, data);
      return { ...existing, ...data, updatedAt: new Date() };
    } else {
      return await this.create(data);
    }
  }

  async getDefaults(userId: number): Promise<NotificationSettings> {
    const existing = await this.findByUserId(userId);
    if (existing) return existing;
    
    // Create default settings for new user
    return await this.create({
      userId,
      emailNotifications: true,
      pushNotifications: true,
      dailyReports: false,
      weeklyReports: true,
      alertThresholds: true,
      systemUpdates: true,
    });
  }
}
