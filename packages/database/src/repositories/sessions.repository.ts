import { eq, and, gt } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sessions, refreshTokens, type Session, type RefreshToken } from '../schema/users';
import { randomBytes } from 'crypto';

// Local implementation of generateRefreshToken
const generateRefreshToken = (): string => {
  return randomBytes(32).toString('hex');
};

export class SessionsRepository {
  constructor(private db: PostgresJsDatabase<any>) {}

  async createSession(userId: number, expiresInHours = 24): Promise<Session> {
    const sessionId = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
    
    const result = await this.db.insert(sessions).values({
      id: sessionId,
      userId,
      expiresAt,
    }).returning();
    
    if (!result[0]) throw new Error('Failed to create session');
    return result[0];
  }

  async getSession(sessionId: string): Promise<Session | undefined> {
    const result = await this.db.select().from(sessions)
      .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())))
      .limit(1);
    return result[0];
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.id, sessionId));
  }

  async createRefreshToken(userId: number, expiresInDays = 30): Promise<RefreshToken> {
    const tokenId = generateRefreshToken();
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
    
    const result = await this.db.insert(refreshTokens).values({
      id: tokenId,
      userId,
      expiresAt,
    }).returning();
    
    if (!result[0]) throw new Error('Failed to create refresh token');
    return result[0];
  }

  async getRefreshToken(tokenId: string): Promise<RefreshToken | undefined> {
    const result = await this.db.select().from(refreshTokens)
      .where(and(eq(refreshTokens.id, tokenId), gt(refreshTokens.expiresAt, new Date())))
      .limit(1);
    return result[0];
  }

  async deleteRefreshToken(tokenId: string): Promise<void> {
    await this.db.delete(refreshTokens).where(eq(refreshTokens.id, tokenId));
  }
}
