import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/Colors';
import { setupGeofencing } from '../utils/geofence';
import { Feather } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';

export default function SetupLocationScreen() {
  const [isLocating, setIsLocating] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let loc = await Location.getLastKnownPositionAsync({});
        if (!loc) {
          try {
            loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
          } catch (e) {
            loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest });
          }
        }
        setCurrentLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
    })();
  }, []);

  const handleSetWorkLocation = async () => {
    try {
      setIsLocating(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Hata', 'Konum izni gerekli.');
        setIsLocating(false);
        return;
      }
      
      const hasServices = await Location.hasServicesEnabledAsync();
      if (!hasServices) {
        Alert.alert('Hata', 'Konum servisleri kapalı. Lütfen cihazınızın konum (GPS) özelliğini açın.');
        setIsLocating(false);
        return;
      }

      let location = await Location.getLastKnownPositionAsync({});
      if (!location) {
        try {
          location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
        } catch (e) {
          location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest });
        }
      }
      await setupGeofencing(location.coords.latitude, location.coords.longitude);
      
      await AsyncStorage.setItem('workLat', location.coords.latitude.toString());
      await AsyncStorage.setItem('workLng', location.coords.longitude.toString());
      
      const geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      
      if (geocode.length > 0) {
        const place = geocode[0];
        const addressText = `${place.street || ''} ${place.name || ''}, ${place.city || place.subregion || ''}`;
        await AsyncStorage.setItem('workAddress', addressText);
      }
      
      Alert.alert('Başarılı', 'İş yeri konumu ayarlandı.', [
        { text: 'Tamam', onPress: () => router.replace('/(tabs)') }
      ]);
    } catch (e: any) {
      console.error('Location Error:', e);
      Alert.alert('Hata', `Konum alınamadı: ${e.message || 'Bilinmeyen hata'}`);
      setIsLocating(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>İş Yeri Konumunuz</Text>
      <Text style={styles.subtitle}>
        Lütfen iş yerinizin konumunu doğrulayın. Haritada bulunduğunuz yer gösterilmektedir.
      </Text>
      
      <View style={styles.mapContainer}>
        {currentLocation ? (
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: currentLocation.lat,
              longitude: currentLocation.lng,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}
            region={{
              latitude: currentLocation.lat,
              longitude: currentLocation.lng,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}
            showsUserLocation={true}
          >
            <Marker
              coordinate={{ latitude: currentLocation.lat, longitude: currentLocation.lng }}
              title="Şu Anki Konumunuz"
            />
          </MapView>
        ) : (
          <View style={styles.loadingMap}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={{ marginTop: 10, color: Colors.text }}>Harita yükleniyor...</Text>
          </View>
        )}
      </View>

      <Pressable 
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, isLocating && styles.buttonDisabled]} 
        onPress={handleSetWorkLocation}
        disabled={isLocating}
      >
        {isLocating ? (
          <ActivityIndicator color={Colors.background} />
        ) : (
          <Text style={styles.buttonText}>Bu Konumu Kaydet</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
    textAlign: 'center',
    marginTop: 40,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  mapContainer: {
    width: '100%',
    height: Dimensions.get('window').height * 0.4,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  loadingMap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: Colors.background,
    fontSize: 18,
    fontWeight: 'bold',
  }
});
