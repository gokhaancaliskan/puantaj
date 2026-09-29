import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { recordPunch } from '../database/recordPunch';
import * as Notifications from 'expo-notifications';

export const GEOFENCE_TASK_NAME = 'BACKGROUND_GEOFENCE_TASK';

TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data: { eventType, region }, error }: any) => {
  if (error) {
    console.error('Geofence error', error);
    return;
  }
  
  if (eventType === Location.GeofencingEventType.Exit) {
    console.log('You have left the region:', region);
    
    // Konum sıçramalarını (false positive) engellemek için mevcut konumu teyit edelim
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (loc) {
        const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
          const R = 6371e3;
          const φ1 = lat1 * Math.PI / 180;
          const φ2 = lat2 * Math.PI / 180;
          const Δφ = (lat2 - lat1) * Math.PI / 180;
          const Δλ = (lon2 - lon1) * Math.PI / 180;
          const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          return R * c; 
        };
        const dist = getDistance(loc.coords.latitude, loc.coords.longitude, region.latitude, region.longitude);
        // Eğer hala bölge içindeyse bu bir GPS sıçramasıdır, iptal et!
        if (dist <= region.radius) {
          console.log('False positive geofence exit detected. Ignoring.');
          return;
        }
      }
    } catch(e) {
      console.log('Could not verify location for geofence', e);
    }

    // Sadece bildirim gönder, otomatik çıkış yapma (kullanıcı öğle yemeğine çıkmış olabilir)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "İş yerinden uzaklaştınız",
        body: "Çıkış yapmayı unuttunuz mu?",
        sound: true,
        categoryIdentifier: 'PUNCH_ACTIONS', // Bu kategori sayesinde çıkış yap butonu eklenecek
      },
      trigger: null,
    });
  }
});
