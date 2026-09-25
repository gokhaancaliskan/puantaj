import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getDb } from '../database/db';
import { WorkRecord } from '../database/recordPunch';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const formatDate = (date: Date): string => {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
};

export const scheduleNotificationsForWeek = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const now = new Date();
  const db = getDb();
  
  for (let i = 0; i < 7; i++) {
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + i);
    const day = targetDate.getDay();

    if (day === 0) continue; // Pazar

    const dateStr = formatDate(targetDate);
    const record = await db.getFirstAsync<WorkRecord>(
      `SELECT * FROM work_records WHERE user_id = 'local_user' AND date = ?`,
      [dateStr]
    );

    // İzinli gün ise bildirim planlama
    if (record && record.is_leave_day) continue;

    const hasIn = record && record.check_in_timestamp;
    const hasOut = record && record.check_out_timestamp;

    if (day === 6) { // Cumartesi
      if (!hasIn) {
        await scheduleForDate(targetDate, 8, 50, 'Giriş yapmayı unuttunuz mu?', 'Mesai başlamak üzere!');
        await scheduleForDate(targetDate, 9, 50, 'Giriş hatırlatması', 'Hala giriş yapmadınız.');
      }
      if (!hasOut) {
        await scheduleForDate(targetDate, 13, 50, 'Çıkış yapmayı unuttunuz mu?', 'Mesai bitti!');
        await scheduleForDate(targetDate, 14, 50, 'Çıkış hatırlatması', 'Hala çıkış yapmadınız.');
      }
    } else { // Hafta içi
      if (!hasIn) {
        await scheduleForDate(targetDate, 8, 50, 'Giriş yapmayı unuttunuz mu?', 'Mesai başlamak üzere!');
        await scheduleForDate(targetDate, 9, 50, 'Giriş hatırlatması', 'Hala giriş yapmadınız.');
      }
      if (!hasOut) {
        await scheduleForDate(targetDate, 17, 50, 'Çıkış yapmayı unuttunuz mu?', 'Mesai bitti!');
        await scheduleForDate(targetDate, 18, 50, 'Çıkış hatırlatması', 'Hala çıkış yapmadınız.');
      }
    }
  }
};

const scheduleForDate = async (date: Date, hour: number, minute: number, title: string, body: string) => {
  const triggerDate = new Date(date);
  triggerDate.setHours(hour, minute, 0, 0);

  if (triggerDate.getTime() <= Date.now()) return;

  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: triggerDate,
  });
};

export const scheduleLocalNotification = async (title: string, body: string) => {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null, // trigger immediately
  });
};
