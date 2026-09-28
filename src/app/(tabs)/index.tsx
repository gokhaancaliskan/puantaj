import { View, Text, Pressable, StyleSheet, Alert, FlatList, Modal, SafeAreaView, ScrollView } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/Colors';
import { recordPunch, PunchType, WorkRecord } from '../../database/recordPunch';
import { getDb } from '../../database/db';
import { runFullSync, syncToCloud } from '../../database/sync';
import WeatherTimeEffect from '../../components/WeatherTimeEffect';
import { useFocusEffect, router } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { GEOFENCE_TASK_NAME } from '../../tasks/geofenceTask';
import { LinearGradient } from 'expo-linear-gradient';

export default function HomeScreen() {
  const [currentPunchType, setCurrentPunchType] = useState<PunchType>('in');
  const [lastPunchTime, setLastPunchTime] = useState<string | null>(null);
  const [weeklyRecords, setWeeklyRecords] = useState<WorkRecord[]>([]);
  const [workLocation, setWorkLocation] = useState<{lat: number, lng: number} | null>(null);
  const [workAddress, setWorkAddress] = useState<string | null>(null);
  const [isMapModalVisible, setIsMapModalVisible] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  useFocusEffect(
    useCallback(() => {
      checkCurrentState();
      loadWeeklyRecords();
      loadSavedAddress();
      
      // Request location permissions and fetch current location for the map
      (async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          try {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            if (loc) setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
          } catch (e) {
            const lastLoc = await Location.getLastKnownPositionAsync({});
            if (lastLoc) setUserLocation({ lat: lastLoc.coords.latitude, lng: lastLoc.coords.longitude });
          }
        }
        
        // Run cloud sync in background
        runFullSync().then(() => {
          loadWeeklyRecords();
        }).catch(e => console.log('Sync err:', e));
        
      })();
    }, [])
  );

  const loadSavedAddress = async () => {
    try {
      const lat = await AsyncStorage.getItem('workLat');
      const lng = await AsyncStorage.getItem('workLng');
      if (lat && lng) {
        setWorkLocation({ lat: parseFloat(lat), lng: parseFloat(lng) });
      } else {
        router.replace('/setup-location');
        return;
      }
      
      const savedAddress = await AsyncStorage.getItem('workAddress');
      if (savedAddress) setWorkAddress(savedAddress);
    } catch (e) {
      console.log('Error loading address:', e);
    }
  };

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
  };

  const checkCurrentState = async () => {
    try {
      const db = getDb();
      const now = new Date();
      const todayStr = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()}`;
      
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const storedUserId = await AsyncStorage.getItem('userId');
      const userId = storedUserId || 'local_user';

      const record = await db.getFirstAsync<any>(
        `SELECT * FROM work_records WHERE user_id = ? AND date = ?`,
        [userId, todayStr]
      );

      if (record && record.check_in_timestamp && !record.check_out_timestamp) {
        setCurrentPunchType('out');
        const d = new Date(record.check_in_timestamp);
        setLastPunchTime(`Son giriş: ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`);
      } else if (record && record.check_out_timestamp) {
        setCurrentPunchType('in');
        const d = new Date(record.check_out_timestamp);
        setLastPunchTime(`Son çıkış: ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`);
      } else {
        setCurrentPunchType('in');
        setLastPunchTime(null);
      }
    } catch (e) {
      console.log('Error checking state:', e);
    }
  };

  const startGeofencing = async () => {
    if (workLocation) {
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus === 'granted') {
        await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, [
          {
            identifier: 'work',
            latitude: workLocation.lat,
            longitude: workLocation.lng,
            radius: 850,
            notifyOnEnter: false,
            notifyOnExit: true,
          }
        ]);
      }
    }
  };

  const stopGeofencing = async () => {
    const hasTask = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK_NAME);
    if (hasTask) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
    }
  };

  const loadWeeklyRecords = async () => {
    try {
      const db = getDb();
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const storedUserId = await AsyncStorage.getItem('userId');
      const userId = storedUserId || 'local_user';

      const result = await db.getAllAsync<WorkRecord>(
        `SELECT * FROM work_records WHERE user_id = ? ORDER BY date DESC LIMIT 7`,
        [userId]
      );
      setWeeklyRecords(result);
    } catch (e) {
      console.log('Error loading weekly records', e);
    }
  };

  const handlePunch = async () => {
    Alert.alert(
      'Onay',
      currentPunchType === 'in' ? 'İşe giriş yapmak istediğinize emin misiniz?' : 'İşten çıkış yapmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Evet', 
          onPress: async () => {
            try {
              if (workLocation) {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                  Alert.alert('Hata', 'Konum izni gerekli!');
                  return;
                }

                const hasServices = await Location.hasServicesEnabledAsync();
                if (!hasServices) {
                  Alert.alert('Hata', 'Konum servisleri kapalı. Lütfen cihazınızın konum (GPS) özelliğini açın.');
                  return;
                }

                let loc = null;
                try {
                  loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                } catch (err) {
                  try {
                    loc = await Location.getLastKnownPositionAsync({});
                  } catch (err2) {
                    console.log('Error getting last known position:', err2);
                  }
                }

                if (!loc) {
                  Alert.alert('Hata', 'Konum alınamıyor. Lütfen GPS bağlantınızı kontrol edin.');
                  return;
                }
                
                // Update user location on successful fetch
                setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
                
                const distance = getDistance(loc.coords.latitude, loc.coords.longitude, workLocation.lat, workLocation.lng);
                
                if (distance > 300) {
                  if (currentPunchType === 'in') {
                    Alert.alert('Hata', `İş yerinizden çok uzaksınız! (Mesafe: ${Math.round(distance)}m)\nGiriş yapamazsınız.`);
                    return;
                  } else {
                    // Ask if they really want to check out since they are far
                    Alert.alert(
                      'Uzaktan Çıkış', 
                      `İş yerinizden uzaktasınız (${Math.round(distance)}m). Yine de çıkış yapmak istiyor musunuz?`,
                      [
                        { text: 'İptal', style: 'cancel' },
                        { text: 'Evet, Çıkış Yap', onPress: async () => {
                            const result = await recordPunch(currentPunchType, 'manual');
                            if (!result.success) {
                              Alert.alert('Hata', result.message);
                            } else {
                              await stopGeofencing();
                              checkCurrentState();
                              loadWeeklyRecords();
                            }
                          }
                        }
                      ]
                    );
                    return;
                  }
                }

                const result = await recordPunch(currentPunchType, 'manual');
                if (!result.success) {
                  Alert.alert('Hata', result.message || 'Bilinmeyen bir hata oluştu.');
                } else {
                  if (currentPunchType === 'in') {
                    await startGeofencing();
                  } else {
                    await stopGeofencing();
                  }
                  checkCurrentState();
                  loadWeeklyRecords();
                  
                  // Trigger sync in background
                  syncToCloud().catch(e => console.log(e));
                }
              }
            } catch (e: any) {
              console.error('Punch Error:', e);
              Alert.alert('Hata', `İşlem başarısız: ${e.message || 'Konum alınamadı'}`);
            }
          }
        }
      ]
    );
  };

  const formatTime = (ts: number | null) => {
    if (!ts) return '--:--';
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const renderItem = ({ item }: { item: WorkRecord }) => {
    const isMissing = (item.check_in_timestamp && !item.check_out_timestamp) || (!item.check_in_timestamp && item.check_out_timestamp);
    const bgColor = item.is_leave_day ? Colors.border : (isMissing ? '#3D2020' : Colors.card);
    const borderColor = isMissing ? Colors.error : Colors.border;

    const getDayName = (dateStr: string) => {
      if (!dateStr) return '';
      const parts = dateStr.split('.');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
        return days[d.getDay()];
      }
      return '';
    };

    return (
      <View style={[styles.card, { backgroundColor: bgColor, borderColor }]}>
        <View style={styles.cardHeader}>
          <Text style={styles.dateText}>{item.date} {getDayName(item.date)}</Text>
          {item.is_leave_day && <Text style={styles.leaveBadge}>İZİNLİ</Text>}
        </View>
        <View style={styles.timeContainer}>
          <View style={styles.timeBox}>
            <Text style={styles.timeLabel}>Giriş</Text>
            <Text style={styles.timeValue}>{formatTime(item.check_in_timestamp)}</Text>
          </View>
          <View style={styles.timeBox}>
            <Text style={styles.timeLabel}>Çıkış</Text>
            <Text style={styles.timeValue}>{formatTime(item.check_out_timestamp)}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <WeatherTimeEffect />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      

      <View style={styles.headerArea}>
        <Pressable
          style={({ pressed }) => [
            styles.buttonContainer,
            pressed && styles.buttonPressed,
          ]}
          onPress={handlePunch}
        >
          <LinearGradient
            colors={currentPunchType === 'in' ? ['#4F46E5', '#3B82F6'] : ['#EF4444', '#F59E0B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.buttonGradient}
          >
            <Feather 
              name={currentPunchType === 'in' ? 'log-in' : 'log-out'} 
              size={28} 
              color="#FFF" 
              style={{ marginRight: 12 }} 
            />
            <Text style={styles.buttonText}>
              {currentPunchType === 'in' ? 'Giriş Yap' : 'Çıkış Yap'}
            </Text>
          </LinearGradient>
        </Pressable>
        {lastPunchTime && (
          <Text style={styles.lastPunchText}>{lastPunchTime}</Text>
        )}
      </View>

      {workLocation && (
        <View style={styles.mapSection}>
          <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={{
                latitude: workLocation.lat,
                longitude: workLocation.lng,
                latitudeDelta: 0.008,
                longitudeDelta: 0.008,
              }}
              region={{
                latitude: workLocation.lat,
                longitude: workLocation.lng,
                latitudeDelta: 0.008,
                longitudeDelta: 0.008,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              showsUserLocation={true}
            >
              <Marker
                coordinate={{ latitude: workLocation.lat, longitude: workLocation.lng }}
                title="İş Yeri"
                pinColor="red"
              />
              {userLocation && (
                <Marker
                  coordinate={{ latitude: userLocation.lat, longitude: userLocation.lng }}
                  title="Siz"
                  pinColor="blue"
                />
              )}
            </MapView>
            <Pressable style={styles.mapOverlay} onPress={() => setIsMapModalVisible(true)} />
          {workAddress && (
            <View style={styles.addressBox}>
              <Feather name="map-pin" size={14} color={Colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.addressText} numberOfLines={1}>{workAddress}</Text>
            </View>
          )}
        </View>
      )}
      
      <View style={styles.listArea}>
        <Text style={styles.listTitle}>Son 7 Gün</Text>
        <FlatList
          data={weeklyRecords}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>Henüz kayıt yok.</Text>}
        />
      </View>

      {/* Fullscreen Map Modal */}
      {workLocation && (
        <Modal visible={isMapModalVisible} animationType="slide" transparent={false}>
          <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
            <View style={{ flex: 1 }}>
              <MapView
                provider={PROVIDER_GOOGLE}
                style={{ flex: 1 }}
                initialRegion={{
                  latitude: workLocation.lat,
                  longitude: workLocation.lng,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                showsUserLocation={true}
                showsMyLocationButton={true}
              >
                <Marker 
                  coordinate={{ latitude: workLocation.lat, longitude: workLocation.lng }} 
                  title="İş Yeri" 
                  pinColor="red"
                />
                {userLocation && (
                  <Marker
                    coordinate={{ latitude: userLocation.lat, longitude: userLocation.lng }}
                    title="Siz"
                    pinColor="blue"
                  />
                )}
              </MapView>
              
              <Pressable 
                style={styles.closeModalButton}
                onPress={() => setIsMapModalVisible(false)}
              >
                <Feather name="x" size={24} color="#000" />
              </Pressable>
            </View>
          </SafeAreaView>
        </Modal>
      )}
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  headerArea: {
    zIndex: 10,
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: 60, 
    paddingBottom: 24,
  },
  buttonContainer: {
    width: '85%',
    borderRadius: 24,
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 20,
    paddingHorizontal: 32,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'System', 
  },
  lastPunchText: {
    marginTop: 16,
    fontSize: 14,
    color: Colors.lightText,
    fontFamily: 'System',
    fontWeight: '500'
  },
  mapSection: {
    width: '100%',
    height: 200,
    marginBottom: 16,
    alignItems: 'center',
  },
  mapContainer: {
    width: '100%',
    aspectRatio: 1, // Makes the map a square
    maxHeight: 300, // Optional constraint so it doesn't get too huge on big screens
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: 12,
    marginHorizontal: 24,
    marginTop: -20,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  addressText: {
    color: Colors.text,
    fontSize: 13,
    fontFamily: 'System',
    flex: 1,
  },
  listArea: {
    width: '100%',
    backgroundColor: Colors.card,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 24,
    minHeight: 300,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  card: {
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  leaveBadge: {
    backgroundColor: Colors.primary,
    color: '#FFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 'bold',
    overflow: 'hidden',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  timeBox: {
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 12,
    color: Colors.lightText,
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.lightText,
    marginTop: 16,
    fontSize: 16,
  },
  closeModalButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: '#FFF',
    padding: 10,
    borderRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  }
});


