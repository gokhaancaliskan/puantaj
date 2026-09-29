import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export const getDb = () => {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync('puantajim.db');
  }
  return dbInstance;
};

export const initDb = async () => {
  const db = getDb();
  
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS work_records (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      check_in_timestamp INTEGER,
      check_out_timestamp INTEGER,
      day_type TEXT CHECK(day_type IN ('weekday', 'saturday', 'sunday')) NOT NULL,
      is_leave_day INTEGER DEFAULT 0,
      source TEXT CHECK(source IN ('manual', 'widget', 'geofence')) NOT NULL,
      last_edited_at INTEGER NOT NULL,
      synced_at INTEGER,
      note TEXT,
      attachment_uri TEXT
    );
  `);

  try {
    // Add synced_at column for existing installations
    await db.execAsync(`ALTER TABLE work_records ADD COLUMN synced_at INTEGER;`);
  } catch (e) {
    // Column might already exist
  }
  
  try {
    await db.execAsync(`ALTER TABLE work_records ADD COLUMN note TEXT;`);
  } catch (e) {}

  try {
    await db.execAsync(`ALTER TABLE work_records ADD COLUMN attachment_uri TEXT;`);
  } catch (e) {}
};
