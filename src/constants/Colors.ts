import { Appearance } from 'react-native';

const darkColors = {
  primary: '#4F46E5',
  background: '#0B0F19',
  card: '#161E2E',
  text: '#F1F5F9',
  lightText: '#94A3B8',
  border: '#1E293B',
  error: '#EF4444', 
  success: '#10B981', 
};

const lightColors = {
  primary: '#4F46E5',
  background: '#F8FAFC',
  card: '#FFFFFF',
  text: '#0F172A',
  lightText: '#64748B',
  border: '#E2E8F0',
  error: '#EF4444', 
  success: '#10B981', 
};

export const Colors = {
  get primary() { return Appearance.getColorScheme() === 'light' ? lightColors.primary : darkColors.primary; },
  get background() { return Appearance.getColorScheme() === 'light' ? lightColors.background : darkColors.background; },
  get card() { return Appearance.getColorScheme() === 'light' ? lightColors.card : darkColors.card; },
  get text() { return Appearance.getColorScheme() === 'light' ? lightColors.text : darkColors.text; },
  get lightText() { return Appearance.getColorScheme() === 'light' ? lightColors.lightText : darkColors.lightText; },
  get border() { return Appearance.getColorScheme() === 'light' ? lightColors.border : darkColors.border; },
  get error() { return Appearance.getColorScheme() === 'light' ? lightColors.error : darkColors.error; },
  get success() { return Appearance.getColorScheme() === 'light' ? lightColors.success : darkColors.success; },
};
