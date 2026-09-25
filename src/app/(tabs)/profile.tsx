import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { supabase } from '../../database/supabase';
import { Colors } from '../../constants/Colors';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const [session, setSession] = useState<any>(null);
  const [language, setLanguage] = useState<'tr' | 'en'>('tr');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    
    AsyncStorage.getItem('appLanguage').then(res => {
      if (res === 'en' || res === 'tr') setLanguage(res);
    });
  }, []);

  const toggleLanguage = async () => {
    const newLang = language === 'tr' ? 'en' : 'tr';
    setLanguage(newLang);
    await AsyncStorage.setItem('appLanguage', newLang);
    Alert.alert(
      newLang === 'tr' ? 'Dil Değiştirildi' : 'Language Changed',
      newLang === 'tr' ? 'Uygulama dili Türkçe oldu.' : 'Application language set to English.'
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Çıkış Yap',
      'Hesabınızdan çıkış yapmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.auth.signOut();
            if (error) {
              Alert.alert('Hata', error.message);
            } else {
              await AsyncStorage.multiRemove(['workLat', 'workLng', 'workAddress']);
              router.replace('/auth');
            }
          }
        }
      ]
    );
  };

  const t = (key: string) => {
    const dict: any = {
      account: { tr: 'Hesap Bilgileri', en: 'Account Information' },
      logout: { tr: 'Çıkış Yap', en: 'Log Out' },
      settings: { tr: 'Genel Ayarlar', en: 'General Settings' },
      language: { tr: 'Uygulama Dili', en: 'Language' },
      langVal: { tr: 'Türkçe', en: 'English' },
      support: { tr: 'İstek ve Öneri', en: 'Feedback & Support' },
      noUser: { tr: 'Giriş Yapılmadı', en: 'Not Logged In' }
    };
    return dict[key] ? dict[key][language] : key;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      
      <Text style={styles.sectionTitle}>{t('account')}</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.avatar}>
            <Feather name="user" size={32} color="#fff" />
          </View>
          <Text style={styles.cardText}>
            {session?.user?.email || t('noUser')}
          </Text>
        </View>
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Feather name="log-out" size={20} color={Colors.error} />
          <Text style={styles.logoutButtonText}>{t('logout')}</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>{t('settings')}</Text>
      <View style={styles.card}>
        <Pressable style={styles.menuItem} onPress={toggleLanguage}>
          <View style={styles.menuRow}>
            <View style={[styles.iconBox, { backgroundColor: Colors.primary }]}>
              <Feather name="globe" size={20} color="#fff" />
            </View>
            <Text style={styles.menuItemText}>{t('language')}</Text>
          </View>
          <View style={styles.menuRight}>
            <Text style={styles.valueText}>{t('langVal')}</Text>
            <Feather name="chevron-right" size={20} color="#888" />
          </View>
        </Pressable>
        
        <View style={styles.divider} />
        
        <Pressable style={styles.menuItem} onPress={() => Alert.alert(t('support'), 'destek@puantajim.com')}>
          <View style={styles.menuRow}>
            <View style={[styles.iconBox, { backgroundColor: '#FF9500' }]}>
              <Feather name="mail" size={20} color="#fff" />
            </View>
            <Text style={styles.menuItemText}>{t('support')}</Text>
          </View>
          <Feather name="chevron-right" size={20} color="#888" />
        </Pressable>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingTop: 60 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.lightText, marginTop: 24, marginBottom: 12, marginLeft: 8 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  avatar: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center', marginRight: 16
  },
  cardText: { fontSize: 18, color: Colors.text, fontWeight: 'bold', flex: 1 },
  logoutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255, 76, 76, 0.1)', paddingVertical: 14, borderRadius: 12,
  },
  logoutButtonText: { color: Colors.error, fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  menuRow: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  menuItemText: { fontSize: 16, color: Colors.text, fontWeight: '500' },
  menuRight: { flexDirection: 'row', alignItems: 'center' },
  valueText: { color: Colors.lightText, marginRight: 8, fontSize: 14 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 12, marginLeft: 52 },
});
