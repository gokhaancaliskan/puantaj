import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/Colors';
import { supabase } from '../database/supabase';
import { Feather } from '@expo/vector-icons';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Hata', 'Lütfen e-posta ve şifre alanlarını doldurun.');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          Alert.alert('Kayıt Hatası', error.message);
        } else if (!data.session) {
          Alert.alert('Başarılı', 'Lütfen e-posta adresinize gelen doğrulama bağlantısına tıklayın!');
        } else {
          await saveRememberMe();
          await checkLocationAndRedirect();
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          Alert.alert('Giriş Hatası', error.message);
        } else {
          await saveRememberMe();
          await checkLocationAndRedirect();
        }
      }
    } catch (e: any) {
      Alert.alert('Hata', e.message || 'Beklenmeyen bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const saveRememberMe = async () => {
    if (rememberMe) {
      // Set session expiry to 7 days from now
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);
      await AsyncStorage.setItem('sessionExpiry', expiryDate.toISOString());
      await AsyncStorage.setItem('rememberMe', 'true');
    } else {
      await AsyncStorage.removeItem('sessionExpiry');
      await AsyncStorage.setItem('rememberMe', 'false');
    }
  };

  const checkLocationAndRedirect = async () => {
    const workLat = await AsyncStorage.getItem('workLat');
    if (workLat) {
      router.replace('/(tabs)');
    } else {
      router.replace('/setup-location');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Feather name="clock" size={40} color="#fff" />
        </View>
        <Text style={styles.title}>Puantajım</Text>
        <Text style={styles.subtitle}>
          {isSignUp ? 'Yeni bir hesap oluşturun' : 'Hesabınıza giriş yapın'}
        </Text>
      </View>

      {/* Form */}
      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <Feather name="mail" size={18} color={Colors.lightText} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="E-posta adresiniz"
              placeholderTextColor={Colors.lightText}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <Feather name="lock" size={18} color={Colors.lightText} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Şifreniz"
              placeholderTextColor={Colors.lightText}
              secureTextEntry={!showPassword}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} style={{ padding: 4, marginRight: 4 }}>
              <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={Colors.lightText} />
            </Pressable>
          </View>
        </View>

        {/* Remember Me */}
        {!isSignUp && (
          <Pressable style={styles.rememberRow} onPress={() => setRememberMe(!rememberMe)}>
            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
              {rememberMe && <Feather name="check" size={12} color="#fff" />}
            </View>
            <Text style={styles.rememberText}>Beni Hatırla (7 gün)</Text>
          </Pressable>
        )}

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, loading && styles.buttonDisabled]}
          onPress={handleAuth}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{isSignUp ? 'Kayıt Ol' : 'Giriş Yap'}</Text>
          )}
        </Pressable>

        <Pressable style={styles.switchModeButton} onPress={() => setIsSignUp(!isSignUp)}>
          <Text style={styles.switchModeText}>
            {isSignUp ? 'Zaten hesabınız var mı? ' : 'Hesabınız yok mu? '}
            <Text style={{ fontWeight: 'bold' }}>{isSignUp ? 'Giriş Yapın' : 'Kayıt Olun'}</Text>
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flex: 0.4,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.lightText,
    marginTop: 6,
  },
  form: {
    flex: 0.6,
    paddingHorizontal: 28,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.text,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  rememberText: {
    fontSize: 14,
    color: Colors.lightText,
    fontWeight: '500',
  },
  button: {
    backgroundColor: Colors.primary,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  switchModeButton: {
    marginTop: 20,
    alignItems: 'center',
    padding: 8,
  },
  switchModeText: {
    color: Colors.lightText,
    fontSize: 14,
  },
});
