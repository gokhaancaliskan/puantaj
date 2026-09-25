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
    
    // Attempt automatic checkout
    const result = await recordPunch('out', 'geofence');
    if (result.success) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Otomatik Çıkış",
          body: "İş yerinden 850m uzaklaştığınız tespit edildi. Çıkış işleminiz otomatik olarak kaydedildi.",
          sound: true,
        },
        trigger: null,
      });
    }
  }
});
