import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { initDb } from '../database/db';
import { Colors } from '../constants/Colors';
import { View, Text, Appearance, Pressable, StyleSheet } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as LocalAuthentication from 'expo-local-authentication';
import { scheduleNotificationsForWeek, setupNotificationCategories } from '../utils/notifications';
import '../tasks/geofenceTask';
import { recordPunch } from '../database/recordPunch';
import { supabase } from '../database/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [initialRoute, setInitialRoute] = useState<'auth' | 'onboarding' | 'setup-location' | '(tabs)'>('auth');

  useEffect(() => {
    async function setup() {
      try {
        await initDb();

        // Request notification permissions
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus === 'granted') {
          await setupNotificationCategories();
          await scheduleNotificationsForWeek();
        }

        const appTheme = await AsyncStorage.getItem('appTheme');
        if (appTheme === 'dark' || appTheme === 'light') {
          Appearance.setColorScheme(appTheme as any);
        } else {
          Appearance.setColorScheme(null);
        }

        // Check if "Remember Me" session is still valid
        const rememberMe = await AsyncStorage.getItem('rememberMe');
        const sessionExpiry = await AsyncStorage.getItem('sessionExpiry');

        let sessionValid = false;

        if (rememberMe === 'true' && sessionExpiry) {
          const expiryDate = new Date(sessionExpiry);
          const now = new Date();
          if (now < expiryDate) {
            // Expiry is still in the future — trust stored session
            sessionValid = true;
          } else {
            // Session expired, clear everything and send to auth
            await AsyncStorage.removeItem('rememberMe');
            await AsyncStorage.removeItem('sessionExpiry');
            await supabase.auth.signOut();
          }
        }

        if (sessionValid) {
          // Try to restore the Supabase session
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const hasSeen = await AsyncStorage.getItem('hasSeenOnboarding');
            if (hasSeen !== 'true') {
              setInitialRoute('onboarding');
            } else {
              const workLat = await AsyncStorage.getItem('workLat');
              setInitialRoute(workLat ? '(tabs)' : 'setup-location');
            }
          } else {
            // Token might have expired, try refresh
            const { data: refreshData } = await supabase.auth.refreshSession();
            if (refreshData.session) {
              const hasSeen = await AsyncStorage.getItem('hasSeenOnboarding');
              if (hasSeen !== 'true') {
                setInitialRoute('onboarding');
              } else {
                const workLat = await AsyncStorage.getItem('workLat');
                setInitialRoute(workLat ? '(tabs)' : 'setup-location');
              }
            } else {
              await AsyncStorage.removeItem('rememberMe');
              await AsyncStorage.removeItem('sessionExpiry');
              setInitialRoute('auth');
            }
          }
        } else {
          // No "remember me" — always check live session (same app session only)
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const hasSeen = await AsyncStorage.getItem('hasSeenOnboarding');
            if (hasSeen !== 'true') {
              setInitialRoute('onboarding');
            } else {
              const workLat = await AsyncStorage.getItem('workLat');
              setInitialRoute(workLat ? '(tabs)' : 'setup-location');
            }
          } else {
            setInitialRoute('auth');
          }
        }
      } catch (e) {
        console.error('Failed to initialize setup:', e);
        setInitialRoute('auth');
      } finally {
        const bioEnabled = await AsyncStorage.getItem('biometricEnabled');
        if (bioEnabled === 'true') {
          setIsBiometricEnabled(true);
          setIsAuthenticated(false);
        }
        setAppReady(true);
      }
    }

    setup();

    // Listen for auth state changes in real-time
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        await AsyncStorage.removeItem('rememberMe');
        await AsyncStorage.removeItem('sessionExpiry');
        router.replace('/auth');
      }
    });

    // Listen for Notification Actions
    const responseListener = Notifications.addNotificationResponseReceivedListener(async response => {
      const actionId = response.actionIdentifier;
      if (actionId === 'PUNCH_IN_ACTION') {
        const res = await recordPunch('in', 'widget');
        if (res.success) scheduleNotificationsForWeek(); // refresh
      } else if (actionId === 'PUNCH_OUT_ACTION') {
        const res = await recordPunch('out', 'widget');
        if (res.success) scheduleNotificationsForWeek(); // refresh
      }
    });

    return () => {
      subscription.unsubscribe();
      responseListener.remove();
    };
  }, []);

  const authenticateUser = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Puantajıma Giriş Yapın',
        fallbackLabel: 'Şifre Kullan',
        cancelLabel: 'İptal',
        disableDeviceFallback: false,
      });

      if (result.success) {
        setIsAuthenticated(true);
      }
    } catch (e) {
      console.log('Biometric auth failed', e);
    }
  };

  useEffect(() => {
    if (appReady && !isAuthenticated && isBiometricEnabled) {
      authenticateUser();
    }
  }, [appReady, isAuthenticated, isBiometricEnabled]);

  if (!appReady) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{
          width: 80, height: 80, borderRadius: 24,
          backgroundColor: Colors.primary,
          justifyContent: 'center', alignItems: 'center',
          marginBottom: 20,
          shadowColor: Colors.primary,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.4,
          shadowRadius: 16,
          elevation: 10,
        }}>
          <Text style={{ color: '#fff', fontSize: 36 }}>⏱</Text>
        </View>
        <Text style={{ color: Colors.text, fontSize: 26, fontWeight: 'bold', marginBottom: 8 }}>Puantajım</Text>
        <Text style={{ color: Colors.lightText, fontSize: 15 }}>Yükleniyor...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Feather name="lock" size={64} color={Colors.primary} style={{ marginBottom: 24 }} />
        <Text style={{ color: Colors.text, fontSize: 24, fontWeight: 'bold', marginBottom: 32 }}>Uygulama Kilitli</Text>
        <Pressable 
          onPress={authenticateUser}
          style={{
            backgroundColor: Colors.primary,
            paddingHorizontal: 32,
            paddingVertical: 16,
            borderRadius: 16,
            shadowColor: Colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Kilidi Aç</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
      <Stack.Screen name="auth" options={{ gestureEnabled: false }} />
      <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
      <Stack.Screen name="setup-location" options={{ gestureEnabled: false }} />
      <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
