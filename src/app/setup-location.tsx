import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator, Dimensions, TextInput } from 'react-native';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [radius, setRadius] = useState<number>(100);

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
      
      const storedRadius = await AsyncStorage.getItem('workRadius');
      if (storedRadius) {
        setRadius(parseInt(storedRadius, 10));
      }
    })();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await Location.geocodeAsync(searchQuery);
      if (results.length > 0) {
        setCurrentLocation({ lat: results[0].latitude, lng: results[0].longitude });
      } else {
        Alert.alert('Bulunamadı', 'Girdiğiniz adres veya yer haritada bulunamadı.');
      }
    } catch (e) {
      Alert.alert('Hata', 'Arama sırasında bir hata oluştu.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSetWorkLocation = async () => {
    if (!currentLocation) return;
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

      await AsyncStorage.setItem('workRadius', radius.toString());
      await setupGeofencing(currentLocation.lat, currentLocation.lng, radius);
      
      await AsyncStorage.setItem('workLat', currentLocation.lat.toString());
      await AsyncStorage.setItem('workLng', currentLocation.lng.toString());
      
      const geocode = await Location.reverseGeocodeAsync({
        latitude: currentLocation.lat,
        longitude: currentLocation.lng
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
        Adres arayabilir veya haritaya dokunarak iş yerinizin konumunu tam olarak işaretleyebilirsiniz.
      </Text>
      
      <View style={styles.searchContainer}>
        <TextInput 
          style={styles.searchInput}
          placeholder="İş yeri adı veya adresi ara..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
        />
        <Pressable onPress={handleSearch} style={styles.searchButton} disabled={isSearching}>
          {isSearching ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="search" size={20} color="#fff" />}
        </Pressable>
      </View>
      
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
            onPress={(e) => {
              setCurrentLocation({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude });
            }}
          >
            <Marker
              coordinate={{ latitude: currentLocation.lat, longitude: currentLocation.lng }}
              title="İş Yeri"
              description="Kaydırmak için basılı tutun"
              draggable
              onDragEnd={(e) => {
                setCurrentLocation({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude });
              }}
            />
          </MapView>
        ) : (
          <View style={styles.loadingMap}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={{ marginTop: 10, color: Colors.text }}>Harita yükleniyor...</Text>
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 20 }}>
        {[50, 100, 200].map((r) => (
          <Pressable 
            key={r}
            style={[
              styles.radiusButton, 
              radius === r && styles.radiusButtonActive
            ]}
            onPress={() => setRadius(r)}
          >
            <Text style={[styles.radiusText, radius === r && styles.radiusTextActive]}>{r}m</Text>
          </Pressable>
        ))}
      </View>

      <Pressable 
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, isLocating && styles.buttonDisabled]} 
        onPress={handleSetWorkLocation}
        disabled={isLocating}
      >
        {isLocating ? (
          <ActivityIndicator color={Colors.background} />
        ) : (
          <Text style={styles.buttonText}>İşaretli Konumu Kaydet</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  radiusButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    marginHorizontal: 5,
  },
  radiusButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  radiusText: {
    color: Colors.text,
    fontWeight: 'bold',
  },
  radiusTextActive: {
    color: '#fff',
  },
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
    marginBottom: 16,
    lineHeight: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 16,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    marginRight: 8,
  },
  searchButton: {
    backgroundColor: Colors.primary,
    height: 48,
    width: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
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
