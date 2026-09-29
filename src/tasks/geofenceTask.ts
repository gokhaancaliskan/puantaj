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
