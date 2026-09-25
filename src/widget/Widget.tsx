import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

interface PunchWidgetProps {
  punchType?: 'in' | 'out';
  lastPunchTime?: string | null;
}

export function PunchWidget({ punchType = 'in', lastPunchTime = null }: PunchWidgetProps) {
  const isCheckedIn = punchType === 'out'; // if next punch is 'out', currently checked in
  const actionColor = isCheckedIn ? '#EF4444' : '#3B82F6'; // red = checked in (exit), blue = checked out (enter)
  const actionText = isCheckedIn ? 'Çıkış Yap' : 'Giriş Yap';
  const statusText = isCheckedIn ? '● Aktif Mesai' : '○ Mesai Dışı';
  const statusColor = isCheckedIn ? '#10B981' : '#94A3B8';

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'stretch',
        backgroundColor: '#0F172A',
        borderRadius: 20,
        padding: 16,
      }}
    >
      {/* Header */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <TextWidget
          text="Puantajım"
          style={{
            fontSize: 14,
            fontFamily: 'System',
            color: '#94A3B8',
            fontWeight: 'bold',
          }}
        />
        <TextWidget
          text={statusText}
          style={{
            fontSize: 12,
            color: statusColor,
            fontWeight: 'bold',
          }}
        />
      </FlexWidget>

      {/* Last punch time */}
      <TextWidget
        text={lastPunchTime ? lastPunchTime : 'Henüz kayıt yok'}
        style={{
          fontSize: 13,
          color: '#F8FAFC',
          fontFamily: 'System',
          marginBottom: 12,
        }}
      />

      {/* Action Button */}
      <FlexWidget
        clickAction="PUNCH_ACTION"
        style={{
          backgroundColor: actionColor,
          borderRadius: 14,
          paddingVertical: 14,
          paddingHorizontal: 16,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <TextWidget
          text={actionText}
          style={{
            fontSize: 16,
            color: '#FFFFFF',
            fontWeight: 'bold',
            fontFamily: 'System',
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
