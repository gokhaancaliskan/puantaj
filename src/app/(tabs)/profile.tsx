import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView, Linking, Modal, TextInput } from 'react-native';
import { supabase } from '../../database/supabase';
import { Colors } from '../../constants/Colors';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Appearance, Switch } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { runFullSync } from '../../database/sync';
import { registerWorkWifi } from '../../utils/wifiAuth';
export default function ProfileScreen() {
  const [session, setSession] = useState<any>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [language, setLanguage] = useState<'tr' | 'en'>('tr');
  const [workingHoursModalVisible, setWorkingHoursModalVisible] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [weekdayHours, setWeekdayHours] = useState('9');
  const [saturdayHours, setSaturdayHours] = useState('5');
  const [weekdayIn, setWeekdayIn] = useState('08:30');
  const [weekdayOut, setWeekdayOut] = useState('18:00');
  const [saturdayIn, setSaturdayIn] = useState('08:30');
  const [saturdayOut, setSaturdayOut] = useState('13:30');
  
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [themeMode, setThemeMode] = useState<'system' | 'light' | 'dark'>('system');
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [hourlyWage, setHourlyWage] = useState('');
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [hasBiometricHardware, setHasBiometricHardware] = useState(false);
  const [notifyOnHolidays, setNotifyOnHolidays] = useState(true);

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
    
    AsyncStorage.getItem('userEmail').then(email => {
      if (email) setUserEmail(email);
    });
    
    AsyncStorage.getItem('weekdayHours').then(val => {
      if (val) setWeekdayHours(val);
    });
    AsyncStorage.getItem('saturdayHours').then(val => {
      if (val) setSaturdayHours(val);
    });
    AsyncStorage.getItem('weekdayIn').then(val => {
      if (val) setWeekdayIn(val);
    });
    AsyncStorage.getItem('weekdayOut').then(val => {
      if (val) setWeekdayOut(val);
    });
    AsyncStorage.getItem('saturdayIn').then(val => {
      if (val) setSaturdayIn(val);
    });
    AsyncStorage.getItem('saturdayOut').then(val => {
      if (val) setSaturdayOut(val);
    });
    AsyncStorage.getItem('appTheme').then(val => {
      if (val === 'light' || val === 'dark' || val === 'system') {
        setThemeMode(val as any);
      }
    });
    AsyncStorage.getItem('hourlyWage').then(val => {
      if (val) setHourlyWage(val);
    });
    AsyncStorage.getItem('biometricEnabled').then(val => {
      if (val === 'true') setBiometricEnabled(true);
    });
    AsyncStorage.getItem('notifyOnHolidays').then(val => {
      if (val !== null) setNotifyOnHolidays(val === 'true');
    });

    LocalAuthentication.hasHardwareAsync().then(hasHardware => {
      if (hasHardware) {
        LocalAuthentication.supportedAuthenticationTypesAsync().then(types => {
          if (types.length > 0) setHasBiometricHardware(true);
        });
      }
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

  const cycleTheme = async () => {
    let next: 'system' | 'light' | 'dark' = 'system';
    if (themeMode === 'system') next = 'dark';
    else if (themeMode === 'dark') next = 'light';
    else next = 'system';

    setThemeMode(next);
    await AsyncStorage.setItem('appTheme', next);
    Appearance.setColorScheme(next === 'system' ? 'system' as any : next);
  };

  const saveWorkingHours = async () => {
    await AsyncStorage.setItem('weekdayHours', weekdayHours);
    await AsyncStorage.setItem('saturdayHours', saturdayHours);
    await AsyncStorage.setItem('weekdayIn', weekdayIn);
    await AsyncStorage.setItem('weekdayOut', weekdayOut);
    await AsyncStorage.setItem('saturdayIn', saturdayIn);
    await AsyncStorage.setItem('saturdayOut', saturdayOut);
    await AsyncStorage.setItem('hourlyWage', hourlyWage);
    setWorkingHoursModalVisible(false);
    
    // Bildirimleri baştan kurması için schedule fonksyionunu tetikleyebiliriz
    const { scheduleNotificationsForWeek } = require('../../utils/notifications');
    scheduleNotificationsForWeek().catch((e: any) => console.log(e));

    Alert.alert(t('settings'), 'Ayarlar güncellendi. Bildirimler yeni saatlere göre ayarlandı.');
  };

  const toggleBiometric = async (value: boolean) => {
    if (value) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Biyometrik doğrulamayı aktifleştirin',
        cancelLabel: 'İptal',
      });
      if (result.success) {
        setBiometricEnabled(true);
        await AsyncStorage.setItem('biometricEnabled', 'true');
        Alert.alert('Başarılı', 'Biyometrik doğrulama aktif edildi. Artık giriş çıkışlarda bu istenecek.');
      }
    } else {
      setBiometricEnabled(false);
      await AsyncStorage.setItem('biometricEnabled', 'false');
    }
  };

  const toggleNotifyOnHolidays = async (value: boolean) => {
    setNotifyOnHolidays(value);
    await AsyncStorage.setItem('notifyOnHolidays', value ? 'true' : 'false');
    const { scheduleNotificationsForWeek } = require('../../utils/notifications');
    scheduleNotificationsForWeek().catch((e: any) => console.log(e));
  };

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      await runFullSync();
      Alert.alert('Başarılı', 'Verileriniz bulut ile başarıyla senkronize edildi (Yedeklendi ve güncellendi).');
    } catch (e) {
      console.log('Sync error:', e);
      Alert.alert('Hata', 'Senkronizasyon sırasında bir sorun oluştu.');
    } finally {
      setIsSyncing(false);
    }
  };

  const sendFeedback = async () => {
    if (!feedbackText.trim()) {
      Alert.alert('Hata', 'Lütfen mesajınızı yazın.');
      return;
    }
    setIsSendingFeedback(true);
    try {
      const email = session?.user?.email || userEmail || 'Bilinmiyor';
      
      const { error } = await supabase.from('feedbacks').insert([
        { 
          user_email: email, 
          message: feedbackText,
          target_email: 'gokhaancaliskan@gmail.com'
        }
      ]);
      
      if (error) {
        throw error;
      }
      
      Alert.alert('Başarılı', 'Mesajınız başarıyla iletildi! Teşekkür ederiz.');
      setFeedbackText('');
      setFeedbackModalVisible(false);
    } catch(err) {
      Alert.alert('Hata', 'Mesaj gönderilirken bir sorun oluştu. Veritabanınızda (Supabase) "feedbacks" adında bir tablo olduğundan emin olun.');
      console.log(err);
    } finally {
      setIsSendingFeedback(false);
    }
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
            // Do not await supabase signout to prevent hanging on network issues
            supabase.auth.signOut().catch(e => console.log('Supabase signout error:', e));
            
            // Immediately clear storage and redirect
            await AsyncStorage.removeItem('workLat');
            await AsyncStorage.removeItem('workLng');
            await AsyncStorage.removeItem('workAddress');
            await AsyncStorage.removeItem('userId');
            await AsyncStorage.removeItem('userEmail');
            await AsyncStorage.removeItem('supabase.auth.token');
            router.replace('/auth');
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
      updateLocation: { tr: 'İş Konumunu Güncelle', en: 'Update Work Location' },
      workingHours: { tr: 'Mesai Saatleri', en: 'Working Hours' },
      support: { tr: 'İstek ve Öneri', en: 'Feedback & Support' },
      noUser: { tr: 'Giriş Yapılmadı', en: 'Not Logged In' },
      theme: { tr: 'Tema Görünümü', en: 'Theme Appearance' },
      themeSystem: { tr: 'Sistem (Otomatik)', en: 'System Default' },
      themeDark: { tr: 'Koyu Tema', en: 'Dark Mode' },
      themeLight: { tr: 'Açık Tema', en: 'Light Mode' }
    };
    return dict[key] ? dict[key][language] : key;
  };

  const getThemeText = () => {
    if (themeMode === 'dark') return t('themeDark');
    if (themeMode === 'light') return t('themeLight');
    return t('themeSystem');
  };

  const [tapCount, setTapCount] = useState(0);
  const [adminPasswordModalVisible, setAdminPasswordModalVisible] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');

  const handleAvatarTap = () => {
    setTapCount(prev => {
      const newCount = prev + 1;
      if (newCount >= 7) {
        setAdminPasswordModalVisible(true);
        return 0;
      }
      return newCount;
    });
  };

  const verifyAdminPassword = async () => {
    const storedPassword = await AsyncStorage.getItem('adminPassword');
    const correctPassword = storedPassword || '6224'; // Default is 6224
    
    if (adminPasswordInput === correctPassword) {
      setAdminPasswordModalVisible(false);
      setAdminPasswordInput('');
      await AsyncStorage.setItem('isAdminDevice', 'true');
      router.push('/admin');
    } else {
      Alert.alert('Hata', 'Hatalı şifre girdiniz.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      
      <Text style={styles.sectionTitle}>{t('account')}</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Pressable onPress={handleAvatarTap} style={styles.avatar}>
            <Feather name="user" size={32} color="#fff" />
          </Pressable>
          <Text style={styles.cardText}>
            {session?.user?.email || userEmail || t('noUser')}
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

        <Pressable style={styles.menuItem} onPress={cycleTheme}>
          <View style={styles.menuRow}>
            <View style={[styles.iconBox, { backgroundColor: '#3B82F6' }]}>
              <Feather name={themeMode === 'dark' ? 'moon' : themeMode === 'light' ? 'sun' : 'smartphone'} size={20} color="#fff" />
            </View>
            <Text style={styles.menuItemText}>{t('theme')}</Text>
          </View>
          <View style={styles.menuRight}>
            <Text style={styles.valueText}>{getThemeText()}</Text>
            <Feather name="chevron-right" size={20} color="#888" />
          </View>
        </Pressable>
        
        <View style={styles.divider} />
        
        <Pressable style={styles.menuItem} onPress={() => router.push('/setup-location')}>
          <View style={styles.menuRow}>
            <View style={[styles.iconBox, { backgroundColor: Colors.success || '#34C759' }]}>
              <Feather name="map-pin" size={20} color="#fff" />
            </View>
            <Text style={styles.menuItemText}>{t('updateLocation')}</Text>
          </View>
          <Feather name="chevron-right" size={20} color="#888" />
        </Pressable>

        <View style={styles.divider} />
        
        <Pressable style={styles.menuItem} onPress={async () => {
          Alert.alert('İşleniyor', 'Wi-Fi ağı kontrol ediliyor...');
          const result = await registerWorkWifi();
          Alert.alert(result.success ? 'Başarılı' : 'Hata', result.message);
        }}>
          <View style={styles.menuRow}>
            <View style={[styles.iconBox, { backgroundColor: '#14B8A6' }]}>
              <Feather name="wifi" size={20} color="#fff" />
            </View>
            <Text style={styles.menuItemText}>Şu anki Wi-Fi'ı Kaydet (Hızlı Giriş)</Text>
          </View>
          <Feather name="chevron-right" size={20} color="#888" />
        </Pressable>
        
        <View style={styles.divider} />
        
        <Pressable style={styles.menuItem} onPress={() => setWorkingHoursModalVisible(true)}>
          <View style={styles.menuRow}>
            <View style={[styles.iconBox, { backgroundColor: '#8B5CF6' }]}>
              <Feather name="clock" size={20} color="#fff" />
            </View>
            <Text style={styles.menuItemText}>{t('workingHours')}</Text>
          </View>
          <Feather name="chevron-right" size={20} color="#888" />
        </Pressable>

        <View style={styles.divider} />
        
        <View style={styles.menuItem}>
          <View style={styles.menuRow}>
            <View style={[styles.iconBox, { backgroundColor: '#F43F5E' }]}>
              <Feather name="calendar" size={20} color="#fff" />
            </View>
            <Text style={styles.menuItemText}>Resmi Tatilde Bildirim Açık</Text>
          </View>
          <Switch 
            value={notifyOnHolidays}
            onValueChange={toggleNotifyOnHolidays}
            trackColor={{ false: '#D1D5DB', true: Colors.primary }}
          />
        </View>
        
        {hasBiometricHardware && (
          <>
            <View style={styles.divider} />
            <View style={styles.menuItem}>
              <View style={styles.menuRow}>
                <View style={[styles.iconBox, { backgroundColor: '#EF4444' }]}>
                  <Feather name="lock" size={20} color="#fff" />
                </View>
                <Text style={styles.menuItemText}>Güvenlik (Parmak İzi/Yüz)</Text>
              </View>
              <Switch 
                value={biometricEnabled}
                onValueChange={toggleBiometric}
                trackColor={{ false: '#D1D5DB', true: Colors.primary }}
              />
            </View>
          </>
        )}
        
        <View style={styles.divider} />
        
        <Pressable style={styles.menuItem} onPress={() => router.push('/onboarding')}>
          <View style={styles.menuRow}>
            <View style={[styles.iconBox, { backgroundColor: '#10B981' }]}>
              <Feather name="book-open" size={20} color="#fff" />
            </View>
            <Text style={styles.menuItemText}>Uygulama Rehberi</Text>
          </View>
          <Feather name="chevron-right" size={20} color="#888" />
        </Pressable>

        <View style={styles.divider} />

        <Pressable style={styles.menuItem} onPress={handleSync} disabled={isSyncing}>
          <View style={styles.menuRow}>
            <View style={[styles.iconBox, { backgroundColor: '#0ea5e9' }]}>
              <Feather name="cloud" size={20} color="#fff" />
            </View>
            <Text style={styles.menuItemText}>{isSyncing ? 'Senkronize ediliyor...' : 'Buluta Yedekle / Eşitle'}</Text>
          </View>
          <Feather name="refresh-cw" size={20} color="#888" />
        </Pressable>

        <View style={styles.divider} />

        <Pressable style={styles.menuItem} onPress={() => setFeedbackModalVisible(true)}>
          <View style={styles.menuRow}>
            <View style={[styles.iconBox, { backgroundColor: '#FF9500' }]}>
              <Feather name="mail" size={20} color="#fff" />
            </View>
            <Text style={styles.menuItemText}>{t('support')}</Text>
          </View>
          <Feather name="chevron-right" size={20} color="#888" />
        </Pressable>
      </View>

      {/* Mesai Saatleri Modal */}
      <Modal visible={workingHoursModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('workingHours')}</Text>
            
            <Text style={styles.inputLabel}>Hafta İçi (Çalışılması Gereken Saat):</Text>
            <TextInput 
              style={styles.textInput}
              keyboardType="numeric"
              value={weekdayHours}
              onChangeText={setWeekdayHours}
            />
            <View style={{flexDirection: 'row', gap: 10, marginBottom: 12}}>
              <View style={{flex: 1}}>
                <Text style={styles.inputLabel}>H.İçi Giriş</Text>
                <TextInput style={styles.textInput} value={weekdayIn} onChangeText={setWeekdayIn} placeholder="08:30" keyboardType="numbers-and-punctuation"/>
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.inputLabel}>H.İçi Çıkış</Text>
                <TextInput style={styles.textInput} value={weekdayOut} onChangeText={setWeekdayOut} placeholder="18:00" keyboardType="numbers-and-punctuation"/>
              </View>
            </View>
            
            <Text style={styles.inputLabel}>Cumartesi (Çalışılması Gereken Saat):</Text>
            <TextInput 
              style={styles.textInput}
              keyboardType="numeric"
              value={saturdayHours}
              onChangeText={setSaturdayHours}
            />
            <View style={{flexDirection: 'row', gap: 10, marginBottom: 16}}>
              <View style={{flex: 1}}>
                <Text style={styles.inputLabel}>Cmt. Giriş</Text>
                <TextInput style={styles.textInput} value={saturdayIn} onChangeText={setSaturdayIn} placeholder="08:30" keyboardType="numbers-and-punctuation"/>
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.inputLabel}>Cmt. Çıkış</Text>
                <TextInput style={styles.textInput} value={saturdayOut} onChangeText={setSaturdayOut} placeholder="13:30" keyboardType="numbers-and-punctuation"/>
              </View>
            </View>

            <Text style={styles.inputLabel}>Saatlik Ücret (Opsiyonel, TL):</Text>
            <TextInput 
              style={styles.textInput}
              keyboardType="numeric"
              value={hourlyWage}
              onChangeText={setHourlyWage}
              placeholder="Örn: 200"
            />
            
            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalBtn, { backgroundColor: '#E5E7EB' }]} onPress={() => setWorkingHoursModalVisible(false)}>
                <Text style={{ color: '#4B5563', fontWeight: 'bold' }}>İptal</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, { backgroundColor: Colors.primary }]} onPress={saveWorkingHours}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Kaydet</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Admin Password Modal */}
      <Modal visible={adminPasswordModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Yönetici Girişi</Text>
            <Text style={styles.inputLabel}>Yönetici Şifresi:</Text>
            <TextInput 
              style={styles.textInput}
              secureTextEntry
              keyboardType="default"
              value={adminPasswordInput}
              onChangeText={setAdminPasswordInput}
              placeholder="Şifreyi giriniz"
            />
            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalBtn, { backgroundColor: '#E5E7EB' }]} onPress={() => { setAdminPasswordModalVisible(false); setAdminPasswordInput(''); }}>
                <Text style={{ color: '#4B5563', fontWeight: 'bold' }}>İptal</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, { backgroundColor: Colors.error }]} onPress={verifyAdminPassword}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Giriş Yap</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* İstek ve Öneri Modal */}
      <Modal visible={feedbackModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '50%' }]}>
            <Text style={styles.modalTitle}>{t('support')}</Text>
            
            <Text style={styles.inputLabel}>Mesajınız:</Text>
            <TextInput 
              style={[styles.textInput, { flex: 1, textAlignVertical: 'top' }]}
              multiline
              placeholder="Fikirlerinizi, önerilerinizi veya karşılaştığınız hataları buraya yazabilirsiniz..."
              value={feedbackText}
              onChangeText={setFeedbackText}
            />
            
            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalBtn, { backgroundColor: '#E5E7EB' }]} onPress={() => setFeedbackModalVisible(false)} disabled={isSendingFeedback}>
                <Text style={{ color: '#4B5563', fontWeight: 'bold' }}>İptal</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, { backgroundColor: '#FF9500' }]} onPress={sendFeedback} disabled={isSendingFeedback}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{isSendingFeedback ? 'Gönderiliyor...' : 'Gönder'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: Colors.card, borderRadius: 20, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center', color: Colors.text },
  inputLabel: { fontSize: 14, color: Colors.text, marginBottom: 8, fontWeight: '600' },
  textInput: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 16, color: Colors.text },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginHorizontal: 6 }
});
