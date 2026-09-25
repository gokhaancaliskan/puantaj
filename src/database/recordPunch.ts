import { getDb } from './db';
import * as Crypto from 'expo-crypto';

export type PunchSource = 'manual' | 'widget' | 'geofence';
export type PunchType = 'in' | 'out';

export interface WorkRecord {
  id: string;
  user_id: string;
  date: string;
  check_in_timestamp: number | null;
  check_out_timestamp: number | null;
  day_type: 'weekday' | 'saturday' | 'sunday';
  is_leave_day: boolean;
  source: PunchSource;
  last_edited_at: number;
  synced_at: number | null;
}

const getDayType = (date: Date): 'weekday' | 'saturday' | 'sunday' => {
  const day = date.getDay();
  if (day === 0) return 'sunday';
  if (day === 6) return 'saturday';
  return 'weekday';
};

const formatDate = (date: Date): string => {
  // Format as DD.MM.YYYY
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
};

export const recordPunch = async (
  type: PunchType,
  source: PunchSource,
  userId: string = 'local_user'
): Promise<{ success: boolean; message?: string }> => {
  const db = getDb();
  const now = new Date();
  const todayStr = formatDate(now);
  const timestamp = now.getTime();

  // 1. Önceki günden çıkışsız kayıt var mı kontrolü
  const previousUnclosedRecords = await db.getAllAsync<WorkRecord>(
    `SELECT * FROM work_records 
     WHERE user_id = ? AND date != ? AND check_in_timestamp IS NOT NULL AND check_out_timestamp IS NULL`,
    [userId, todayStr]
  );

  if (previousUnclosedRecords.length > 0) {
    console.log('Dikkat: önceki kaydın açık kaldı, ancak bugünkü işleme devam ediliyor.');
    // Kullanıcıya uyarı verilebilir ancak işlemini engellemiyoruz!
  }

  // 2. Bugünün kaydını al
  const todayRecord = await db.getFirstAsync<WorkRecord>(
    `SELECT * FROM work_records WHERE user_id = ? AND date = ?`,
    [userId, todayStr]
  );

  if (type === 'in') {
    if (todayRecord && todayRecord.check_in_timestamp) {
      return { success: false, message: 'Bugün zaten giriş yapılmış.' };
    }

    if (todayRecord) {
      // Güncelle
      await db.runAsync(
        `UPDATE work_records 
         SET check_in_timestamp = ?, source = ?, last_edited_at = ?, synced_at = NULL 
         WHERE id = ?`,
        [timestamp, source, timestamp, todayRecord.id]
      );
    } else {
      // Yeni kayıt
      const id = Crypto.randomUUID();
      await db.runAsync(
        `INSERT INTO work_records (id, user_id, date, check_in_timestamp, check_out_timestamp, day_type, is_leave_day, source, last_edited_at, synced_at)
         VALUES (?, ?, ?, ?, NULL, ?, 0, ?, ?, NULL)`,
        [id, userId, todayStr, timestamp, getDayType(now), source, timestamp]
      );
    }
  } else if (type === 'out') {
    if (!todayRecord || !todayRecord.check_in_timestamp) {
      return { success: false, message: 'Çıkış yapmak için önce giriş yapmalısınız.' };
    }

    if (todayRecord.check_out_timestamp) {
      return { success: false, message: 'Bugün zaten çıkış yapılmış.' };
    }

    await db.runAsync(
      `UPDATE work_records 
       SET check_out_timestamp = ?, source = ?, last_edited_at = ?, synced_at = NULL 
       WHERE id = ?`,
      [timestamp, source, timestamp, todayRecord.id]
    );
  }

  try {
    const { requestWidgetUpdate } = require('react-native-android-widget');
    const { PunchWidget } = require('../widget/Widget');
    const { widgetTaskHandler } = require('../widget/widgetTaskHandler');
    const React = require('react');
    requestWidgetUpdate({
      widgetName: 'PunchWidget',
      renderWidget: () => React.createElement(PunchWidget),
      widgetTaskHandler,
    });
  } catch (e) {
    console.error('Failed to update widget:', e);
  }

  try {
    const { scheduleNotificationsForWeek } = require('../utils/notifications');
    await scheduleNotificationsForWeek();
  } catch (e) {
    console.error('Failed to reschedule notifications:', e);
  }

  return { success: true };
};
