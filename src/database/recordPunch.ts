import { getDb } from './db';
import * as Crypto from 'expo-crypto';
import { verifyDeviceForPunch } from '../utils/deviceAuth';

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
  note?: string | null;
  attachment_uri?: string | null;
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
  fallbackUserId: string = 'local_user',
  note: string | null = null,
  attachmentUri: string | null = null
): Promise<{ success: boolean; message?: string }> => {
  const db = getDb();
  const now = new Date();
  const todayStr = formatDate(now);
  const timestamp = now.getTime();

  // Try to get real user id from AsyncStorage
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  const storedUserId = await AsyncStorage.getItem('userId');
  const userId = storedUserId || fallbackUserId;

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

  // Cihaz Eşleştirme / Güvenlik Kontrolü
  const deviceCheck = await verifyDeviceForPunch();
  if (!deviceCheck.allowed) {
    return { success: false, message: deviceCheck.message };
  }

  if (type === 'in') {
    // 2. Bugünün SON kaydını al (Sadece 'in' için genel bir kontrol)
    const latestRecord = await db.getFirstAsync<WorkRecord>(
      `SELECT * FROM work_records WHERE user_id = ? AND date = ? AND check_in_timestamp IS NOT NULL AND check_out_timestamp IS NULL ORDER BY check_in_timestamp DESC`,
      [userId, todayStr]
    );

    if (latestRecord) {
      return { success: false, message: 'Şu anda zaten giriş yapmış durumdasınız. Önce çıkış yapmalısınız.' };
    }

    // Yeni kayıt (ilk giriş veya gün içindeki 2., 3. girişler)
    const id = Crypto.randomUUID();
    await db.runAsync(
      `INSERT INTO work_records (id, user_id, date, check_in_timestamp, check_out_timestamp, day_type, is_leave_day, source, last_edited_at, synced_at, note, attachment_uri)
       VALUES (?, ?, ?, ?, NULL, ?, 0, ?, ?, NULL, ?, ?)`,
      [id, userId, todayStr, timestamp, getDayType(now), source || 'manual', timestamp, note, attachmentUri]
    );
  } else if (type === 'out') {
    // Çıkış yaparken KAPANMAMIŞ en son kaydı bul
    const unclosedRecord = await db.getFirstAsync<WorkRecord>(
      `SELECT * FROM work_records WHERE user_id = ? AND date = ? AND check_in_timestamp IS NOT NULL AND check_out_timestamp IS NULL ORDER BY check_in_timestamp DESC`,
      [userId, todayStr]
    );

    if (!unclosedRecord) {
      return { success: false, message: 'Çıkış yapmak için açık bir giriş kaydınız bulunamadı.' };
    }

    await db.runAsync(
      `UPDATE work_records 
       SET check_out_timestamp = ?, source = ?, last_edited_at = ?, synced_at = ?, note = ?, attachment_uri = ? 
       WHERE id = ?`,
      [timestamp, source || 'manual', timestamp, null, note, attachmentUri, unclosedRecord.id]
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

export const markAsLeaveDay = async (
  fallbackUserId: string = 'local_user'
): Promise<{ success: boolean; message?: string }> => {
  const db = getDb();
  const now = new Date();
  const todayStr = formatDate(now);
  const timestamp = now.getTime();

  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  const storedUserId = await AsyncStorage.getItem('userId');
  const userId = storedUserId || fallbackUserId;

  const todayRecord = await db.getFirstAsync<WorkRecord>(
    `SELECT * FROM work_records WHERE user_id = ? AND date = ? ORDER BY check_in_timestamp DESC`,
    [userId, todayStr]
  );

  if (todayRecord) {
    if (todayRecord.check_in_timestamp && !todayRecord.check_out_timestamp) {
      return { success: false, message: 'Giriş yaptıktan sonra bugün için izinli sayılamazsınız. Önce çıkış yapın.' };
    }
    await db.runAsync(
      `UPDATE work_records SET is_leave_day = 1, last_edited_at = ?, synced_at = NULL WHERE id = ?`,
      [timestamp, todayRecord.id]
    );
  } else {
    const id = Crypto.randomUUID();
    await db.runAsync(
      `INSERT INTO work_records (id, user_id, date, check_in_timestamp, check_out_timestamp, day_type, is_leave_day, source, last_edited_at, synced_at)
       VALUES (?, ?, ?, NULL, NULL, ?, 1, 'manual', ?, NULL)`,
      [id, userId, todayStr, getDayType(now), timestamp]
    );
  }

  try {
    const { scheduleNotificationsForWeek } = require('../utils/notifications');
    await scheduleNotificationsForWeek();
  } catch (e) {}

  return { success: true };
};

export const updateRecordTimes = async (
  recordId: string,
  checkIn: number | null,
  checkOut: number | null,
  note: string | null = null,
  attachmentUri: string | null = null
): Promise<{ success: boolean; message?: string }> => {
  const db = getDb();
  const timestamp = new Date().getTime();
  
  await db.runAsync(
    `UPDATE work_records SET check_in_timestamp = ?, check_out_timestamp = ?, last_edited_at = ?, synced_at = NULL, note = COALESCE(?, note), attachment_uri = COALESCE(?, attachment_uri) WHERE id = ?`,
    [checkIn, checkOut, timestamp, note, attachmentUri, recordId]
  );
  
  try {
    const { scheduleNotificationsForWeek } = require('../utils/notifications');
    await scheduleNotificationsForWeek();
  } catch (e) {}
  
  return { success: true };
};

export const insertManualRecord = async (
  dateStr: string,
  checkIn: number | null,
  checkOut: number | null,
  fallbackUserId: string = 'local_user',
  note: string | null = null,
  attachmentUri: string | null = null
): Promise<{ success: boolean; message?: string }> => {
  const db = getDb();
  const timestamp = new Date().getTime();
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  const storedUserId = await AsyncStorage.getItem('userId');
  const userId = storedUserId || fallbackUserId;

  const id = Crypto.randomUUID();
  await db.runAsync(
    `INSERT INTO work_records (id, user_id, date, check_in_timestamp, check_out_timestamp, day_type, is_leave_day, source, last_edited_at, synced_at, note, attachment_uri)
     VALUES (?, ?, ?, ?, ?, ?, 0, 'manual', ?, NULL, ?, ?)`,
    [id, userId, dateStr, checkIn, checkOut, getDayType(new Date()), timestamp, note, attachmentUri]
  );
  
  return { success: true };
};
