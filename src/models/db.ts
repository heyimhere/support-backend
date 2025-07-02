import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';

// Database configuration
const DATABASE_URL = process.env.DATABASE_URL || './dev.db';

// Create SQLite database connection
const sqlite = new Database(DATABASE_URL);

// Enable WAL mode for better performance
sqlite.pragma('journal_mode = WAL');

// Create Drizzle instance
export const db = drizzle(sqlite, { schema });

// Migration function
export const runMigrations = () => {
  try {
    migrate(db, { migrationsFolder: './drizzle/migrations' });
    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    throw error;
  }
};

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🔄 Closing database connection...');
  sqlite.close();
  process.exit(0);
});

export { schema }; 