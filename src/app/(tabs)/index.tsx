import { View, Text, Pressable, StyleSheet, Alert, FlatList, Modal, SafeAreaView, ScrollView, Animated, PanResponder, ActivityIndicator, TextInput } from 'react-native';
import { useEffect, useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/Colors';
import { recordPunch, markAsLeaveDay, PunchType, WorkRecord, updateRecordTimes, insertManualRecord } from '../../database/recordPunch';
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
import { verifyWorkWifi } from '../../utils/wifiAuth';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { useAudioPlayer } from 'expo-audio';
// audio handling moved inside HoldButton

const HoldButton = ({ type, onPunch, isLoading }: { type: 'in' | 'out', onPunch: () => void, isLoading: boolean }) => {
  const [fillValue] = useState(new Animated.Value(0));
  const [scaleValue] = useState(new Animated.Value(1));
  const player = useAudioPlayer(require('../../../assets/sounds/success.mp3'));

  const handlePressIn = () => {
    if (isLoading) return;
    Animated.parallel([
      Animated.timing(fillValue, {
        toValue: 1,
        duration: 800,
        useNativeDriver: false,
      }),
      Animated.spring(scaleValue, {
        toValue: 0.95,
        useNativeDriver: true,
      })
    ]).start(async ({ finished }) => {
      if (finished) {
        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          const isMuted = await AsyncStorage.getItem('isMuted');
          if (isMuted !== 'true') {
            player.seekTo(0);
            player.play();
          }
        } catch(e) {}
        onPunch();
      }
    });
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.timing(fillValue, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }),
      Animated.spring(scaleValue, {
        toValue: 1,
        useNativeDriver: true,
        friction: 4,
      })
    ]).start();
  };

  const widthInterpolation = fillValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const isDark = false; // We can use Colors to check theme if needed, but let's stick to vibrant

  return (
    <Animated.View style={{ transform: [{ scale: scaleValue }], width: '100%' }}>
      <Pressable 
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.holdContainer, 
          { 
            borderColor: type === 'in' ? '#4F46E5' : '#EF4444',
            backgroundColor: type === 'in' ? 'rgba(79, 70, 229, 0.05)' : 'rgba(239, 68, 68, 0.05)'
          }
        ]}
      >
        <Animated.View 
          style={[
            styles.holdFill, 
            { width: widthInterpolation }
          ]} 
        >
          <LinearGradient
            colors={type === 'in' ? ['rgba(79, 70, 229, 0.3)', 'rgba(99, 102, 241, 0.3)'] : ['rgba(239, 68, 68, 0.3)', 'rgba(248, 113, 113, 0.3)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <View style={styles.holdContent}>
          <View style={[
            {
              width: 52,
              height: 52,
              borderRadius: 26,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            },
            {
              backgroundColor: type === 'in' ? 'rgba(79, 70, 229, 0.1)' : 'rgba(239, 68, 68, 0.1)' 
            }
          ]}>
            {isLoading ? (
              <ActivityIndicator color={type === 'in' ? '#4F46E5' : '#EF4444'} />
            ) : (
              <Feather name={type === 'in' ? 'log-in' : 'log-out'} size={26} color={type === 'in' ? '#4F46E5' : '#EF4444'} />
            )}
          </View>
          <Text style={[styles.holdText, { color: type === 'in' ? '#4F46E5' : '#EF4444' }]}>
            {isLoading ? 'İşleniyor...' : (type === 'in' ? 'Giriş İçin Basılı Tut' : 'Çıkış İçin Basılı Tut')}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
};

export default function HomeScreen() {
  const [currentPunchType, setCurrentPunchType] = useState<PunchType>('in');
  const [lastPunchTime, setLastPunchTime] = useState<string | null>(null);
  const [isPunching, setIsPunching] = useState(false);
  const [elapsedTime, setElapsedTime] = useState<string | null>(null);

  const [weeklyRecords, setWeeklyRecords] = useState<WorkRecord[]>([]);

  // Live Timer Effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (currentPunchType === 'out') {
      const todayRecord = weeklyRecords.find(r => {
        const today = new Date().toLocaleDateString('tr-TR');
        return r.date === today && r.check_in_timestamp && !r.check_out_timestamp;
      });

      if (todayRecord && todayRecord.check_in_timestamp) {
        const updateTimer = () => {
          const diffMs = Date.now() - todayRecord.check_in_timestamp!;
          const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
          const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          setElapsedTime(`${diffHrs} saat ${diffMins} dk`);
        };
        updateTimer();
        interval = setInterval(updateTimer, 60000); // update every minute
      } else {
        setElapsedTime(null);
      }
    } else {
      setElapsedTime(null);
    }
    return () => clearInterval(interval);
  }, [currentPunchType, weeklyRecords]);
  const [workLocation, setWorkLocation] = useState<{lat: number, lng: number} | null>(null);
  const [workAddress, setWorkAddress] = useState<string | null>(null);
  const [isMapModalVisible, setIsMapModalVisible] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  const [editingRecord, setEditingRecord] = useState<WorkRecord | null>(null);
  const [editInTime, setEditInTime] = useState('');
  const [editOutTime, setEditOutTime] = useState('');
  const [editNote, setEditNote] = useState('');

  const [isNewRecordModalVisible, setIsNewRecordModalVisible] = useState(false);
  const [newRecordDate, setNewRecordDate] = useState('');
  const [newRecordInTime, setNewRecordInTime] = useState('');
  const [newRecordOutTime, setNewRecordOutTime] = useState('');
  const [newRecordNote, setNewRecordNote] = useState('');
  const [streakCount, setStreakCount] = useState(0);

  const [isNameModalVisible, setIsNameModalVisible] = useState(false);
  const [firstNameInput, setFirstNameInput] = useState('');
  const [lastNameInput, setLastNameInput] = useState('');

  const checkNameRequirement = async () => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const fName = await AsyncStorage.getItem('firstName');
      const lName = await AsyncStorage.getItem('lastName');
      if (!fName || !lName) {
        setIsNameModalVisible(true);
      }
    } catch (e) {}
  };

  const saveName = async () => {
    if (!firstNameInput.trim() || !lastNameInput.trim()) {
      Alert.alert('Hata', 'Lütfen adınızı ve soyadınızı eksiksiz girin.');
      return;
    }
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem('firstName', firstNameInput.trim());
    await AsyncStorage.setItem('lastName', lastNameInput.trim());
    setIsNameModalVisible(false);
    Alert.alert('Başarılı', 'Bilgileriniz kaydedildi. Bu bilgiler raporlarınızda kullanılacaktır.');
  };

  const openEditModal = (record: WorkRecord) => {
    if (record.is_leave_day) {
      Alert.alert('Bilgi', 'İzinli günlerde saat düzenlemesi yapılamaz.');
      return;
    }
    setEditingRecord(record);
    const inD = record.check_in_timestamp ? new Date(record.check_in_timestamp) : null;
    const outD = record.check_out_timestamp ? new Date(record.check_out_timestamp) : null;
    setEditInTime(inD ? `${inD.getHours().toString().padStart(2, '0')}:${inD.getMinutes().toString().padStart(2, '0')}` : '');
    setEditOutTime(outD ? `${outD.getHours().toString().padStart(2, '0')}:${outD.getMinutes().toString().padStart(2, '0')}` : '');
    setEditNote(record.note || '');
  };

  const saveEditRecord = async () => {
    if (!editingRecord) return;
    try {
      const parseTime = (timeStr: string, baseDateStr: string) => {
        if (!timeStr.trim()) return null;
        const [h, m] = timeStr.split(':');
        if (h === undefined || m === undefined || isNaN(parseInt(h)) || isNaN(parseInt(m))) return null;
        const [d, mo, y] = baseDateStr.split('.');
        const date = new Date(parseInt(y), parseInt(mo) - 1, parseInt(d), parseInt(h), parseInt(m));
        return date.getTime();
      };
      const inTs = parseTime(editInTime, editingRecord.date);
      const outTs = parseTime(editOutTime, editingRecord.date);
      const res = await updateRecordTimes(editingRecord.id, inTs, outTs, editNote);
      if (res.success) {
        setEditingRecord(null);
        loadWeeklyRecords();
        checkCurrentState();
        Alert.alert('Başarılı', 'Kayıt güncellendi.');
        syncToCloud().catch(e => console.log(e));
      }
    } catch (e) {
      Alert.alert('Hata', 'Kayıt düzenlenirken hata oluştu. (Lütfen SS:DD formatında girin)');
    }
  };

  const saveNewRecord = async () => {
    try {
      const parseTime = (timeStr: string, baseDateStr: string) => {
        if (!timeStr.trim()) return null;
        const [h, m] = timeStr.split(':');
        if (h === undefined || m === undefined || isNaN(parseInt(h)) || isNaN(parseInt(m))) return null;
        const [d, mo, y] = baseDateStr.split('.');
        if (d === undefined || mo === undefined || y === undefined) return null;
        const date = new Date(parseInt(y), parseInt(mo) - 1, parseInt(d), parseInt(h), parseInt(m));
        return date.getTime();
      };
      const inTs = parseTime(newRecordInTime, newRecordDate);
      const outTs = parseTime(newRecordOutTime, newRecordDate);
      if (!newRecordDate.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
        Alert.alert('Hata', 'Tarih GG.AA.YYYY formatında olmalıdır.');
        return;
      }
      const res = await insertManualRecord(newRecordDate, inTs, outTs, 'local_user', newRecordNote);
      if (res.success) {
        setIsNewRecordModalVisible(false);
        setNewRecordDate('');
        setNewRecordInTime('');
        setNewRecordOutTime('');
        setNewRecordNote('');
        loadWeeklyRecords();
        checkCurrentState();
        Alert.alert('Başarılı', 'Yeni kayıt eklendi.');
        syncToCloud().catch(e => console.log(e));
      }
    } catch (e) {
      Alert.alert('Hata', 'Kayıt eklenirken hata oluştu.');
    }
  };

  useFocusEffect(
    useCallback(() => {
      checkNameRequirement();
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
        
        // Check for end of month backup
        try {
          const now = new Date();
          const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
          const lastBackupMonth = await AsyncStorage.getItem('lastBackupMonth');
          
          if (lastBackupMonth && lastBackupMonth !== currentMonthKey) {
            Alert.alert(
              'Aylık Rapor Hazır!',
              'Geçtiğimiz ayın puantaj kayıtlarını Excel olarak dışa aktarmak veya mail atmak ister misiniz?',
              [
                { text: 'Daha Sonra', style: 'cancel', onPress: () => AsyncStorage.setItem('lastBackupMonth', currentMonthKey) },
                { text: 'Evet, Raporlara Git', onPress: () => {
                  AsyncStorage.setItem('lastBackupMonth', currentMonthKey);
                  router.push('/report');
                }}
              ]
            );
          } else if (!lastBackupMonth) {
            // First time setting it up
            await AsyncStorage.setItem('lastBackupMonth', currentMonthKey);
          }
        } catch (e) {
          console.log('Backup check err:', e);
        }
        
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

      let record = await db.getFirstAsync<any>(
        `SELECT * FROM work_records WHERE user_id = ? AND date = ? AND check_in_timestamp IS NOT NULL AND check_out_timestamp IS NULL ORDER BY check_in_timestamp DESC`,
        [userId, todayStr]
      );

      if (!record) {
        record = await db.getFirstAsync<any>(
          `SELECT * FROM work_records WHERE user_id = ? AND date = ? ORDER BY check_in_timestamp DESC`,
          [userId, todayStr]
        );
      }

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
        const radStr = await AsyncStorage.getItem('workRadius');
        const r = radStr ? parseInt(radStr, 10) : 100;
        await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, [
          {
            identifier: 'work',
            latitude: workLocation.lat,
            longitude: workLocation.lng,
            radius: r,
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

      // Streak calculation
      const allRecords = await db.getAllAsync<WorkRecord>(
        `SELECT * FROM work_records WHERE user_id = ?`,
        [userId]
      );
      
      const daysMap = new Map();
      allRecords.forEach(r => {
        if (!daysMap.has(r.date)) {
          daysMap.set(r.date, { hasPunch: false, isLeave: false });
        }
        const day = daysMap.get(r.date);
        if (r.is_leave_day) day.isLeave = true;
        if (r.check_in_timestamp || r.check_out_timestamp) day.hasPunch = true;
      });

      const parseDate = (dStr: string) => {
        if (!dStr) return 0;
        const parts = dStr.split('.');
        if (parts.length !== 3) return 0;
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).getTime();
      };
      
      const sortedDates = Array.from(daysMap.keys()).sort((a, b) => parseDate(b) - parseDate(a));
      
      let count = 0;
      for (const d of sortedDates) {
        const day = daysMap.get(d);
        if (day.hasPunch) {
          count++;
        } else if (day.isLeave) {
          // Skip leave days without breaking the streak
        } else {
          break;
        }
      }
      setStreakCount(count);
    } catch (e) {
      console.log('Error loading weekly records', e);
    }
  };

  const handlePunch = async () => {
    if (isPunching) return;
    try {
      setIsPunching(true);
      if (workLocation) {
        let isWifiValid = false;
        try {
          isWifiValid = await verifyWorkWifi();
        } catch (e) {}

        const { status } = await Location.requestForegroundPermissionsAsync();
        let loc = null;
        let distance = 99999;
        let locationError = '';

        if (status === 'granted') {
          const hasServices = await Location.hasServicesEnabledAsync();
          if (hasServices) {
            try {
              loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            } catch (err) {
              try {
                loc = await Location.getLastKnownPositionAsync({});
              } catch (err2) { }
            }

            if (loc) {
              setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
              distance = getDistance(loc.coords.latitude, loc.coords.longitude, workLocation.lat, workLocation.lng);
            } else {
              locationError = 'Konum alınamıyor.';
            }
          } else {
            locationError = 'Konum servisleri kapalı.';
          }
        } else {
          locationError = 'Konum izni reddedildi.';
        }

        // Karar Verme Mantığı: Öncelik Konum, Konum başarısızsa veya uzaksa Wi-Fi
        if (loc && distance <= 300) {
          console.log('Konum doğrulandı.');
        } else if (isWifiValid) {
          console.log('Konum bulunamadı veya uzak ancak Wi-Fi doğrulandı.');
        } else {
          // İkisi de başarısız
          if (currentPunchType === 'in') {
            const errorMsg = loc 
              ? `İş yerinizden çok uzaksınız! (Mesafe: ${Math.round(distance)}m)\nWi-Fi ağı da eşleşmedi.\nGiriş yapamazsınız.`
              : `${locationError}\nWi-Fi ağı da eşleşmedi. Giriş yapılamıyor.`;
            Alert.alert('Hata', errorMsg);
            setIsPunching(false);
            return;
          } else {
            setIsPunching(false);
            Alert.alert(
              'Uzaktan Çıkış', 
              `İş yerinizden uzaktasınız / konum alınamadı. Wi-Fi da eşleşmedi. Yine de çıkış yapmak istiyor musunuz?`,
              [
                { text: 'İptal', style: 'cancel' },
                { text: 'Evet, Çıkış Yap', onPress: async () => {
                    setIsPunching(true);
                    const result = await recordPunch(currentPunchType, 'manual');
                    if (!result.success) Alert.alert('Hata', result.message);
                    else {
              // Haptics handled by button
                      await stopGeofencing();
                      checkCurrentState();
                      loadWeeklyRecords();
                    }
                    setIsPunching(false);
                  }
                }
              ]
            );
            return;
          }
        }
      }

      const result = await recordPunch(currentPunchType, 'manual');
      if (!result.success) {
        Alert.alert('Hata', result.message || 'Bilinmeyen bir hata oluştu.');
      } else {
// Haptics handled by button
        if (currentPunchType === 'in') await startGeofencing();
        else await stopGeofencing();
        
        checkCurrentState();
        loadWeeklyRecords();
        syncToCloud().catch(e => console.log(e));
      }
    } catch (e: any) {
      console.error('Punch Error:', e);
      Alert.alert('Hata', `İşlem başarısız: ${e.message || 'Konum alınamadı'}`);
    } finally {
      setIsPunching(false);
    }
  };

  const handleLeaveDay = async () => {
    Alert.alert(
      'İzinli / Mazeretli',
      'Bugün için izinli / mazeretli sayılmak istediğinize emin misiniz? Giriş uyarıları kapatılacaktır.',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Evet, İzinliyim', onPress: async () => {
            const result = await markAsLeaveDay();
            if (result.success) {
              Alert.alert('Başarılı', 'Bugün izinli olarak işaretlendi.');
              loadWeeklyRecords();
              checkCurrentState();
            } else {
              Alert.alert('Hata', result.message || 'Bilinmeyen bir hata oluştu');
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
      <Pressable onPress={() => openEditModal(item)} style={[styles.card, { backgroundColor: bgColor, borderColor }]}>
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
        {item.note ? (
          <Text style={{ marginTop: 12, color: Colors.lightText, fontSize: 13, fontStyle: 'italic' }}>
            Not: {item.note}
          </Text>
        ) : null}
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      
      <WeatherTimeEffect />

      <View style={styles.headerArea}>
        {streakCount > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7ED', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 16 }}>
            <Text style={{ fontSize: 16 }}>🔥</Text>
            <Text style={{ marginLeft: 6, color: '#C2410C', fontWeight: 'bold' }}>{streakCount} Günlük Seri!</Text>
          </View>
        )}
        {elapsedTime && (
          <View style={styles.elapsedContainer}>
            <Text style={styles.elapsedLabel}>Bugünkü Çalışma Süreniz</Text>
            <Text style={styles.elapsedTime}>{elapsedTime}</Text>
          </View>
        )}

        <HoldButton 
          type={currentPunchType} 
          onPunch={handlePunch} 
          isLoading={isPunching} 
        />
        
        {lastPunchTime && (
          <Text style={styles.lastPunchText}>{lastPunchTime}</Text>
        )}

        {currentPunchType === 'in' && (
          <Pressable onPress={handleLeaveDay} style={styles.leaveButton}>
            <Feather name="coffee" size={16} color={Colors.primary} />
            <Text style={styles.leaveButtonText}>Bugün İzinliyim / Hastayım</Text>
          </Pressable>
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 12 }}>
          <Text style={[styles.listTitle, { paddingHorizontal: 0, marginBottom: 0 }]}>Son 7 Gün</Text>
          <Pressable onPress={() => {
            const now = new Date();
            setNewRecordDate(`${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()}`);
            setIsNewRecordModalVisible(true);
          }} style={{ backgroundColor: Colors.card, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: Colors.border }}>
            <Text style={{ color: Colors.primary, fontWeight: 'bold' }}>+ Ekle</Text>
          </Pressable>
        </View>
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

      {editingRecord && (
        <Modal visible={true} transparent={true} animationType="fade">
          <View style={styles.editModalContainer}>
            <View style={styles.editModalContent}>
              <Text style={styles.editModalTitle}>Kaydı Düzenle: {editingRecord.date}</Text>
              
              <Text style={styles.editLabel}>Giriş Saati (SS:DD)</Text>
              <TextInput
                style={styles.editInput}
                value={editInTime}
                onChangeText={setEditInTime}
                placeholder="Örn: 08:30"
                placeholderTextColor="#94A3B8"
                keyboardType="numbers-and-punctuation"
              />
              
              <Text style={styles.editLabel}>Çıkış Saati (SS:DD)</Text>
              <TextInput
                style={styles.editInput}
                value={editOutTime}
                onChangeText={setEditOutTime}
                placeholder="Örn: 18:00"
                placeholderTextColor="#94A3B8"
                keyboardType="numbers-and-punctuation"
              />

              <Text style={styles.editLabel}>Not</Text>
              <TextInput
                style={styles.editInput}
                value={editNote}
                onChangeText={setEditNote}
                placeholder="Örn: Trafik nedeniyle geciktim"
                placeholderTextColor="#94A3B8"
              />

              <View style={styles.editButtons}>
                <Pressable style={styles.editCancelBtn} onPress={() => setEditingRecord(null)}>
                  <Text style={styles.editCancelText}>İptal</Text>
                </Pressable>
                <Pressable style={styles.editSaveBtn} onPress={saveEditRecord}>
                  <Text style={styles.editSaveText}>Kaydet</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {isNewRecordModalVisible && (
        <Modal visible={true} transparent={true} animationType="fade">
          <View style={styles.editModalContainer}>
            <View style={styles.editModalContent}>
              <Text style={styles.editModalTitle}>Yeni Manuel Kayıt</Text>
              
              <Text style={styles.editLabel}>Tarih (GG.AA.YYYY)</Text>
              <TextInput
                style={styles.editInput}
                value={newRecordDate}
                onChangeText={setNewRecordDate}
                placeholder="Örn: 25.10.2023"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.editLabel}>Giriş Saati (SS:DD)</Text>
              <TextInput
                style={styles.editInput}
                value={newRecordInTime}
                onChangeText={setNewRecordInTime}
                placeholder="Örn: 08:30"
                placeholderTextColor="#94A3B8"
                keyboardType="numbers-and-punctuation"
              />
              
              <Text style={styles.editLabel}>Çıkış Saati (SS:DD)</Text>
              <TextInput
                style={styles.editInput}
                value={newRecordOutTime}
                onChangeText={setNewRecordOutTime}
                placeholder="Örn: 18:00"
                placeholderTextColor="#94A3B8"
                keyboardType="numbers-and-punctuation"
              />

              <Text style={styles.editLabel}>Not</Text>
              <TextInput
                style={styles.editInput}
                value={newRecordNote}
                onChangeText={setNewRecordNote}
                placeholder="Örn: Mesai"
                placeholderTextColor="#94A3B8"
              />

              <View style={styles.editButtons}>
                <Pressable style={styles.editCancelBtn} onPress={() => setIsNewRecordModalVisible(false)}>
                  <Text style={styles.editCancelText}>İptal</Text>
                </Pressable>
                <Pressable style={styles.editSaveBtn} onPress={saveNewRecord}>
                  <Text style={styles.editSaveText}>Kaydet</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {isNameModalVisible && (
        <Modal visible={true} transparent={true} animationType="fade">
          <View style={[styles.editModalContainer, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
            <View style={[styles.editModalContent, { padding: 30 }]}>
              <Text style={[styles.editModalTitle, { fontSize: 24, textAlign: 'center', marginBottom: 12 }]}>Hoş Geldiniz! 👋</Text>
              <Text style={{ textAlign: 'center', color: Colors.lightText, marginBottom: 24, lineHeight: 22 }}>
                Raporlarınızı (Excel/PDF) oluşturabilmemiz için lütfen adınızı ve soyadınızı girin. Bu bilgiler sadece cihazınızda saklanacaktır.
              </Text>
              
              <Text style={styles.editLabel}>Adınız</Text>
              <TextInput
                style={styles.editInput}
                value={firstNameInput}
                onChangeText={setFirstNameInput}
                placeholder="Örn: Ahmet"
                placeholderTextColor="#94A3B8"
              />
              
              <Text style={styles.editLabel}>Soyadınız</Text>
              <TextInput
                style={styles.editInput}
                value={lastNameInput}
                onChangeText={setLastNameInput}
                placeholder="Örn: Yılmaz"
                placeholderTextColor="#94A3B8"
              />

              <Pressable style={[styles.editSaveBtn, { width: '100%', marginTop: 12 }]} onPress={saveName}>
                <Text style={styles.editSaveText}>Kaydet ve Başla</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}

      <Text style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 12, marginTop: 40, marginBottom: 20 }}>
        v{Constants.expoConfig?.version || '1.9.4'}
      </Text>
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
  elapsedContainer: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  elapsedLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  elapsedTime: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: 4,
  },
  holdContainer: {
    width: '100%',
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 16,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFF',
  },
  holdBackground: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#FFF',
  },
  holdFill: {
    ...StyleSheet.absoluteFill,
  },
  holdContent: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdText: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 12,
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
  },
  leaveButton: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  leaveButtonText: {
    marginLeft: 8,
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  editModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModalContent: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 24,
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  editLabel: {
    fontSize: 14,
    color: Colors.lightText,
    marginBottom: 8,
  },
  editInput: {
    backgroundColor: Colors.background,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  editCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: Colors.background,
  },
  editCancelText: {
    color: Colors.lightText,
    fontSize: 16,
    fontWeight: '600',
  },
  editSaveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  editSaveText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  }
});


