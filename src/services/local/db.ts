import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'lingualink_offline.db';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) {
    return db;
  }

  try {
    const newDb = await SQLite.openDatabaseAsync(DATABASE_NAME);
    await initializeDatabase(newDb);
    db = newDb;
    console.log('[DB] Database initialized successfully');
    return db;
  } catch (error) {
    console.error('[DB] Failed to initialize database:', error);
    db = null; // Ensure next call retries fresh
    throw new Error(`Database initialization failed: ${error}`);
  }
}

async function initializeDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  try {
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

    // Create offline_uploads table for storing pending media uploads
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS offline_uploads (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        upload_type TEXT NOT NULL,
        local_file_path TEXT NOT NULL,
        thumbnail_path TEXT,
        metadata TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        retry_count INTEGER DEFAULT 0,
        last_error TEXT
      );
    `);

    // Create index for offline_uploads
    await database.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_offline_uploads_status ON offline_uploads(status);
    `);

    await database.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_offline_uploads_created_at ON offline_uploads(created_at);
    `);

    // Create offline_interactions table for storing pending likes, comments, follows
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS offline_interactions (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        interaction_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        target_type TEXT NOT NULL,
        action TEXT NOT NULL,
        metadata TEXT,
        created_at INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        retry_count INTEGER DEFAULT 0,
        last_error TEXT
      );
    `);

    // Create index for offline_interactions
    await database.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_offline_interactions_status ON offline_interactions(status);
    `);

    console.log('[DB] Database schema created successfully');
  } catch (error) {
    console.error('[DB] Database schema creation failed:', error);
    throw error;
  }
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
