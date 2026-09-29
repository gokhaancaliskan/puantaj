import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, Alert, ScrollView } from 'react-native';
import { Colors } from '../constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AdminScreen() {
  const [nfcEnabled, setNfcEnabled] = useState(false);
  const [qrEnabled, setQrEnabled] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('admin_nfcEnabled').then(val => {
      if (val === 'true') setNfcEnabled(true);
    });
    AsyncStorage.getItem('admin_qrEnabled').then(val => {
      if (val === 'true') setQrEnabled(true);
    });
  }, []);

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', color: Colors.text, marginTop: 40, marginBottom: 10 },
  subtext: { fontSize: 14, color: Colors.lightText, marginBottom: 30 },
  card: { backgroundColor: Colors.card, borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 3 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  title: { fontSize: 16, fontWeight: '600', color: Colors.text },
  desc: { fontSize: 12, color: Colors.lightText, marginTop: 4 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 10 }
});
