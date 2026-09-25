import * as SQLite from 'expo-sqlite';

export const getDb = () => {
  return SQLite.openDatabaseSync('puantajim.db');
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
      synced_at INTEGER
    );
  `);
};
