import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { initDb } from '../database/db';
import { Colors } from '../constants/Colors';
import { View, Text } from 'react-native';
import * as Notifications from 'expo-notifications';
import { scheduleNotificationsForWeek } from '../utils/notifications';
import '../tasks/geofenceTask';
import { supabase } from '../database/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<'auth' | 'setup-location' | '(tabs)'>('auth');

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
          await scheduleNotificationsForWeek();
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
            await AsyncStorage.multiRemove(['rememberMe', 'sessionExpiry']);
            await supabase.auth.signOut();
          }
        }

        if (sessionValid) {
          // Try to restore the Supabase session
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const workLat = await AsyncStorage.getItem('workLat');
            setInitialRoute(workLat ? '(tabs)' : 'setup-location');
          } else {
            // Token might have expired, try refresh
            const { data: refreshData } = await supabase.auth.refreshSession();
            if (refreshData.session) {
              const workLat = await AsyncStorage.getItem('workLat');
              setInitialRoute(workLat ? '(tabs)' : 'setup-location');
            } else {
              await AsyncStorage.multiRemove(['rememberMe', 'sessionExpiry']);
              setInitialRoute('auth');
            }
          }
        } else {
          // No "remember me" — always check live session (same app session only)
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const workLat = await AsyncStorage.getItem('workLat');
            setInitialRoute(workLat ? '(tabs)' : 'setup-location');
          } else {
            setInitialRoute('auth');
          }
        }
      } catch (e) {
        console.error('Failed to initialize setup:', e);
        setInitialRoute('auth');
      } finally {
        setAppReady(true);
      }
    }

    setup();

    // Listen for auth state changes in real-time
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        await AsyncStorage.multiRemove(['rememberMe', 'sessionExpiry']);
        router.replace('/auth');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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

  return (
    <Stack screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
      <Stack.Screen name="auth" options={{ gestureEnabled: false }} />
      <Stack.Screen name="setup-location" options={{ gestureEnabled: false }} />
      <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
