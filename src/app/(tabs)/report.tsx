import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { Colors } from '../../constants/Colors';
import { getDb } from '../../database/db';
import { WorkRecord } from '../../database/recordPunch';
import { useFocusEffect } from 'expo-router';
import { getPublicHolidayName } from '../../utils/holidays';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';

export default function ReportScreen() {
  const [dailyStats, setDailyStats] = useState({ expected: 0, worked: 0, diff: 0, earnedDiff: 0, wage: 0 });
  const [weeklyStats, setWeeklyStats] = useState({ expected: 0, worked: 0, diff: 0, earnedDiff: 0, wage: 0 });
  const [monthlyStats, setMonthlyStats] = useState({ expected: 0, worked: 0, diff: 0, earnedDiff: 0, wage: 0 });
  const [hourlyWage, setHourlyWage] = useState(0);
  
  const [weekDaysData, setWeekDaysData] = useState<{day: string, worked: number, expected: number}[]>([]);

  const [records, setRecords] = useState<WorkRecord[]>([]);
  const [todayPunches, setTodayPunches] = useState<{in: string, out: string}[]>([]);

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

  async function calculateReport() {
    const db = getDb();
    const now = new Date();
    const todayStr = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()}`;
    const startOfWeekTime = getStartOfWeek(now);
    const startOfMonthTime = getStartOfMonth(now);
    
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const storedUserId = await AsyncStorage.getItem('userId');
    const userId = storedUserId || 'local_user';

    const whStr = await AsyncStorage.getItem('weekdayHours');
    const shStr = await AsyncStorage.getItem('saturdayHours');
    const weekdayExpectedHours = whStr ? parseFloat(whStr) : 9;
    const saturdayExpectedHours = shStr ? parseFloat(shStr) : 5;
    
    const hwStr = await AsyncStorage.getItem('hourlyWage');
    const hWage = hwStr ? parseFloat(hwStr) : 0;
    setHourlyWage(hWage);

    // Fetch recent records, e.g. last 30 days
    const allRecords = await db.getAllAsync<WorkRecord>(
      `SELECT * FROM work_records WHERE user_id = ? ORDER BY check_in_timestamp DESC LIMIT 100`,
      [userId]
    );

    setRecords(allRecords);

    let dExp = 0, dWork = 0, dEarned = 0, dPayable = 0;
    let wExp = 0, wWork = 0, wEarned = 0, wPayable = 0;
    let mExp = 0, mWork = 0, mEarned = 0, mPayable = 0;
    
    const weekMap: Record<string, number> = { 'Pzt': 0, 'Sal': 0, 'Çar': 0, 'Per': 0, 'Cum': 0, 'Cmt': 0, 'Paz': 0 };
    const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

    const nowTime = now.getTime();
    
    const groupedRecords: Record<string, {
      dateStr: string,
      day_type: string,
      is_leave_day: boolean,
      isPublicHoliday: boolean,
      workedMins: number,
      check_in_timestamp: number,
      check_out_timestamp: number | null
    }> = {};

    allRecords.forEach(record => {
      if (!record.check_in_timestamp) return;

      const dateStr = record.date;
      if (!groupedRecords[dateStr]) {
        groupedRecords[dateStr] = {
          dateStr,
          day_type: record.day_type,
          is_leave_day: !!record.is_leave_day,
          isPublicHoliday: !!getPublicHolidayName(dateStr),
          workedMins: 0,
          check_in_timestamp: record.check_in_timestamp,
          check_out_timestamp: record.check_out_timestamp
        };
      }

      let w = 0;
      if (record.check_out_timestamp) {
        w = Math.floor((record.check_out_timestamp - record.check_in_timestamp) / 60000);
      } else if (dateStr === todayStr) {
        w = Math.floor((nowTime - record.check_in_timestamp) / 60000);
      }
      groupedRecords[dateStr].workedMins += w;
      
      // En son çıkışı güncelle (günün bittiğini anlamak için)
      if (!record.check_out_timestamp) {
        groupedRecords[dateStr].check_out_timestamp = null; // hala açık
      }
    });

    const punchesForToday: {in: string, out: string}[] = [];
    allRecords.filter(r => r.date === todayStr).sort((a,b) => (a.check_in_timestamp||0) - (b.check_in_timestamp||0)).forEach(r => {
      if (r.check_in_timestamp) {
        const dIn = new Date(r.check_in_timestamp);
        const inStr = `${dIn.getHours().toString().padStart(2, '0')}:${dIn.getMinutes().toString().padStart(2, '0')}`;
        let outStr = 'Devam Ediyor';
        if (r.check_out_timestamp) {
          const dOut = new Date(r.check_out_timestamp);
          outStr = `${dOut.getHours().toString().padStart(2, '0')}:${dOut.getMinutes().toString().padStart(2, '0')}`;
        }
        punchesForToday.push({ in: inStr, out: outStr });
      }
    });
    setTodayPunches(punchesForToday);

    Object.values(groupedRecords).forEach(dayRecord => {
      const isToday = dayRecord.dateStr === todayStr;
      const isThisWeek = dayRecord.check_in_timestamp >= startOfWeekTime;
      const isThisMonth = dayRecord.check_in_timestamp >= startOfMonthTime;

      let expected = 0;
      if (!dayRecord.is_leave_day && !dayRecord.isPublicHoliday) {
        if (dayRecord.day_type === 'weekday') expected = weekdayExpectedHours * 60;
        else if (dayRecord.day_type === 'saturday') expected = saturdayExpectedHours * 60;
      }

      let worked = dayRecord.workedMins;

      if (expected > 0 && worked > expected) {
        const extraMinutes = worked - expected;
        if (extraMinutes <= 30) {
          worked = expected;
        }
      }

      const shouldCountExpected = (dayRecord.check_out_timestamp != null) || (!isToday && dayRecord.check_in_timestamp < nowTime);
      let finalExpected = shouldCountExpected ? expected : 0;
      
      let diff = worked - finalExpected;
      let earnedDiff = diff;
      
      if (diff > 0) {
        if (dayRecord.is_leave_day || dayRecord.isPublicHoliday) {
          earnedDiff = diff * 2; 
        } else if (shouldCountExpected) {
          earnedDiff = diff * 1.5; 
        }
      }

      let payableMins = finalExpected + earnedDiff;
      if (diff < 0) {
        payableMins = worked;
      }

      if (isToday) { 
        if (shouldCountExpected) dExp += expected; 
        dWork += worked; 
        dEarned += earnedDiff;
        dPayable += payableMins;
      }
      if (isThisWeek) { 
        if (shouldCountExpected) wExp += expected; 
        wWork += worked; 
        wEarned += earnedDiff;
        wPayable += payableMins;
        const recordDate = new Date(dayRecord.check_in_timestamp);
        const dayName = dayNames[recordDate.getDay()];
        if (weekMap[dayName] !== undefined) weekMap[dayName] += worked;
      }
      if (isThisMonth) { 
        if (shouldCountExpected) mExp += expected; 
        mWork += worked; 
        mEarned += earnedDiff;
        mPayable += payableMins;
      }
    });

    setDailyStats({ expected: dExp, worked: dWork, diff: dWork - dExp, earnedDiff: dEarned, wage: (dPayable / 60) * hWage });
    setWeeklyStats({ expected: wExp, worked: wWork, diff: wWork - wExp, earnedDiff: wEarned, wage: (wPayable / 60) * hWage });
    setMonthlyStats({ expected: mExp, worked: mWork, diff: mWork - mExp, earnedDiff: mEarned, wage: (mPayable / 60) * hWage });
    
    const chartData = [
      { day: 'Pzt', worked: weekMap['Pzt'], expected: weekdayExpectedHours*60 },
      { day: 'Sal', worked: weekMap['Sal'], expected: weekdayExpectedHours*60 },
      { day: 'Çar', worked: weekMap['Çar'], expected: weekdayExpectedHours*60 },
      { day: 'Per', worked: weekMap['Per'], expected: weekdayExpectedHours*60 },
      { day: 'Cum', worked: weekMap['Cum'], expected: weekdayExpectedHours*60 },
      { day: 'Cmt', worked: weekMap['Cmt'], expected: saturdayExpectedHours*60 },
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
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const userEmail = await AsyncStorage.getItem('userEmail') || 'Bilinmiyor';

      const whStr = await AsyncStorage.getItem('weekdayHours');
      const shStr = await AsyncStorage.getItem('saturdayHours');
      const weekdayExpectedHours = whStr ? parseFloat(whStr) : 9;
      const saturdayExpectedHours = shStr ? parseFloat(shStr) : 5;

      const csvHeader = "Çalışan;Tarih;Giriş;Çıkış;Gün Tipi;Tatil / İzin;Gerçekleşen Saat;Normal Fark;Hak Edilen Fark (Çarpanlı)\n";
      let csvContent = "\uFEFF" + csvHeader;
      if (records && records.length > 0) {
        const exportsGroup: Record<string, any> = {};
        records.forEach(r => {
          if (!r.check_in_timestamp) return;
          const dateStr = r.date || '';
          if (!exportsGroup[dateStr]) {
            let dayName = '';
            const parts = dateStr.split('.');
            if (parts.length === 3) {
              const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
              const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
              dayName = days[d.getDay()];
            }
            exportsGroup[dateStr] = {
              dateStr,
              dayName,
              day_type: r.day_type,
              is_leave_day: !!r.is_leave_day,
              isPublicHoliday: !!getPublicHolidayName(dateStr),
              workedMins: 0,
              inTimes: [],
              outTimes: []
            };
          }
          const inDate = new Date(r.check_in_timestamp);
          exportsGroup[dateStr].inTimes.push(`${inDate.getHours().toString().padStart(2, '0')}:${inDate.getMinutes().toString().padStart(2, '0')}`);
          
          let w = 0;
          if (r.check_out_timestamp) {
            const outDate = new Date(r.check_out_timestamp);
            exportsGroup[dateStr].outTimes.push(`${outDate.getHours().toString().padStart(2, '0')}:${outDate.getMinutes().toString().padStart(2, '0')}`);
            w = Math.floor((r.check_out_timestamp - r.check_in_timestamp) / 60000);
          } else {
            exportsGroup[dateStr].outTimes.push('-');
            const td = new Date();
            const todayStr = `${td.getDate().toString().padStart(2, '0')}.${(td.getMonth() + 1).toString().padStart(2, '0')}.${td.getFullYear()}`;
            if (dateStr === todayStr) {
              w = Math.floor((td.getTime() - r.check_in_timestamp) / 60000);
            }
          }
          exportsGroup[dateStr].workedMins += w;
        });

        const csvRows = Object.values(exportsGroup).map(g => {
          const dateWithDay = `${g.dateStr} ${g.dayName}`.trim();
          const inTime = g.inTimes.join(', ');
          const outTime = g.outTimes.join(', ');

          let expected = 0;
          if (!g.is_leave_day && !g.isPublicHoliday) {
            if (g.day_type === 'weekday') expected = weekdayExpectedHours * 60;
            else if (g.day_type === 'saturday') expected = saturdayExpectedHours * 60;
          }

          let worked = g.workedMins;
          if (expected > 0 && worked > expected) {
            const extraMinutes = worked - expected;
            if (extraMinutes <= 30) worked = expected;
          }
          const diff = worked - expected;
          let earnedDiff = diff;
          if (diff > 0) {
            if (g.is_leave_day || g.isPublicHoliday) earnedDiff = diff * 2;
            else earnedDiff = diff * 1.5;
          }
          
          return `${userEmail};${dateWithDay};${inTime};${outTime};${g.day_type === 'weekday' ? 'Hafta İçi' : g.day_type === 'saturday' ? 'Cumartesi' : 'Pazar'};${g.is_leave_day ? 'Evet' : 'Hayır'};${formatHours(worked)};${formatHours(diff)};${formatHours(earnedDiff)}`;
        });
        csvContent += csvRows.join('\n');
      } else {
        csvContent += "-;-;-;-;-;-;-;-;-\n";
      }

      const filename = (FileSystem as any).documentDirectory + 'puantaj_raporu.csv';
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

  const exportPdf = async () => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const userEmail = await AsyncStorage.getItem('userEmail') || 'Bilinmiyor';

      const whStr = await AsyncStorage.getItem('weekdayHours');
      const shStr = await AsyncStorage.getItem('saturdayHours');
      const weekdayExpectedHours = whStr ? parseFloat(whStr) : 9;
      const saturdayExpectedHours = shStr ? parseFloat(shStr) : 5;

      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica'; padding: 20px; }
              h1 { text-align: center; color: #333; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            <h1>Puantaj Raporu</h1>
            <table>
              <tr><th>Tarih</th><th>Giriş</th><th>Çıkış</th><th>Gün Tipi</th><th>Tatil / İzin</th><th>Gerçekleşen</th><th>Normal Fark</th><th>Hak Edilen</th></tr>
              ${(() => {
                const exportsGroup: Record<string, any> = {};
                records.forEach(r => {
                  if (!r.check_in_timestamp) return;
                  const dateStr = r.date || '';
                  if (!exportsGroup[dateStr]) {
                    exportsGroup[dateStr] = {
                      dateStr,
                      day_type: r.day_type,
                      is_leave_day: !!r.is_leave_day,
                      isPublicHoliday: !!getPublicHolidayName(dateStr),
                      workedMins: 0,
                      inTimes: [],
                      outTimes: []
                    };
                  }
                  const inDate = new Date(r.check_in_timestamp);
                  exportsGroup[dateStr].inTimes.push(`${inDate.getHours().toString().padStart(2, '0')}:${inDate.getMinutes().toString().padStart(2, '0')}`);
                  
                  let w = 0;
                  if (r.check_out_timestamp) {
                    const outDate = new Date(r.check_out_timestamp);
                    exportsGroup[dateStr].outTimes.push(`${outDate.getHours().toString().padStart(2, '0')}:${outDate.getMinutes().toString().padStart(2, '0')}`);
                    w = Math.floor((r.check_out_timestamp - r.check_in_timestamp) / 60000);
                  } else {
                    exportsGroup[dateStr].outTimes.push('-');
                    const td = new Date();
                    const todayStr = `${td.getDate().toString().padStart(2, '0')}.${(td.getMonth() + 1).toString().padStart(2, '0')}.${td.getFullYear()}`;
                    if (dateStr === todayStr) {
                      w = Math.floor((td.getTime() - r.check_in_timestamp) / 60000);
                    }
                  }
                  exportsGroup[dateStr].workedMins += w;
                });

                return Object.values(exportsGroup).map(g => {
                  const inTime = g.inTimes.join(', ');
                  const outTime = g.outTimes.join(', ');

                  let expected = 0;
                  if (!g.is_leave_day && !g.isPublicHoliday) {
                    if (g.day_type === 'weekday') expected = weekdayExpectedHours * 60;
                    else if (g.day_type === 'saturday') expected = saturdayExpectedHours * 60;
                  }

                  let worked = g.workedMins;
                  if (expected > 0 && worked > expected) {
                    const extraMinutes = worked - expected;
                    if (extraMinutes <= 30) worked = expected;
                  }
                  const diff = worked - expected;
                  let earnedDiff = diff;
                  if (diff > 0) {
                    if (g.is_leave_day || g.isPublicHoliday) earnedDiff = diff * 2;
                    else earnedDiff = diff * 1.5;
                  }
                  
                  return `
                    <tr>
                      <td>${g.dateStr}</td>
                      <td>${inTime}</td>
                      <td>${outTime}</td>
                      <td>${g.is_leave_day ? 'Evet' : 'Hayır'}</td>
                      <td>${formatHours(worked)}</td>
                      <td>${formatHours(diff)}</td>
                      <td>${formatHours(earnedDiff)}</td>
                    </tr>
                  `;
                }).join('');
              })()}
            </table>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Raporu Paylaş' });
      } else {
        Alert.alert('Hata', 'Paylaşım özelliği bu cihazda desteklenmiyor.');
      }
    } catch (e: any) {
      console.error('PDF Export failed:', e);
      Alert.alert('Hata', 'PDF dışa aktarma başarısız oldu: ' + e.message);
    }
  };

  const [activeTab, setActiveTab] = useState<'today'|'week'|'month'>('today');

  const renderStatCard = (stats: { expected: number, worked: number, diff: number, earnedDiff: number, wage: number }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.label}>Hedeflenen Mesai:</Text>
        <Text style={styles.value}>{formatHours(stats.expected)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Gerçekleşen Mesai:</Text>
        <Text style={styles.value}>{formatHours(stats.worked)}</Text>
      </View>
      <View style={[styles.row, styles.highlightRow]}>
        <Text style={styles.label}>Mesai Farkı (Eksik/Fazla):</Text>
        <Text style={[styles.value, { color: stats.diff >= 0 ? Colors.success : Colors.error }]}>
          {formatHours(stats.diff)}
        </Text>
      </View>
      {/* Hide this row if the user doesn't need to see the multiplier calculation unless wage is > 0 or they want it. 
          To simplify, let's keep it but rename it. */}
      {stats.diff > 0 && (
        <View style={[styles.row, { marginTop: 4 }]}>
          <Text style={[styles.label, { color: Colors.primary, fontWeight: 'bold' }]}>Tatil/Mesai Çarpanlı Fark:</Text>
          <Text style={[styles.value, { color: stats.earnedDiff >= 0 ? Colors.success : Colors.error }]}>
            {formatHours(stats.earnedDiff)}
          </Text>
        </View>
      )}
      {hourlyWage > 0 && (
        <View style={[styles.row, { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border }]}>
          <Text style={[styles.label, { color: Colors.success, fontWeight: 'bold', fontSize: 16 }]}>Tahmini Kazanç:</Text>
          <Text style={[styles.value, { color: Colors.success, fontSize: 18 }]}>
            {stats.wage.toFixed(2)} ₺
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      
      {/* Segmented Control */}
      <View style={styles.tabContainer}>
        <Pressable style={[styles.tabButton, activeTab === 'today' && styles.tabButtonActive]} onPress={() => setActiveTab('today')}>
          <Text style={[styles.tabText, activeTab === 'today' && styles.tabTextActive]}>Bugün</Text>
        </Pressable>
        <Pressable style={[styles.tabButton, activeTab === 'week' && styles.tabButtonActive]} onPress={() => setActiveTab('week')}>
          <Text style={[styles.tabText, activeTab === 'week' && styles.tabTextActive]}>Bu Hafta</Text>
        </Pressable>
        <Pressable style={[styles.tabButton, activeTab === 'month' && styles.tabButtonActive]} onPress={() => setActiveTab('month')}>
          <Text style={[styles.tabText, activeTab === 'month' && styles.tabTextActive]}>Bu Ay</Text>
        </Pressable>
      </View>

      {activeTab === 'today' && (
        <>
          {renderStatCard(dailyStats)}
          {todayPunches.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Bugünkü Hareketleriniz</Text>
              {todayPunches.map((p, idx) => (
                <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
                  <Text style={{ color: Colors.text }}>Giriş: <Text style={{ fontWeight: 'bold' }}>{p.in}</Text></Text>
                  <Text style={{ color: Colors.text }}>Çıkış: <Text style={{ fontWeight: 'bold' }}>{p.out}</Text></Text>
                </View>
              ))}
              <Text style={{ color: Colors.lightText, fontSize: 12, marginTop: 8, textAlign: 'center' }}>Bu hareketlerin toplamı gerçekleşen süreye yansır.</Text>
            </View>
          )}
        </>
      )}

      {activeTab === 'week' && (
        <>
          {renderStatCard(weeklyStats)}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Haftalık Çalışma Grafiği</Text>
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
        </>
      )}

      {activeTab === 'month' && (
        <>
          {renderStatCard(monthlyStats)}
        </>
      )}

      <Pressable style={styles.button} onPress={exportData}>
        <Text style={styles.buttonText}>CSV Olarak Dışa Aktar</Text>
      </Pressable>
      <Pressable style={[styles.button, { marginTop: 0, backgroundColor: (Colors as any).secondary || '#5e5ce6' }]} onPress={exportPdf}>
        <Text style={styles.buttonText}>PDF Olarak Dışa Aktar</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingTop: 60 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#E5E5EA', borderRadius: 10, padding: 4, marginBottom: 20 },
  tabButton: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabButtonActive: { backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: {width:0, height:1}, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.lightText },
  tabTextActive: { color: Colors.text },
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
