import { View, Text, StyleSheet, Pressable, Image, Alert } from 'react-native';
import { useState } from 'react';
// import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../constants/Colors';
import { getDb } from '../database/db';
import { useRouter } from 'expo-router';

// NOT: Bu sayfa şu an için gizlidir ve hiçbir yerden erişilememektedir (Gelecek Özellik).
export default function ReportUploadScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [type, setType] = useState<'holiday' | 'sick'>('sick');
  const router = useRouter();

  const pickImage = async () => {
    // let result = await ImagePicker.launchImageLibraryAsync({
    //   mediaTypes: ImagePicker.MediaTypeOptions.Images,
    //   allowsEditing: true,
    //   quality: 0.8,
    // });
    // if (!result.canceled) {
    //   setImageUri(result.assets[0].uri);
    // }
  };

  const takePhoto = async () => {
    // let result = await ImagePicker.launchCameraAsync({
    //   allowsEditing: true,
    //   quality: 0.8,
    // });
    // if (!result.canceled) {
    //   setImageUri(result.assets[0].uri);
    // }
  };

  const saveReport = async () => {
    if (!imageUri) {
      Alert.alert('Hata', 'Lütfen bir rapor fotoğrafı seçin.');
      return;
    }

    try {
      const db = getDb();
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const userId = await AsyncStorage.getItem('userId') || 'local_user';
      
      const now = new Date();
      const dateStr = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()}`;
      
      // Kaydı oluştur (çıkış yapmış ve is_leave_day = 1 olarak)
      await db.runAsync(
        `INSERT INTO work_records (user_id, date, day_type, check_in_timestamp, check_out_timestamp, is_leave_day, note, attachment_uri) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, dateStr, 'weekday', now.getTime(), now.getTime(), 1, type === 'sick' ? 'Hastalık Raporu' : 'Tatil / İzin Belgesi', imageUri]
      );

      Alert.alert('Başarılı', 'Raporunuz kaydedildi.', [
        { text: 'Tamam', onPress: () => router.back() }
      ]);
    } catch (e: any) {
      console.error(e);
      Alert.alert('Hata', 'Rapor kaydedilemedi.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rapor Ekleme Sistemi</Text>
      
      <View style={styles.typeContainer}>
        <Pressable 
          style={[styles.typeButton, type === 'sick' && styles.activeType]} 
          onPress={() => setType('sick')}
        >
          <Text style={[styles.typeText, type === 'sick' && styles.activeTypeText]}>Hastalık</Text>
        </Pressable>
        <Pressable 
          style={[styles.typeButton, type === 'holiday' && styles.activeType]} 
          onPress={() => setType('holiday')}
        >
          <Text style={[styles.typeText, type === 'holiday' && styles.activeTypeText]}>Tatil/İzin</Text>
        </Pressable>
      </View>

      <View style={styles.imageBox}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <Text style={styles.placeholderText}>Henüz fotoğraf seçilmedi</Text>
        )}
      </View>

      <View style={styles.actionRow}>
        <Pressable style={styles.btn} onPress={takePhoto}>
          <Text style={styles.btnText}>Kamera</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={pickImage}>
          <Text style={styles.btnText}>Galeri</Text>
        </Pressable>
      </View>

      <Pressable style={styles.saveBtn} onPress={saveReport}>
        <Text style={styles.saveBtnText}>Kaydet ve Yükle</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 20, paddingTop: 60 },
  title: { fontSize: 22, fontWeight: 'bold', color: Colors.text, marginBottom: 20, textAlign: 'center' },
  typeContainer: { flexDirection: 'row', marginBottom: 20, backgroundColor: '#E5E5EA', borderRadius: 10, padding: 4 },
  typeButton: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 8 },
  activeType: { backgroundColor: Colors.primary },
  typeText: { fontSize: 16, color: Colors.lightText, fontWeight: '600' },
  activeTypeText: { color: '#FFF' },
  imageBox: { width: '100%', height: 300, backgroundColor: Colors.card, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 20, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  placeholderText: { color: Colors.lightText },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  btn: { flex: 0.48, backgroundColor: Colors.border, padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: Colors.text, fontWeight: 'bold' },
  saveBtn: { backgroundColor: Colors.primary, padding: 16, borderRadius: 16, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
});
