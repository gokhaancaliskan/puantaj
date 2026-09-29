import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { recordPunch } from '../database/recordPunch';
import { Colors } from '../constants/Colors';
import { Feather } from '@expo/vector-icons';
import { scheduleLocalNotification } from '../utils/notifications';

export default function ActionScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();

  useEffect(() => {
    async function processAction() {
      if (type === 'in' || type === 'out') {
        const res = await recordPunch(type, 'manual');
        
        if (res.success) {
          const actionText = type === 'in' ? 'İşe girişiniz' : 'İşten çıkışınız';
          await scheduleLocalNotification('Asistan İşlemi Başarılı', `${actionText} sesli komutla kaydedildi.`);
        } else {
          await scheduleLocalNotification('Asistan İşlemi Başarısız', res.message || 'Bir hata oluştu.');
        }
      }
      
      router.replace('/');
    }

    processAction();
  }, [type]);

  return (
    <View style={styles.container}>
      <Feather name="mic" size={64} color={Colors.primary} style={{ marginBottom: 24 }} />
      <Text style={styles.text}>Asistan komutu işleniyor...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  }
});
