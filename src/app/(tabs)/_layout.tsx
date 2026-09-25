import { Tabs } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Feather } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: Colors.primary,
      tabBarInactiveTintColor: Colors.lightText,
      tabBarStyle: {
        backgroundColor: Colors.background,
        borderTopColor: Colors.border,
        elevation: 0,
      },
      headerStyle: {
        backgroundColor: Colors.background,
        elevation: 0,
        shadowOpacity: 0,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
      },
      headerTintColor: Colors.text,
      headerTitleStyle: {
        fontWeight: 'bold',
        fontFamily: 'System',
      }
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ana Ekran',
          tabBarLabel: 'Giriş',
          tabBarIcon: ({ color }) => <Feather name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Geçmiş Kayıtlar',
          tabBarLabel: 'Geçmiş',
          tabBarIcon: ({ color }) => <Feather name="clock" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Aylık Rapor',
          tabBarLabel: 'Rapor',
          tabBarIcon: ({ color }) => <Feather name="bar-chart-2" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Ayarlar',
          tabBarLabel: 'Ayarlar',
          tabBarIcon: ({ color }) => <Feather name="settings" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
