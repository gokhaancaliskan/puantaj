import { View, Text, StyleSheet, FlatList, Pressable, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useEffect, useState, useCallback } from 'react';
import { Colors } from '../../constants/Colors';
import { getDb } from '../../database/db';
import { WorkRecord } from '../../database/recordPunch';
import { useFocusEffect } from 'expo-router';
import { getPublicHolidayName } from '../../utils/holidays';

export default function HistoryScreen() {
  const [records, setRecords] = useState<WorkRecord[]>([]);
  useFocusEffect(
    useCallback(() => {
      loadRecords();
    }, [])
  );

  const loadRecords = async () => {
    const db = getDb();
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const storedUserId = await AsyncStorage.getItem('userId');
    const userId = storedUserId || 'local_user';
    const result = await db.getAllAsync<WorkRecord>(
      `SELECT * FROM work_records WHERE user_id = ? ORDER BY date DESC`,
      [userId]
    );
    setRecords(result);
  };

  const toggleLeaveDay = async (record: WorkRecord) => {
    const db = getDb();
    const newValue = record.is_leave_day ? 0 : 1;
    await db.runAsync(
      `UPDATE work_records SET is_leave_day = ?, last_edited_at = ?, synced_at = NULL WHERE id = ?`,
      [newValue, Date.now(), record.id]
    );
    loadRecords();
    
    try {
      const { scheduleNotificationsForWeek } = require('../../utils/notifications');
      await scheduleNotificationsForWeek();
    } catch (e) {
      console.error('Failed to reschedule notifications:', e);
    }
  };

  const handleLongPress = (record: WorkRecord) => {
    const holidayName = getPublicHolidayName(record.date);
    const titleMessage = holidayName ? `Bu tarih: ${holidayName}` : 'Durum Değiştir';
    
    if (record.is_leave_day) {
      Alert.alert(
        titleMessage,
        'Bu gün şu anda İzinli/Tatil olarak işaretli. İptal edip normal çalışma gününe çevirmek ister misiniz?',
        [
          { text: 'Hayır', style: 'cancel' },
          { text: 'Evet, Normal Gün Yap', onPress: () => toggleLeaveDay(record) }
        ]
      );
    } else {
      Alert.alert(
        titleMessage,
        'Bu günü İzinli (veya Özel Tatil) olarak işaretlemek istiyor musunuz? İşaretlediğinizde beklenen çalışma süresine dahil edilmeyecektir.',
        [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'İzinli / Tatil Olarak İşaretle', onPress: () => toggleLeaveDay(record) }
        ]
      );
    }
  };

  const formatTime = (ts: number | null) => {
    if (!ts) return '--:--';
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const renderItem = ({ item }: { item: WorkRecord }) => {
    const isMissing = (item.check_in_timestamp && !item.check_out_timestamp) || (!item.check_in_timestamp && item.check_out_timestamp);
    const bgColor = item.is_leave_day ? '#F3F4F6' : (isMissing ? '#FEF2F2' : Colors.card);
    const borderColor = item.is_leave_day ? '#D1D5DB' : (isMissing ? Colors.error : 'transparent');

    return (
      <Pressable 
        onLongPress={() => handleLongPress(item)}
        style={[styles.card, { backgroundColor: bgColor, borderColor: borderColor, borderWidth: isMissing || item.is_leave_day ? 1 : 0 }]}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.iconContainer, { backgroundColor: item.is_leave_day ? '#D1D5DB' : (isMissing ? '#FCA5A5' : '#E0E7FF') }]}>
              <Feather name={item.is_leave_day ? "coffee" : (isMissing ? "alert-circle" : "calendar")} size={20} color={item.is_leave_day ? "#4B5563" : (isMissing ? "#991B1B" : Colors.primary)} />
            </View>
            <View>
              <Text style={styles.dateText}>{item.date}</Text>
              {getPublicHolidayName(item.date) ? (
                <Text style={{ fontSize: 12, color: Colors.primary, marginTop: 2, fontWeight: 'bold' }}>
                  {getPublicHolidayName(item.date)}
                </Text>
              ) : null}
            </View>
          </View>
          {item.is_leave_day ? <Text style={styles.leaveBadge}>İZİNLİ / TATİL</Text> : null}
        </View>
        
        {!item.is_leave_day && (
          <View style={styles.timeContainer}>
            <View style={styles.timeBox}>
              <Text style={styles.timeLabel}>Giriş</Text>
              <Text style={styles.timeValue}>{formatTime(item.check_in_timestamp)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.timeBox}>
              <Text style={styles.timeLabel}>Çıkış</Text>
              <Text style={styles.timeValue}>{formatTime(item.check_out_timestamp)}</Text>
            </View>
          </View>
        )}

        {(isMissing && !item.is_leave_day) ? (
          <View style={styles.errorContainer}>
            <Feather name="info" size={14} color={Colors.error} />
            <Text style={styles.errorText}>Eksik kayıt! Düzenlemek için uzun basın.</Text>
          </View>
        ) : null}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={records}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{alignItems: 'center', marginTop: 50}}>
            <Feather name="inbox" size={48} color={Colors.border} />
            <Text style={styles.emptyText}>Henüz geçmiş kaydınız bulunmuyor.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    padding: 16,
    paddingTop: 12,
  },
  card: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    flexDirection: 'column',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  leaveBadge: {
    backgroundColor: Colors.primary,
    color: '#FFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 10,
    fontWeight: '800',
    overflow: 'hidden',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginLeft: 46,
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  timeBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 12,
    color: Colors.lightText,
    marginRight: 6,
    fontWeight: '500',
  },
  timeValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
    marginLeft: 46,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.lightText,
    marginTop: 16,
    fontSize: 15,
    fontWeight: '500',
  },
});
