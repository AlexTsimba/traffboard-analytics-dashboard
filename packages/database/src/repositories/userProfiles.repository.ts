import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { userProfiles, type UserProfile, type NewUserProfile } from '../schema/userProfiles';

export class UserProfilesRepository {
  constructor(private db: PostgresJsDatabase<any>) {}

  async create(data: NewUserProfile): Promise<UserProfile> {
    const result = await this.db.insert(userProfiles).values(data).returning();
    if (!result[0]) throw new Error('Failed to create user profile');
    return result[0];
  }

  async findByUserId(userId: number): Promise<UserProfile | undefined> {
    const result = await this.db.select().from(userProfiles)
      .where(eq(userProfiles.userId, userId)).limit(1);
    return result[0];
  }

  async update(userId: number, updates: Partial<Omit<UserProfile, 'id' | 'userId' | 'createdAt'>>): Promise<void> {
    await this.db.update(userProfiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userProfiles.userId, userId));
  }

  async delete(userId: number): Promise<void> {
    await this.db.delete(userProfiles).where(eq(userProfiles.userId, userId));
  }

  async upsert(data: NewUserProfile): Promise<UserProfile> {
    const existing = await this.findByUserId(data.userId);
    if (existing) {
      await this.update(data.userId, data);
      return { ...existing, ...data, updatedAt: new Date() };
    } else {
      return await this.create(data);
    }
  }
}
