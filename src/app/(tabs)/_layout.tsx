import { View } from 'react-native';
import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../store';
import { RestBar } from '../../components';
import { condensed } from '../../theme';

type Icon = keyof typeof Ionicons.glyphMap;
const TABS: { name: string; title: string; icon: Icon; on: Icon }[] = [
  { name: 'index', title: 'Home', icon: 'home-outline', on: 'home' },
  { name: 'exercises', title: 'Exercises', icon: 'list-outline', on: 'list' },
  { name: 'workout', title: 'Workout', icon: 'barbell-outline', on: 'barbell' },
  { name: 'history', title: 'History', icon: 'stats-chart-outline', on: 'stats-chart' },
  { name: 'settings', title: 'Settings', icon: 'settings-outline', on: 'settings' },
];

export default function TabsLayout() {
  const { c } = useTheme();
  const { bottom } = useSafeAreaInsets(); // home-indicator space in the installed app; 0 in a browser tab
  return (
    <View style={{ flex: 1 }}>
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: c.accent,
      tabBarInactiveTintColor: c.muted,
      tabBarStyle: { backgroundColor: c.card, borderTopColor: c.border, height: 70 + bottom, paddingBottom: bottom },
      tabBarItemStyle: { paddingTop: 6, paddingBottom: 8 },
      tabBarLabelStyle: { fontSize: 13, lineHeight: 18, fontWeight: '600', fontFamily: condensed, textTransform: 'uppercase', letterSpacing: 0.5 },
      sceneStyle: { backgroundColor: c.bg },
    }}>
      {TABS.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} options={{
          title: t.title,
          tabBarIcon: ({ color, focused, size }) => <Ionicons name={focused ? t.on : t.icon} size={size} color={color} />,
        }} />
      ))}
    </Tabs>
    <RestBar bottom={78 + bottom} />
    </View>
  );
}
