import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';

const weatherTranslations: Record<number, string> = {
  0: 'Açık / Güneşli',
  1: 'Çoğunlukla Açık',
  2: 'Parçalı Bulutlu',
  3: 'Çok Bulutlu',
  45: 'Sisli',
  48: 'Kırağılı Sis',
  51: 'Hafif Çisenti',
  53: 'Çisenti',
  55: 'Yoğun Çisenti',
  61: 'Hafif Yağmurlu',
  63: 'Yağmurlu',
  65: 'Şiddetli Yağmurlu',
  71: 'Hafif Kar Yağışlı',
  73: 'Kar Yağışlı',
  75: 'Yoğun Kar Yağışlı',
  80: 'Hafif Sağanak Yağış',
  81: 'Sağanak Yağış',
  82: 'Şiddetli Sağanak Yağış',
  95: 'Gök Gürültülü Fırtına',
  96: 'Hafif Dolulu Fırtına',
  99: 'Şiddetli Dolulu Fırtına',
};

export default function WeatherTimeEffect() {
  const [weatherData, setWeatherData] = useState<{ isDay: number; weatherCode: number; timeHour: number; temp: number } | null>(null);

  useEffect(() => {
    fetchWeather();
  }, []);

  async function fetchWeather() {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      let lat = 41.0082;
      let lon = 28.9784;

      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        lat = location.coords.latitude;
        lon = location.coords.longitude;
      }

      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,is_day,weather_code&timezone=auto`);
      const data = await res.json();
      const current = data.current;
      setWeatherData({
        isDay: current.is_day,
        weatherCode: current.weather_code,
        timeHour: new Date().getHours(),
        temp: current.temperature_2m,
      });
    } catch (e) {
      console.log('Weather fetch err', e);
    }
  }

  if (!weatherData) return null;

  const { isDay, weatherCode, temp } = weatherData;
  const isRaining = [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(weatherCode);
  const isSnowing = [71, 73, 75, 77, 85, 86].includes(weatherCode);
  const isCloudy = [2, 3, 45, 48].includes(weatherCode);

  let colors = isDay ? ['#38BDF8', '#0284C7'] : ['#1E1B4B', '#312E81'];
  if (isRaining) colors = isDay ? ['#475569', '#1E293B'] : ['#0F172A', '#020617'];
  else if (isSnowing) colors = isDay ? ['#94A3B8', '#F1F5F9'] : ['#1E293B', '#334155'];

  return (
    <View style={styles.cardContainer}>
      <LinearGradient colors={colors as [string, string]} style={styles.gradientCard}>
        <View style={styles.cardContent}>
          <View style={styles.infoCol}>
            <Text style={styles.tempText}>{Math.round(temp)}°C</Text>
            <Text style={styles.descText}>{weatherTranslations[weatherCode] || 'Bilinmiyor'}</Text>
          </View>
          <View style={styles.emojiCol}>
            {isRaining && <Text style={styles.emojiText}>🌧️</Text>}
            {isSnowing && <Text style={styles.emojiText}>❄️</Text>}
            {isCloudy && !isRaining && !isSnowing && <Text style={styles.emojiText}>☁️</Text>}
            {!isRaining && !isSnowing && !isCloudy && isDay ? <Text style={styles.emojiText}>☀️</Text> : null}
            {!isRaining && !isSnowing && !isCloudy && !isDay ? <Text style={styles.emojiText}>🌙</Text> : null}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: 24,
    marginTop: 48, // Safe area push
    marginBottom: -10, // Pull scroll view slightly up
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    zIndex: 10,
  },
  gradientCard: {
    padding: 20,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoCol: {
    flex: 1,
  },
  tempText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFF',
  },
  descText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
    marginTop: 4,
  },
  emojiCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 48,
  }
});
