import * as Network from 'expo-network';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const getCurrentPublicIp = async (): Promise<string | null> => {
  try {
    const networkState = await Network.getNetworkStateAsync();
    
    if (!networkState.isConnected || networkState.type !== Network.NetworkStateType.WIFI) {
      return null;
    }

    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip || null;
  } catch (e) {
    console.warn('Failed to get public IP', e);
    return null;
  }
};

export const verifyWorkWifi = async (): Promise<boolean> => {
  try {
    const currentIp = await getCurrentPublicIp();
    if (!currentIp) return false;

    const workIp = await AsyncStorage.getItem('work_wifi_ip');
    if (!workIp) return false;

    return currentIp === workIp;
  } catch (e) {
    return false;
  }
};

export const registerWorkWifi = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const currentIp = await getCurrentPublicIp();
    if (!currentIp) {
      return { success: false, message: 'Lütfen iş yerinizin Wi-Fi ağına bağlı olduğunuzdan emin olun.' };
    }

    await AsyncStorage.setItem('work_wifi_ip', currentIp);
    return { success: true, message: 'İş yeri Wi-Fi ağı başarıyla kaydedildi. Artık bu ağa bağlıyken konum aranmaksızın anında giriş yapabilirsiniz.' };
  } catch (e) {
    return { success: false, message: 'Wi-Fi ağı kaydedilemedi.' };
  }
};
