import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { users, type User } from '../schema/users';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

// Local auth implementations
const scryptAsync = promisify(scrypt);

const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64) as Buffer;
  return `${salt}:${buf.toString('hex')}`;
};

const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  const [salt, key] = hash.split(':');
  const buf = await scryptAsync(password, salt!, 64) as Buffer;
  return buf.toString('hex') === key;
};

export interface AuthUser {
  id: number;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  isVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: Date | null;
}

export class UsersRepository {
  constructor(private db: PostgresJsDatabase<any>) {}

  async create(data: { email: string; password: string }): Promise<User> {
    const passwordHash = await hashPassword(data.password);
    const result = await this.db.insert(users).values({
      email: data.email,
      passwordHash,
      isVerified: false,
      twoFactorEnabled: false,
    }).returning();
    
    if (!result[0]) throw new Error('Failed to create user');
    return result[0];
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const result = await this.db.select().from(users)
      .where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async findById(id: number): Promise<User | undefined> {
    const result = await this.db.select().from(users)
      .where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async verifyCredentials(email: string, password: string): Promise<User | null> {
    const user = await this.findByEmail(email);
    if (!user) return null;
    const isValid = await verifyPassword(password, user.passwordHash);
    return isValid ? user : null;
  }

  async updateTwoFactor(userId: number, secret: string, enabled: boolean): Promise<void> {
    await this.db.update(users)
      .set({ twoFactorSecret: secret, twoFactorEnabled: enabled, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }
}
