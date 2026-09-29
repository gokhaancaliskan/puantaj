import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getDb } from '../database/db';
import { WorkRecord } from '../database/recordPunch';
import { isHoliday } from './holidays';

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

export const setupNotificationCategories = async () => {
  await Notifications.setNotificationCategoryAsync('PUNCH_IN_CATEGORY', [
    { identifier: 'PUNCH_IN_ACTION', buttonTitle: 'Giriş Yap', options: { opensAppToForeground: true } }
  ]);
  
  await Notifications.setNotificationCategoryAsync('PUNCH_OUT_CATEGORY', [
    { identifier: 'PUNCH_OUT_ACTION', buttonTitle: 'Çıkış Yap', options: { opensAppToForeground: true } }
  ]);
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

    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    
    // Resmi tatil ise bildirim ayarlarına bak
    if (isHoliday(targetDate)) {
      const notifyOnHolidays = await AsyncStorage.getItem('notifyOnHolidays');
      // Eğer 'false' ise (bildirimler kapalıysa), bu günü atla
      if (notifyOnHolidays === 'false') continue;
    }

    const storedUserId = await AsyncStorage.getItem('userId');
    const userId = storedUserId || 'local_user';

    const parseTime = (timeStr: string | null, defHour: number, defMin: number) => {
      if (!timeStr) return { h: defHour, m: defMin };
      const [h, m] = timeStr.split(':');
      if (!h || !m) return { h: defHour, m: defMin };
      return { h: parseInt(h, 10), m: parseInt(m, 10) };
    };

    const wIn = parseTime(await AsyncStorage.getItem('weekdayIn'), 8, 30);
    const wOut = parseTime(await AsyncStorage.getItem('weekdayOut'), 18, 0);
    const sIn = parseTime(await AsyncStorage.getItem('saturdayIn'), 8, 30);
    const sOut = parseTime(await AsyncStorage.getItem('saturdayOut'), 13, 30);

    const dateStr = formatDate(targetDate);
    const record = await db.getFirstAsync<WorkRecord>(
      `SELECT * FROM work_records WHERE user_id = ? AND date = ?`,
      [userId, dateStr]
    );

    // İzinli gün ise bildirim planlama
    if (record && record.is_leave_day) continue;

    const hasIn = record && record.check_in_timestamp;
    const hasOut = record && record.check_out_timestamp;

    if (day === 6) { // Cumartesi
      if (!hasIn) {
        await scheduleForDate(targetDate, sIn.h, Math.max(0, sIn.m - 10), 'Giriş yapmayı unuttunuz mu?', 'Mesai başlamak üzere!', 'PUNCH_IN_CATEGORY');
        await scheduleForDate(targetDate, sIn.h + 1, sIn.m, 'Giriş hatırlatması', 'Hala giriş yapmadınız.', 'PUNCH_IN_CATEGORY');
      }
      if (!hasOut) {
        await scheduleForDate(targetDate, sOut.h, Math.max(0, sOut.m - 10), 'Çıkış yapmayı unuttunuz mu?', 'Mesai bitti!', 'PUNCH_OUT_CATEGORY');
        await scheduleForDate(targetDate, sOut.h + 1, sOut.m, 'Çıkış hatırlatması', 'Hala çıkış yapmadınız.', 'PUNCH_OUT_CATEGORY');
      }
    } else { // Hafta içi
      if (!hasIn) {
        await scheduleForDate(targetDate, wIn.h, Math.max(0, wIn.m - 10), 'Giriş yapmayı unuttunuz mu?', 'Mesai başlamak üzere!', 'PUNCH_IN_CATEGORY');
        await scheduleForDate(targetDate, wIn.h + 1, wIn.m, 'Giriş hatırlatması', 'Hala giriş yapmadınız.', 'PUNCH_IN_CATEGORY');
      }
      if (!hasOut) {
        await scheduleForDate(targetDate, wOut.h, Math.max(0, wOut.m - 10), 'Çıkış yapmayı unuttunuz mu?', 'Mesai bitti!', 'PUNCH_OUT_CATEGORY');
        await scheduleForDate(targetDate, wOut.h + 1, wOut.m, 'Çıkış hatırlatması', 'Hala çıkış yapmadınız.', 'PUNCH_OUT_CATEGORY');
      }
    }
  }
};

const scheduleForDate = async (date: Date, hour: number, minute: number, title: string, body: string, categoryIdentifier: string) => {
  const triggerDate = new Date(date);
  triggerDate.setHours(hour, minute, 0, 0);

  if (triggerDate.getTime() <= Date.now()) return;

  await Notifications.scheduleNotificationAsync({
    content: { title, body, categoryIdentifier },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
  });
};

export const scheduleLocalNotification = async (title: string, body: string) => {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null, // trigger immediately
  });
};
