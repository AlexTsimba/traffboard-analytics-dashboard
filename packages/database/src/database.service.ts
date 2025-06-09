import { db } from './db';
import { ConversionsRepository, PlayersRepository, UsersRepository, SessionsRepository } from './repositories';

export class DatabaseService {
  public readonly conversions: ConversionsRepository;
  public readonly players: PlayersRepository;
  public readonly users: UsersRepository;
  public readonly sessions: SessionsRepository;

  constructor() {
    this.conversions = new ConversionsRepository(db);
    this.players = new PlayersRepository(db);
    this.users = new UsersRepository(db);
    this.sessions = new SessionsRepository(db);
  }

  async testConnection(): Promise<boolean> {
    try {
      await db.execute('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database connection failed:', error);
      return false;
    }
  }

  async healthCheck(): Promise<{ status: string; timestamp: Date; details?: any }> {
    try {
      const start = Date.now();
      await db.execute('SELECT 1');
      const responseTime = Date.now() - start;
      
      return {
        status: 'healthy',
        timestamp: new Date(),
        details: { responseTime: `${responseTime}ms` }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }
}

export const databaseService = new DatabaseService();
export * from './db';
export * from './schema';
export * from './repositories';
