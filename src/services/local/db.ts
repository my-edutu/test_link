import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'lingualink_offline.db';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) {
    return db;
  }

  db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await initializeDatabase(db);
  return db;
}

async function initializeDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  // Create offline_queue table for storing pending requests
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS offline_queue (
      id TEXT PRIMARY KEY NOT NULL,
      endpoint TEXT NOT NULL,
      method TEXT NOT NULL,
      payload TEXT,
      headers TEXT,
      created_at INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      retry_count INTEGER DEFAULT 0,
      last_error TEXT
    );
  `);

  // Create index for faster queries on status and created_at
  await database.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_offline_queue_status ON offline_queue(status);
  `);

  await database.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_offline_queue_created_at ON offline_queue(created_at);
  `);

  console.log('[DB] Database initialized successfully');
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
    console.log('[DB] Database closed');
  }
}

export async function clearDatabase(): Promise<void> {
  const database = await getDatabase();
  await database.execAsync('DELETE FROM offline_queue');
  console.log('[DB] Database cleared');
}

export type { SQLite };
