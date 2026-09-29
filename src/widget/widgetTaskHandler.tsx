import React from 'react';
import { WidgetTaskHandlerProps, requestWidgetUpdate } from 'react-native-android-widget';
import { PunchWidget, DetailWidget } from './Widget';
import { recordPunch, PunchType, WorkRecord } from '../database/recordPunch';
import { getDb, initDb } from '../database/db';

const formatDate = (date: Date): string => {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
};

const formatTime = (ts: number): string => {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

const getCurrentWidgetState = async (): Promise<{ punchType: 'in' | 'out'; lastPunchTime: string | null; elapsedStr: string | null }> => {
  try {
    await initDb();
    const db = getDb();
    const now = new Date();
    const todayStr = formatDate(now);

    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const storedUserId = await AsyncStorage.getItem('userId');
    const userId = storedUserId || 'local_user';

    let record = await db.getFirstAsync<WorkRecord>(
      `SELECT * FROM work_records WHERE user_id = ? AND date = ? AND check_in_timestamp IS NOT NULL AND check_out_timestamp IS NULL ORDER BY check_in_timestamp DESC`,
      [userId, todayStr]
    );

    if (!record) {
      record = await db.getFirstAsync<WorkRecord>(
        `SELECT * FROM work_records WHERE user_id = ? AND date = ? ORDER BY check_in_timestamp DESC`,
        [userId, todayStr]
      );
    }

    if (record && record.check_in_timestamp && !record.check_out_timestamp) {
      // Aktif olarak çalışıyor, süreyi hesapla
      const diffMs = now.getTime() - record.check_in_timestamp;
      const diffMins = Math.floor(diffMs / 60000);
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      let elapsedStr = '';
      if (hours > 0) elapsedStr = `${hours}s ${mins}d`;
      else elapsedStr = `${mins} dk`;

      return {
        punchType: 'out',
        lastPunchTime: `Giriş: ${formatTime(record.check_in_timestamp)}`,
        elapsedStr: `Çalışma: ${elapsedStr}`
      };
    } else if (record && record.check_out_timestamp) {
      return {
        punchType: 'in',
        lastPunchTime: `Çıkış: ${formatTime(record.check_out_timestamp)}`,
        elapsedStr: null
      };
    }
  } catch (e) {
    console.error('Widget state error:', e);
  }
  return { punchType: 'in', lastPunchTime: null, elapsedStr: null };
};

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo;
  
  if (props.widgetAction === 'WIDGET_ADDED' || props.widgetAction === 'WIDGET_UPDATE') {
    const state = await getCurrentWidgetState();
    
    if (widgetInfo.widgetName === 'DetailWidget') {
      props.renderWidget(<DetailWidget punchType={state.punchType} elapsedStr={state.elapsedStr} />);
    } else {
      props.renderWidget(<PunchWidget punchType={state.punchType} lastPunchTime={state.lastPunchTime} elapsedStr={state.elapsedStr} />);
    }
  } else if (props.widgetAction === 'WIDGET_CLICK') {
    if (props.clickAction === 'PUNCH_ACTION') {
      try {
        const state = await getCurrentWidgetState();
        await recordPunch(state.punchType, 'widget');

        // İşlem yapıldı, yeni durumu çek ve renderla
        const newState = await getCurrentWidgetState();
        if (widgetInfo.widgetName === 'DetailWidget') {
          props.renderWidget(<DetailWidget punchType={newState.punchType} elapsedStr={newState.elapsedStr} />);
        } else {
          props.renderWidget(
            <PunchWidget punchType={newState.punchType} lastPunchTime={newState.lastPunchTime} elapsedStr={newState.elapsedStr} />
          );
        }
      } catch (e) {
        console.error('Widget punch error:', e);
      }
    }
  }
}
