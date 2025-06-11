import { eq, and, gt } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { apiKeys, type ApiKey, type NewApiKey } from '../schema/apiKeys';
import { createHash, randomBytes } from 'crypto';

export interface ApiKeyWithToken extends Omit<ApiKey, 'keyHash'> {
  key: string; // Only returned when creating new keys
}

export class ApiKeysRepository {
  constructor(private db: PostgresJsDatabase<any>) {}

  private generateApiKey(): string {
    // Generate a secure API key with prefix
    const randomPart = randomBytes(32).toString('hex');
    return `tk_${randomPart}`;
  }

  private hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }

  async create(data: Omit<NewApiKey, 'keyHash'> & { key?: string }): Promise<ApiKeyWithToken> {
    const key = data.key || this.generateApiKey();
    const keyHash = this.hashKey(key);
    
    const insertData: NewApiKey = {
      ...data,
      keyHash,
    };
    delete (insertData as any).key; // Remove key from insert data
    
    const result = await this.db.insert(apiKeys).values(insertData).returning();
    if (!result[0]) throw new Error('Failed to create API key');
    
    return {
      ...result[0],
      key, // Include the plain key only for creation response
    } as ApiKeyWithToken;
  }

  async findByUserId(userId: number): Promise<Omit<ApiKey, 'keyHash'>[]> {
    const result = await this.db.select({
      id: apiKeys.id,
      userId: apiKeys.userId,
      name: apiKeys.name,
      permissions: apiKeys.permissions,
      expiresAt: apiKeys.expiresAt,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
      updatedAt: apiKeys.updatedAt,
    }).from(apiKeys)
      .where(eq(apiKeys.userId, userId));
    return result;
  }

  async findById(id: number): Promise<Omit<ApiKey, 'keyHash'> | undefined> {
    const result = await this.db.select({
      id: apiKeys.id,
      userId: apiKeys.userId,
      name: apiKeys.name,
      permissions: apiKeys.permissions,
      expiresAt: apiKeys.expiresAt,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
      updatedAt: apiKeys.updatedAt,
    }).from(apiKeys)
      .where(eq(apiKeys.id, id)).limit(1);
    return result[0];
  }

  async verifyKey(key: string): Promise<Omit<ApiKey, 'keyHash'> | null> {
    const keyHash = this.hashKey(key);
    const now = new Date();
    
    const result = await this.db.select({
      id: apiKeys.id,
      userId: apiKeys.userId,
      name: apiKeys.name,
      permissions: apiKeys.permissions,
      expiresAt: apiKeys.expiresAt,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
      updatedAt: apiKeys.updatedAt,
    }).from(apiKeys)
      .where(
        and(
          eq(apiKeys.keyHash, keyHash),
          // Check if key is not expired (null expiresAt means never expires)
          // Or expiresAt is in the future
          eq(apiKeys.expiresAt, null) // This will need to be adjusted for proper null handling
        )
      ).limit(1);
    
    if (!result[0]) return null;
    
    // Update last used timestamp
    await this.updateLastUsed(result[0].id);
    
    return result[0];
  }

  async revoke(userId: number, keyId: number): Promise<void> {
    await this.db.delete(apiKeys)
      .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)));
  }

  async updateLastUsed(keyId: number): Promise<void> {
    await this.db.update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, keyId));
  }

  async rotateKey(userId: number, keyId: number): Promise<ApiKeyWithToken> {
    // Get existing key data
    const existing = await this.db.select().from(apiKeys)
      .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId))).limit(1);
    
    if (!existing[0]) throw new Error('API key not found');
    
    // Generate new key and hash
    const newKey = this.generateApiKey();
    const newKeyHash = this.hashKey(newKey);
    
    // Update the existing record
    await this.db.update(apiKeys)
      .set({ keyHash: newKeyHash, updatedAt: new Date() })
      .where(eq(apiKeys.id, keyId));
    
    return {
      ...existing[0],
      key: newKey,
      updatedAt: new Date(),
    } as ApiKeyWithToken;
  }

  async deleteExpiredKeys(): Promise<number> {
    const now = new Date();
    const result = await this.db.delete(apiKeys)
      .where(and(gt(now, apiKeys.expiresAt)))
      .returning({ id: apiKeys.id });
    
    return result.length;
  }
}
