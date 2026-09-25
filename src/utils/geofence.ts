import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { scheduleLocalNotification } from './notifications';
import { getDb, initDb } from '../database/db';

const GEOFENCE_TASK_NAME = 'WORK_GEOFENCE_TASK';

// Define the background task for geofencing
TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Geofencing task error:', error);
    return;
  }
  
  if (data) {
    const { eventType, region } = data as any;

    if (eventType === Location.GeofencingEventType.Enter) {
      console.log('Entered geofence:', region);
      await scheduleLocalNotification(
        'İş Yerine Hoş Geldiniz!',
        'Giriş yapmayı unutmayın.'
      );
    } else if (eventType === Location.GeofencingEventType.Exit) {
      console.log('Exited geofence:', region);
      await scheduleLocalNotification(
        'İyi Akşamlar!',
        'Çıkış yapmayı unutmayın.'
      );
    }
  }
});

// Start geofencing for a specific location
export async function setupGeofencing(latitude: number, longitude: number, radius: number = 100) {
  try {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      console.log('Foreground location permission denied');
      return;
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      console.log('Background location permission denied');
      return;
    }

    await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, [
      {
        identifier: 'work_location',
        latitude,
        longitude,
        radius,
        notifyOnEnter: true,
        notifyOnExit: true,
      },
    ]);
    console.log('Geofencing setup complete for:', { latitude, longitude, radius });
  } catch (error) {
    console.error('Error setting up geofencing:', error);
  }
}

// Stop geofencing
export async function stopGeofencing() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK_NAME);
    if (isRegistered) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
      console.log('Geofencing stopped.');
    }
  } catch (error) {
    console.error('Error stopping geofencing:', error);
  }
}
