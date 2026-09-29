import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, Alert, ScrollView, FlatList, ActivityIndicator } from 'react-native';
import { Colors } from '../constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../database/supabase';

export default function AdminScreen() {
  const [nfcEnabled, setNfcEnabled] = useState(false);
  const [qrEnabled, setQrEnabled] = useState(false);
  
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [feedbacksLoading, setFeedbacksLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('admin_nfcEnabled').then(val => {
      if (val === 'true') setNfcEnabled(true);
    });
    AsyncStorage.getItem('admin_qrEnabled').then(val => {
      if (val === 'true') setQrEnabled(true);
    });
    
    fetchLogs();
    fetchFeedbacks();
  }, []);
  
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('work_records')
        .select('*')
        .order('check_in_timestamp', { ascending: false })
        .limit(50);
        
      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.log('Admin fetch error:', err);
      Alert.alert('Hata', 'Kullanıcı giriş kayıtları alınamadı. İnternet bağlantınızı kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedbacks = async () => {
    setFeedbacksLoading(true);
    try {
      const { data, error } = await supabase
        .from('feedbacks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (error) throw error;
      setFeedbacks(data || []);
    } catch (err) {
      console.log('Feedback fetch error:', err);
    } finally {
      setFeedbacksLoading(false);
    }
  };

  const toggleNfc = async (val: boolean) => {
    setNfcEnabled(val);
    await AsyncStorage.setItem('admin_nfcEnabled', val.toString());
    Alert.alert('Bilgi', `NFC özelliği ${val ? 'aktif edildi' : 'kapatıldı'}.`);
  };

  const toggleQr = async (val: boolean) => {
    setQrEnabled(val);
    await AsyncStorage.setItem('admin_qrEnabled', val.toString());
    Alert.alert('Bilgi', `Karekod (QR) özelliği ${val ? 'aktif edildi' : 'kapatıldı'}.`);
  };
  
  const formatTime = (ts: number | null) => {
    if (!ts) return '--:--';
    const d = new Date(ts);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Patron / İK Paneli</Text>
      <Text style={styles.subtext}>
        Bu alan test eden diğer kullanıcılar tarafından görünmez. Yalnızca gizli dokunuş ile açılır.
      </Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <View>
            <Text style={styles.title}>Karekod (QR) ile Giriş</Text>
            <Text style={styles.desc}>Henüz tam entegre edilmedi.</Text>
          </View>
          <Switch 
            value={qrEnabled} 
            onValueChange={toggleQr} 
            trackColor={{ false: '#D1D5DB', true: Colors.primary }}
          />
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <View>
            <Text style={styles.title}>NFC ile Giriş</Text>
            <Text style={styles.desc}>Henüz tam entegre edilmedi.</Text>
          </View>
          <Switch 
            value={nfcEnabled} 
            onValueChange={toggleNfc} 
            trackColor={{ false: '#D1D5DB', true: Colors.primary }}
          />
        </View>
      </View>
      
      <Text style={[styles.header, { fontSize: 20, marginTop: 24 }]}>Son Giriş Çıkış Kayıtları</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
      ) : logs.length === 0 ? (
        <Text style={{ color: Colors.lightText, textAlign: 'center', marginTop: 20 }}>Henüz kayıt bulunamadı.</Text>
      ) : (
        logs.map((item, index) => (
          <View key={item.id || index.toString()} style={styles.logCard}>
            <Text style={styles.logUser}>{item.user_id}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              <View>
                <Text style={styles.logLabel}>Giriş</Text>
                <Text style={styles.logTime}>{formatTime(item.check_in_timestamp)}</Text>
              </View>
              <View>
                <Text style={styles.logLabel}>Çıkış</Text>
                <Text style={styles.logTime}>{formatTime(item.check_out_timestamp)}</Text>
              </View>
            </View>
          </View>
        ))
      )}
      
      <View style={{ height: 40 }} />

      <Text style={[styles.header, { fontSize: 20 }]}>Gelen İstek ve Öneriler</Text>
      
      {feedbacksLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
      ) : feedbacks.length === 0 ? (
        <Text style={{ color: Colors.lightText, textAlign: 'center', marginTop: 20 }}>Henüz mesaj bulunamadı.</Text>
      ) : (
        feedbacks.map((item, index) => (
          <View key={item.id || index.toString()} style={[styles.logCard, { borderColor: '#FF9500' }]}>
            <Text style={[styles.logUser, { color: '#FF9500' }]}>{item.user_email || 'Bilinmeyen Kullanıcı'}</Text>
            <Text style={{ color: Colors.text, marginTop: 8, fontSize: 15 }}>{item.message}</Text>
            <Text style={{ color: Colors.lightText, marginTop: 12, fontSize: 12, textAlign: 'right' }}>
              {formatTime(item.created_at)}
            </Text>
          </View>
        ))
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', color: Colors.text, marginTop: 40, marginBottom: 10 },
  subtext: { fontSize: 14, color: Colors.lightText, marginBottom: 30 },
  card: { backgroundColor: Colors.card, borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 3, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  title: { fontSize: 16, fontWeight: '600', color: Colors.text },
  desc: { fontSize: 12, color: Colors.lightText, marginTop: 4 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 10 },
  
  logCard: { backgroundColor: Colors.card, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  logUser: { fontSize: 16, fontWeight: 'bold', color: Colors.primary },
  logLabel: { fontSize: 12, color: Colors.lightText, marginBottom: 4 },
  logTime: { fontSize: 14, fontWeight: '600', color: Colors.text }
});
