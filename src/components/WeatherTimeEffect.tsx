import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

const { width, height } = Dimensions.get('window');

export default function WeatherTimeEffect() {
  const [weatherData, setWeatherData] = useState<{ isDay: number; weatherCode: number } | null>(null);

  useEffect(() => {
    fetchWeather();
  }, []);

  const fetchWeather = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      
      let lat = 41.0082; // Default to Istanbul
      let lon = 28.9784;

      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        lat = location.coords.latitude;
        lon = location.coords.longitude;
      }

      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=is_day,weather_code`
      );
      const data = await response.json();
      
      if (data && data.current) {
        setWeatherData({
          isDay: data.current.is_day,
          weatherCode: data.current.weather_code,
        });
      }
    } catch (error) {
      console.log('Weather fetch error:', error);
    }
  };

  if (!weatherData) return null;

  const isDay = weatherData.isDay === 1;
  const isRaining = [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(weatherData.weatherCode);
  const isSnowing = [71, 73, 75, 77, 85, 86].includes(weatherData.weatherCode);

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Sun or Moon icon */}
      <View style={[styles.celestialBody, isDay ? styles.sunPos : styles.moonPos]}>
        <Feather
          name={isDay ? 'sun' : 'moon'}
          size={120}
          color={isDay ? Colors.primary : Colors.lightText}
          style={{ opacity: 0.15 }}
        />
      </View>

      {/* Rain or Snow overlay */}
      {isRaining && (
        <View style={styles.weatherOverlay}>
          <Feather name="cloud-drizzle" size={200} color={Colors.primary} style={{ opacity: 0.05 }} />
        </View>
      )}
      
      {isSnowing && (
        <View style={styles.weatherOverlay}>
          <Feather name="cloud-snow" size={200} color={Colors.primary} style={{ opacity: 0.05 }} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1, // Will be placed behind main content which has zIndex: 10
    overflow: 'hidden',
  },
  celestialBody: {
    position: 'absolute',
  },
  sunPos: {
    top: -20,
    right: -20,
  },
  moonPos: {
    top: 40,
    left: -20,
  },
  weatherOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
