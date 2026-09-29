import { View, Text, StyleSheet, ScrollView, Dimensions, Pressable } from 'react-native';
import { useState } from 'react';
import { Colors } from '../constants/Colors';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const ONBOARDING_DATA = [
  {
    title: 'Puantajım\'a Hoş Geldiniz',
    description: 'Mesai saatlerinizi ve günlük giriş çıkışlarınızı kolayca takip edebileceğiniz akıllı asistanınız.',
    icon: 'clock' as const,
    frameColor: '#E0E7FF'
  },
  {
    title: 'Konum Doğrulama',
    description: 'İş yeri konumunuzu bir kez ayarlayın. İş yerine geldiğinizde uygulamanın sizi otomatik olarak tanımasına izin verin.',
    icon: 'map-pin' as const,
    frameColor: '#DCFCE7'
  },
  {
    title: 'Gelişmiş Raporlar',
    description: 'Günlük, haftalık ve aylık bazda mesai farklarınızı ve kazancınızı detaylıca görüntüleyin.',
    icon: 'pie-chart' as const,
    frameColor: '#FEF9C3'
  },
  {
    title: 'Kolay Dışa Aktarma',
    description: 'Tüm giriş çıkış hareketlerinizi PDF veya Excel (CSV) olarak tek tuşla patronunuza gönderin.',
    icon: 'download' as const,
    frameColor: '#F3E8FF'
  }
];

export default function OnboardingScreen() {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    setActiveIndex(index);
  };

  const finishOnboarding = async () => {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    const workLat = await AsyncStorage.getItem('workLat');
    if (!workLat) {
      router.replace('/setup-location');
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {ONBOARDING_DATA.map((item, index) => (
          <View key={index} style={styles.slide}>
            <View style={styles.phoneFrame}>
              <View style={styles.phoneNotch} />
              <View style={[styles.phoneInner, { backgroundColor: item.frameColor }]}>
                <Feather name={item.icon} size={70} color={Colors.primary} />
              </View>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {ONBOARDING_DATA.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                activeIndex === index && styles.activeDot
              ]}
            />
          ))}
        </View>

        {activeIndex === ONBOARDING_DATA.length - 1 ? (
          <Pressable style={styles.button} onPress={finishOnboarding}>
            <Text style={styles.buttonText}>Başla</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.skipButton} onPress={finishOnboarding}>
            <Text style={styles.skipText}>Atla</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  phoneFrame: {
    width: width * 0.55,
    height: width * 1.05,
    borderRadius: 36,
    borderWidth: 10,
    borderColor: '#1E293B', // Dark frame to look like a phone bezel
    backgroundColor: '#1E293B',
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 15,
    overflow: 'hidden'
  },
  phoneNotch: {
    position: 'absolute',
    top: -2,
    width: '40%',
    height: 20,
    backgroundColor: '#1E293B',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    zIndex: 10,
  },
  phoneInner: {
    flex: 1,
    width: '100%',
    backgroundColor: Colors.card,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: Colors.lightText,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  footer: {
    padding: 40,
    paddingBottom: 60,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.border,
    marginHorizontal: 6,
  },
  activeDot: {
    backgroundColor: Colors.primary,
    width: 24,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  skipButton: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  skipText: {
    color: Colors.lightText,
    fontSize: 16,
    fontWeight: 'bold',
  }
});
