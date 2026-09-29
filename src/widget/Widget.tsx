import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

interface PunchWidgetProps {
  punchType?: 'in' | 'out';
  lastPunchTime?: string | null;
  elapsedStr?: string | null;
}

export function PunchWidget({ punchType = 'in', lastPunchTime = null, elapsedStr = null }: PunchWidgetProps) {
  const isCheckedIn = punchType === 'out';
  // Use app's brand colors
  const actionColor = isCheckedIn ? '#EF4444' : '#2563EB'; // Red for Exit, Primary Blue for Enter
  const actionText = isCheckedIn ? 'Çıkış Yap' : 'Giriş Yap';
  const statusText = isCheckedIn ? '● Aktif Mesai' : '○ Mesai Dışı';
  const statusColor = isCheckedIn ? '#10B981' : '#64748B';

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF', // Modern light card
        borderRadius: 24,
        padding: 16,
      }}
    >
      {/* Header */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 4,
        }}
      >
        <TextWidget
          text="Puantajım"
          style={{
            fontSize: 15,
            fontFamily: 'System',
            color: '#334155',
            fontWeight: 'bold',
          }}
        />
        <FlexWidget
          style={{
            backgroundColor: isCheckedIn ? '#D1FAE5' : '#F1F5F9',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 12,
          }}
        >
          <TextWidget
            text={statusText}
            style={{
              fontSize: 12,
              color: statusColor,
              fontWeight: 'bold',
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* Last punch time */}
      <FlexWidget style={{ flexDirection: 'column', marginBottom: 12 }}>
        <TextWidget
          text={elapsedStr ? elapsedStr : "Son İşlem:"}
          style={{
            fontSize: 12,
            color: elapsedStr ? '#2563EB' : '#94A3B8',
            fontFamily: 'System',
            fontWeight: elapsedStr ? 'bold' : 'normal',
            marginBottom: 2,
          }}
        />
        <TextWidget
          text={lastPunchTime ? lastPunchTime : 'Henüz kayıt yok'}
          style={{
            fontSize: 14,
            color: '#1E293B',
            fontFamily: 'System',
            fontWeight: 'bold',
          }}
        />
      </FlexWidget>

      {/* Action Button */}
      <FlexWidget
        clickAction="PUNCH_ACTION"
        style={{
          backgroundColor: actionColor,
          borderRadius: 16,
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

interface DetailWidgetProps {
  punchType?: 'in' | 'out';
  elapsedStr?: string | null;
}

export function DetailWidget({ punchType = 'in', elapsedStr = null }: DetailWidgetProps) {
  const isCheckedIn = punchType === 'out';
  const actionColor = isCheckedIn ? '#EF4444' : '#2563EB';
  const actionText = isCheckedIn ? 'Çıkış Yap' : 'Giriş Yap';

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        paddingHorizontal: 20,
      }}
    >
      <FlexWidget style={{ flexDirection: 'column', justifyContent: 'center' }}>
        <TextWidget
          text="Puantajım"
          style={{ fontSize: 18, color: '#1E293B', fontWeight: 'bold' }}
        />
        <TextWidget
          text={elapsedStr ? elapsedStr : "İşlem bekliyor"}
          style={{ fontSize: 13, color: elapsedStr ? '#2563EB' : '#64748B', marginTop: 2, fontWeight: elapsedStr ? 'bold' : 'normal' }}
        />
      </FlexWidget>

      <FlexWidget
        clickAction="PUNCH_ACTION"
        style={{
          backgroundColor: actionColor,
          borderRadius: 16,
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
      >
        <TextWidget
          text={actionText}
          style={{ color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
