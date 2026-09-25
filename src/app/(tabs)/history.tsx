import { View, Text, StyleSheet, FlatList, Pressable, Alert } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { Colors } from '../../constants/Colors';
import { getDb } from '../../database/db';
import { WorkRecord } from '../../database/recordPunch';
import { useFocusEffect } from 'expo-router';

export default function HistoryScreen() {
  const [records, setRecords] = useState<WorkRecord[]>([]);
  useFocusEffect(
    useCallback(() => {
      loadRecords();
    }, [])
  );

  const loadRecords = async () => {
    const db = getDb();
    const result = await db.getAllAsync<WorkRecord>(
      `SELECT * FROM work_records WHERE user_id = 'local_user' ORDER BY date DESC`
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
    Alert.alert(
      'Durum Değiştir',
      record.is_leave_day ? 'İzinli durumunu kaldır?' : 'Bu günü İzinli/Resmi Tatil olarak işaretle?',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Evet', onPress: () => toggleLeaveDay(record) }
      ]
    );
  };

  const formatTime = (ts: number | null) => {
    if (!ts) return '--:--';
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const renderItem = ({ item }: { item: WorkRecord }) => {
    const isMissing = (item.check_in_timestamp && !item.check_out_timestamp) || (!item.check_in_timestamp && item.check_out_timestamp);
    const bgColor = item.is_leave_day ? Colors.border : (isMissing ? '#3D2020' : Colors.card);
    const borderColor = isMissing ? Colors.error : Colors.border;

    return (
      <Pressable 
        onLongPress={() => handleLongPress(item)}
        style={[styles.card, { backgroundColor: bgColor, borderColor }]}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.dateText}>{item.date}</Text>
          {item.is_leave_day && <Text style={styles.leaveBadge}>İZİNLİ</Text>}
        </View>
        
        <View style={styles.timeContainer}>
          <View style={styles.timeBox}>
            <Text style={styles.timeLabel}>Giriş</Text>
            <Text style={styles.timeValue}>{formatTime(item.check_in_timestamp)}</Text>
          </View>
          <View style={styles.timeBox}>
            <Text style={styles.timeLabel}>Çıkış</Text>
            <Text style={styles.timeValue}>{formatTime(item.check_out_timestamp)}</Text>
          </View>
        </View>

        {isMissing && !item.is_leave_day && (
          <Text style={styles.errorText}>Eksik kayıt! Uzun basarak düzenleyin veya izinli işaretleyin.</Text>
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={records}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>Henüz kayıt yok.</Text>}
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
  },
  card: {
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  leaveBadge: {
    backgroundColor: Colors.primary,
    color: '#FFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 'bold',
    overflow: 'hidden',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  timeBox: {
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 12,
    color: Colors.lightText,
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginTop: 12,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.lightText,
    marginTop: 32,
    fontSize: 16,
  },
});
