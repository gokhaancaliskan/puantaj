import React from 'react';
import { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { PunchWidget } from './Widget';
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

const getCurrentWidgetState = async (): Promise<{ punchType: 'in' | 'out'; lastPunchTime: string | null }> => {
  try {
    await initDb();
    const db = getDb();
    const now = new Date();
    const todayStr = formatDate(now);

    const record = await db.getFirstAsync<WorkRecord>(
      `SELECT * FROM work_records WHERE user_id = 'local_user' AND date = ?`,
      [todayStr]
    );

    if (record && record.check_in_timestamp && !record.check_out_timestamp) {
      return {
        punchType: 'out',
        lastPunchTime: `Giriş: ${formatTime(record.check_in_timestamp)}`,
      };
    } else if (record && record.check_out_timestamp) {
      return {
        punchType: 'in',
        lastPunchTime: `Çıkış: ${formatTime(record.check_out_timestamp)}`,
      };
    }
  } catch (e) {
    console.error('Widget state error:', e);
  }
  return { punchType: 'in', lastPunchTime: null };
};

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  if (props.widgetAction === 'WIDGET_ADDED' || props.widgetAction === 'WIDGET_UPDATE') {
    const state = await getCurrentWidgetState();
    props.renderWidget(
      <PunchWidget punchType={state.punchType} lastPunchTime={state.lastPunchTime} />
    );
  } else if (props.widgetAction === 'WIDGET_CLICK') {
    if (props.clickAction === 'PUNCH_ACTION') {
      try {
        const state = await getCurrentWidgetState();
        await recordPunch(state.punchType, 'widget');

        // Re-fetch updated state and re-render
        const newState = await getCurrentWidgetState();
        props.renderWidget(
          <PunchWidget punchType={newState.punchType} lastPunchTime={newState.lastPunchTime} />
        );
      } catch (e) {
        console.error('Widget punch error:', e);
      }
    }
  }
}
