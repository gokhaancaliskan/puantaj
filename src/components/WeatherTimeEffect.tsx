import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function WeatherTimeEffect() {
  const [weatherData, setWeatherData] = useState<{ isDay: number; weatherCode: number; timeHour: number } | null>(null);

  useEffect(() => {
    fetchWeather();
  }, []);

  async function fetchWeather() {
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
          timeHour: new Date().getHours()
        });
      }
    } catch (error) {
      console.log('Weather fetch error:', error);
    }
  };

  if (!weatherData) return null;

  const isDay = weatherData.isDay === 1;
  const hour = weatherData.timeHour;
  const isSunset = hour >= 17 && hour <= 19;
  const isSunrise = hour >= 5 && hour <= 7;
  
  const isRaining = [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(weatherData.weatherCode);
  const isSnowing = [71, 73, 75, 77, 85, 86].includes(weatherData.weatherCode);

  let colors = ['#0B0F19', '#161E2E']; // Default Night
  if (isSunset) {
    colors = ['#4338CA', '#DB2777', '#F59E0B'];
  } else if (isSunrise) {
    colors = ['#1E3A8A', '#F472B6', '#FDE047'];
  } else if (isDay) {
    colors = ['#38BDF8', '#0EA5E9', '#2563EB'];
  }

  if (isRaining) {
    colors = isDay ? ['#475569', '#334155', '#1E293B'] : ['#0F172A', '#020617'];
  } else if (isSnowing) {
    colors = isDay ? ['#94A3B8', '#CBD5E1', '#F1F5F9'] : ['#1E293B', '#334155'];
  }

  return (
    <View style={styles.container} pointerEvents="none">
      <LinearGradient
        colors={colors as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      
      <View style={[styles.celestialBody, isDay ? styles.sunPos : styles.moonPos]}>
        <Feather
          name={isSunset ? 'sunset' : isSunrise ? 'sunrise' : isDay ? 'sun' : 'moon'}
          size={180}
          color="#FFF"
          style={{ opacity: 0.15 }}
        />
      </View>

      {isRaining && (
        <View style={styles.weatherOverlay}>
          <Feather name="cloud-rain" size={240} color="#FFF" style={{ opacity: 0.1 }} />
        </View>
      )}
      
      {isSnowing && (
        <View style={styles.weatherOverlay}>
          <Feather name="cloud-snow" size={240} color="#FFF" style={{ opacity: 0.1 }} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0, 
    overflow: 'hidden',
  },
  celestialBody: {
    position: 'absolute',
  },
  sunPos: {
    top: 40,
    right: -40,
  },
  moonPos: {
    top: 60,
    left: -40,
  },
  weatherOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
