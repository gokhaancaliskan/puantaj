import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { Colors } from '../../constants/Colors';
import { getDb } from '../../database/db';
import { WorkRecord } from '../../database/recordPunch';
import { useFocusEffect } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

export default function ReportScreen() {
  const [dailyStats, setDailyStats] = useState({ expected: 0, worked: 0, diff: 0 });
  const [weeklyStats, setWeeklyStats] = useState({ expected: 0, worked: 0, diff: 0 });
  const [monthlyStats, setMonthlyStats] = useState({ expected: 0, worked: 0, diff: 0 });
  
  const [weekDaysData, setWeekDaysData] = useState<{day: string, worked: number, expected: number}[]>([]);

  const [records, setRecords] = useState<WorkRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      calculateReport();
    }, [])
  );

  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).setHours(0,0,0,0);
  };

  const getStartOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).setHours(0,0,0,0);
  };

  const calculateReport = async () => {
    const db = getDb();
    const now = new Date();
    const todayStr = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()}`;
    const startOfWeekTime = getStartOfWeek(now);
    const startOfMonthTime = getStartOfMonth(now);
    
    // Fetch recent records, e.g. last 30 days
    const allRecords = await db.getAllAsync<WorkRecord>(
      `SELECT * FROM work_records WHERE user_id = 'local_user' ORDER BY check_in_timestamp DESC LIMIT 100`
    );

    setRecords(allRecords);

    let dExp = 0, dWork = 0;
    let wExp = 0, wWork = 0;
    let mExp = 0, mWork = 0;
    
    const weekMap: Record<string, number> = { 'Pzt': 0, 'Sal': 0, 'Çar': 0, 'Per': 0, 'Cum': 0, 'Cmt': 0, 'Paz': 0 };
    const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

    const nowTime = now.getTime();
    
    allRecords.forEach(record => {
      if (!record.check_in_timestamp) return;
      
      const recordDate = new Date(record.check_in_timestamp);
      const isToday = record.date === todayStr;
      const isThisWeek = record.check_in_timestamp >= startOfWeekTime;
      const isThisMonth = record.check_in_timestamp >= startOfMonthTime;

      let expected = 0;
      if (!record.is_leave_day) {
        if (record.day_type === 'weekday') expected = 9 * 60;
        else if (record.day_type === 'saturday') expected = 5 * 60;
      }

      let worked = 0;
      if (record.check_out_timestamp) {
        worked = Math.floor((record.check_out_timestamp - record.check_in_timestamp) / 60000);
      } else if (isToday) {
        // Günü bitirmemiş, şu ana kadar çalıştığı süreyi ekleyebiliriz (opsiyonel)
        worked = Math.floor((nowTime - record.check_in_timestamp) / 60000);
      }

      // Tolerans Mantığı: Eğer çalışılan süre bekleneni aştıysa (mesai varsa)
      // ve bu fazlalık 30 dakika veya daha az ise mesaiye sayma (beklenen süreye sabitle).
      // Ancak 30 dakikayı geçtiyse (örn. 35 dk), tamamını (35 dk) dahil et (18:00'den itibaren hesapla).
      if (expected > 0 && worked > expected) {
        const extraMinutes = worked - expected;
        if (extraMinutes <= 30) {
          worked = expected;
        }
      }

      // Sadece bitmiş günler için veya bugün çıkış yapılmışsa beklenen süreyi ekle
      // Böylece mesai devam ederken -9 saat hatası görünmez.
      const shouldCountExpected = (record.check_out_timestamp != null) || (!isToday && record.check_in_timestamp < nowTime);

      if (isToday) { 
        if (shouldCountExpected) dExp += expected; 
        dWork += worked; 
      }
      if (isThisWeek) { 
        if (shouldCountExpected) wExp += expected; 
        wWork += worked; 
        const dayName = dayNames[recordDate.getDay()];
        if (weekMap[dayName] !== undefined) weekMap[dayName] += worked;
      }
      if (isThisMonth) { 
        if (shouldCountExpected) mExp += expected; 
        mWork += worked; 
      }
    });

    setDailyStats({ expected: dExp, worked: dWork, diff: dWork - dExp });
    setWeeklyStats({ expected: wExp, worked: wWork, diff: wWork - wExp });
    setMonthlyStats({ expected: mExp, worked: mWork, diff: mWork - mExp });
    
    const chartData = [
      { day: 'Pzt', worked: weekMap['Pzt'], expected: 9*60 },
      { day: 'Sal', worked: weekMap['Sal'], expected: 9*60 },
      { day: 'Çar', worked: weekMap['Çar'], expected: 9*60 },
      { day: 'Per', worked: weekMap['Per'], expected: 9*60 },
      { day: 'Cum', worked: weekMap['Cum'], expected: 9*60 },
      { day: 'Cmt', worked: weekMap['Cmt'], expected: 5*60 },
      { day: 'Paz', worked: weekMap['Paz'], expected: 0 },
    ];
    setWeekDaysData(chartData);
  };

  const formatHours = (totalMinutes: number) => {
    const sign = totalMinutes < 0 ? '-' : '';
    const absMins = Math.abs(totalMinutes);
    const h = Math.floor(absMins / 60);
    const m = absMins % 60;
    return `${sign}${h}s ${m}d`;
  };

  const exportData = async () => {
    try {
      const csvHeader = "ID,Tarih,Giris,Cikis,GunTipi,IzinliMi\n";
      
      let csvContent = csvHeader;
      if (records && records.length > 0) {
        const csvRows = records.map(r => {
          const inTime = r.check_in_timestamp ? new Date(r.check_in_timestamp).toLocaleString('tr-TR') : 'Bilinmiyor';
          const outTime = r.check_out_timestamp ? new Date(r.check_out_timestamp).toLocaleString('tr-TR') : 'Devam Ediyor';
          
          let dayName = '';
          if (r.date) {
            const parts = r.date.split('.');
            if (parts.length === 3) {
              const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
              const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
              dayName = days[d.getDay()];
            }
          }
          const dateWithDay = `${r.date || ''} ${dayName}`.trim();
          
          return `${r.id || ''},${dateWithDay},${inTime},${outTime},${r.day_type || ''},${r.is_leave_day ? 'Evet' : 'Hayir'}`;
        });
        csvContent += csvRows.join('\n');
      } else {
        // Even if it's empty, we add a placeholder row or just leave it as header so it's not totally empty
        csvContent += "Kayit,Yok,-,-,-,-\n";
      }

      const filename = FileSystem.documentDirectory + 'puantaj_raporu.csv';
      await FileSystem.writeAsStringAsync(filename, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filename, { 
          mimeType: 'text/csv', 
          dialogTitle: 'Puantaj Raporu',
          UTI: 'public.comma-separated-values-text' // iOS
        });
      } else {
        Alert.alert('Bilgi', 'Paylaşım desteklenmiyor, ancak dosya oluşturuldu.');
      }
    } catch (e: any) {
      console.error('Export failed:', e);
      Alert.alert('Hata', 'Dışa aktarma başarısız oldu: ' + (e.message || 'Bilinmeyen hata'));
    }
  };

  const renderStatCard = (title: string, stats: { expected: number, worked: number, diff: number }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Beklenen:</Text>
        <Text style={styles.value}>{formatHours(stats.expected)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Gerçekleşen:</Text>
        <Text style={styles.value}>{formatHours(stats.worked)}</Text>
      </View>
      <View style={[styles.row, styles.highlightRow]}>
        <Text style={styles.label}>Fark:</Text>
        <Text style={[styles.value, { color: stats.diff >= 0 ? Colors.success : Colors.error }]}>
          {formatHours(stats.diff)}
        </Text>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {renderStatCard('Bugün', dailyStats)}
      {renderStatCard('Bu Hafta', weeklyStats)}
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Haftalık Grafik (Çalışılan / Beklenen)</Text>
        <View style={styles.chartContainer}>
          {weekDaysData.map((d, i) => {
            const maxMins = 12 * 60; // 12 hours max scale
            const fillHeight = Math.min((d.worked / maxMins) * 100, 100);
            const expectHeight = Math.min((d.expected / maxMins) * 100, 100);
            return (
              <View key={i} style={styles.chartCol}>
                <View style={styles.barContainer}>
                  <View style={[styles.expectBar, { height: `${expectHeight}%` }]} />
                  <View style={[styles.workBar, { height: `${fillHeight}%` }]} />
                </View>
                <Text style={styles.chartLabel}>{d.day}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {renderStatCard('Bu Ay', monthlyStats)}

      <Pressable style={styles.button} onPress={exportData}>
        <Text style={styles.buttonText}>CSV Olarak Dışa Aktar</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingTop: 60 },
  card: {
    backgroundColor: Colors.card, padding: 20, borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
    marginBottom: 20,
  },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginBottom: 16, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  highlightRow: { marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  label: { fontSize: 14, color: Colors.lightText },
  value: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  button: { backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 12, marginBottom: 40 },
  buttonText: { color: Colors.text, fontSize: 16, fontWeight: 'bold' },
  chartContainer: { flexDirection: 'row', justifyContent: 'space-between', height: 140, alignItems: 'flex-end', marginTop: 10 },
  chartCol: { alignItems: 'center', width: 34 },
  barContainer: { height: 120, width: 14, backgroundColor: Colors.border, borderRadius: 7, justifyContent: 'flex-end', overflow: 'hidden' },
  expectBar: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: Colors.lightText, opacity: 0.3 },
  workBar: { width: '100%', backgroundColor: Colors.primary, opacity: 0.9 },
  chartLabel: { marginTop: 8, fontSize: 12, color: Colors.lightText }
});
