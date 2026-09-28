import { supabase } from './supabase';
import { getDb } from './db';
import { WorkRecord } from './recordPunch';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const syncToCloud = async () => {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) return; // Not logged in, skip sync

    const userId = session.user.id;
    const db = getDb();
    
    // 1. Get all local records that haven't been synced (synced_at is null)
    const unsyncedRecords = await db.getAllAsync<WorkRecord>(
      `SELECT * FROM work_records WHERE user_id = ? AND (synced_at IS NULL OR synced_at < last_edited_at)`,
      [userId]
    );

    if (unsyncedRecords.length > 0) {
      // Push to Supabase
      const payload = unsyncedRecords.map(r => ({
        id: r.id,
        user_id: r.user_id,
        date: r.date,
        check_in_timestamp: r.check_in_timestamp,
        check_out_timestamp: r.check_out_timestamp,
        day_type: r.day_type,
        is_leave_day: r.is_leave_day ? true : false,
        source: r.source,
        last_edited_at: r.last_edited_at
      }));

      const { error } = await supabase
        .from('work_records')
        .upsert(payload, { onConflict: 'id' });

      if (!error) {
        // Mark as synced locally
        const now = new Date().getTime();
        for (const record of unsyncedRecords) {
          await db.runAsync(
            `UPDATE work_records SET synced_at = ? WHERE id = ?`,
            [now, record.id]
          );
        }
      } else {
        console.log('Error syncing to cloud:', error);
      }
    }

  } catch (error) {
    console.log('Sync to cloud exception:', error);
  }
};

export const syncFromCloud = async () => {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) return;

    const userId = session.user.id;
    const db = getDb();

    // Fetch all records from Supabase for this user
    const { data: cloudRecords, error } = await supabase
      .from('work_records')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.log('Error fetching from cloud:', error);
      return;
    }

    if (cloudRecords && cloudRecords.length > 0) {
      const now = new Date().getTime();
      
      // Insert or Update local SQLite db with cloud data
      for (const record of cloudRecords) {
        const localRecord = await db.getFirstAsync<WorkRecord>(
          `SELECT * FROM work_records WHERE id = ?`,
          [record.id]
        );

        if (!localRecord || localRecord.last_edited_at < record.last_edited_at) {
          await db.runAsync(
            `INSERT OR REPLACE INTO work_records (id, user_id, date, check_in_timestamp, check_out_timestamp, day_type, is_leave_day, source, last_edited_at, synced_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              record.id,
              record.user_id,
              record.date,
              record.check_in_timestamp,
              record.check_out_timestamp,
              record.day_type,
              record.is_leave_day ? 1 : 0,
              record.source,
              record.last_edited_at,
              now
            ]
          );
        }
      }
    }
  } catch (error) {
    console.log('Sync from cloud exception:', error);
  }
};

export const runFullSync = async () => {
  await syncFromCloud();
  await syncToCloud();
};
