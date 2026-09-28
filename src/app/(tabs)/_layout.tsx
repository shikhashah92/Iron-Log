import { useEffect } from 'react';
import { View } from 'react-native';
import { router, Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore, useTheme } from '../../store';
import { RestBar, WorkoutBar } from '../../components';
import { MAX_WIDTH } from '../../ui';
import { TourOverlay } from '../../tour';
import { sans } from '../../theme';

type Icon = keyof typeof Ionicons.glyphMap;
const TABS: { name: string; title: string; icon: Icon; on: Icon }[] = [
  { name: 'index', title: 'Home', icon: 'home-outline', on: 'home' },
  { name: 'exercises', title: 'Exercises', icon: 'list-outline', on: 'list' },
  { name: 'workout', title: 'Workout', icon: 'barbell-outline', on: 'barbell' },
  { name: 'history', title: 'History', icon: 'stats-chart-outline', on: 'stats-chart' },
  { name: 'me', title: 'Me', icon: 'person-circle-outline', on: 'person-circle' },
];

export default function TabsLayout() {
  const { c } = useTheme();
  const { bottom } = useSafeAreaInsets(); // home-indicator space in the installed app; 0 in a browser tab
  const { log } = useStore();
  const live = !!log?.workouts.some((w) => w.active && w.profileId === log.settings.currentProfileId);
  // A new person: onboarding's second step (optional), then the tour.
  const pending = !!log?.settings.setupPending;
  useEffect(() => { if (pending) router.push({ pathname: '/about', params: { first: '1' } }); }, [pending]);
  return (
    <View style={{ flex: 1 }}>
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: c.accent,
      tabBarInactiveTintColor: c.muted,
      // On a wide screen the bar stays as wide as the content column above it.
      tabBarStyle: { backgroundColor: c.card, borderTopColor: c.border, height: 70 + bottom, paddingBottom: bottom, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
      tabBarLabelPosition: 'below-icon',
      tabBarItemStyle: { paddingTop: 6, paddingBottom: 8 },
      tabBarLabelStyle: { fontSize: 13, lineHeight: 18, fontWeight: '600', fontFamily: sans },
      sceneStyle: { backgroundColor: c.bg },
    }}>
      {TABS.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} options={{
          title: t.title,
          tabBarIcon: ({ color, focused, size }) => <Ionicons name={focused ? t.on : t.icon} size={size} color={color} />,
        }} />
      ))}
    </Tabs>
    <WorkoutBar bottom={78 + bottom} />
    <RestBar bottom={(live ? 142 : 78) + bottom} />
    <TourOverlay inset={bottom} />
    </View>
  );
}
