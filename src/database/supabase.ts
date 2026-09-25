import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hkeiwozrdnktbfaroiod.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrZWl3b3pyZG5rdGJmYXJvaW9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMjI4NjEsImV4cCI6MjEwNTg5ODg2MX0.1Akz3RaluXdhY-m3_XRNt6CiVGM5zn2IMqAE9kBwDc4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
