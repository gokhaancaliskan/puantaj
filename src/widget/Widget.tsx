import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

interface PunchWidgetProps {
  punchType?: 'in' | 'out';
  lastPunchTime?: string | null;
  elapsedStr?: string | null;
  weatherEmoji?: string | null;
  weatherTemp?: string | null;
}

export function PunchWidget({ punchType = 'in', lastPunchTime = null, elapsedStr = null, weatherEmoji = null, weatherTemp = null }: PunchWidgetProps) {
  const isCheckedIn = punchType === 'out';
  const actionColor = isCheckedIn ? '#EF4444' : '#4F46E5'; 
  const actionText = isCheckedIn ? 'ÇIKIŞ YAP' : 'GİRİŞ YAP';
  
  const now = new Date();
  const dateStr = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()}`;
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 16,
      }}
    >
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <FlexWidget style={{ flexDirection: 'column' }}>
          <TextWidget text={timeStr} style={{ fontSize: 28, color: '#1E293B', fontWeight: 'bold' }} />
          <TextWidget text={dateStr} style={{ fontSize: 13, color: '#64748B', fontWeight: 'bold' }} />
        </FlexWidget>
        
        {weatherEmoji && (
          <FlexWidget style={{ flexDirection: 'column', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}>
            <TextWidget text={weatherEmoji} style={{ fontSize: 20 }} />
            <TextWidget text={weatherTemp || ''} style={{ fontSize: 12, color: '#475569', fontWeight: 'bold', marginTop: 2 }} />
          </FlexWidget>
        )}
      </FlexWidget>

      <FlexWidget style={{ flexDirection: 'column', marginTop: 12, marginBottom: 12, alignItems: 'center' }}>
        <TextWidget
          text={elapsedStr ? elapsedStr : (lastPunchTime || 'Kayıt Bekleniyor')}
          style={{
            fontSize: elapsedStr ? 16 : 14,
            color: elapsedStr ? actionColor : '#64748B',
            fontWeight: 'bold',
          }}
        />
      </FlexWidget>

      <FlexWidget
        clickAction="PUNCH_ACTION"
        style={{
          backgroundColor: actionColor,
          borderRadius: 18,
          paddingVertical: 14,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <TextWidget text={actionText} style={{ fontSize: 16, color: '#FFFFFF', fontWeight: 'bold' }} />
      </FlexWidget>
    </FlexWidget>
  );
}

interface DetailWidgetProps {
  punchType?: 'in' | 'out';
  elapsedStr?: string | null;
}

export function DetailWidget({ punchType = 'in', elapsedStr = null }: DetailWidgetProps) {
  const isCheckedIn = punchType === 'out';
  const actionColor = isCheckedIn ? '#EF4444' : '#4F46E5';
  const actionText = isCheckedIn ? 'ÇIKIŞ YAP' : 'GİRİŞ YAP';

  return (
    <FlexWidget
      clickAction="PUNCH_ACTION"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        backgroundColor: actionColor,
        borderRadius: 24,
        padding: 8,
      }}
    >
      <TextWidget text={actionText} style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }} />
      {elapsedStr && (
        <TextWidget text={elapsedStr} style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 4, fontWeight: 'bold' }} />
      )}
    </FlexWidget>
  );
}
