import * as Application from 'expo-application';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../database/supabase';

export const getDeviceId = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'android') {
      return Application.getAndroidId() || 'unknown-android-id';
    } else if (Platform.OS === 'ios') {
      const iosId = await Application.getIosIdForVendorAsync();
      return iosId || 'unknown-ios-id';
    }
  } catch (e) {
    console.warn('Failed to get device ID', e);
  }
  return null;
};

export const verifyDeviceForPunch = async (): Promise<{ allowed: boolean; message?: string }> => {
  const currentDeviceId = await getDeviceId();
  if (!currentDeviceId) {
    return { allowed: true };
  }

  const storedRegisteredId = await AsyncStorage.getItem('registered_device_id');
  
  if (storedRegisteredId) {
    if (storedRegisteredId === currentDeviceId) {
      return { allowed: true };
    } else {
      return { allowed: false, message: 'Bu hesap başka bir cihaza kayıtlı. Lütfen sistem yöneticisiyle iletişime geçin (Cihaz ID Eşleşmiyor).' };
    }
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    const registeredDeviceId = session.user.user_metadata?.registered_device_id;
    
    if (!registeredDeviceId) {
      await supabase.auth.updateUser({
        data: { registered_device_id: currentDeviceId }
      });
      await AsyncStorage.setItem('registered_device_id', currentDeviceId);
      return { allowed: true };
    }

    if (registeredDeviceId === currentDeviceId) {
      await AsyncStorage.setItem('registered_device_id', currentDeviceId);
      return { allowed: true };
    } else {
      return { allowed: false, message: 'Bu hesap başka bir cihaza (ID eşleşmiyor) kayıtlı. Başkasının telefonundan veya yeni bir cihazdan giriş yapamazsınız.' };
    }
  }

  return { allowed: true };
};
