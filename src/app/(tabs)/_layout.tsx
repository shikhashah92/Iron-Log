import { useEffect } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { router, Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore, useTheme } from '../../store';
import { WorkoutBar } from '../../components';
import { MAX_WIDTH } from '../../ui';
import { TourOverlay } from '../../tour';
import { stopRest } from '../../timer';
import { backupDue } from '../../model';
import { useForgottenWorkout } from '../../workout';
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
  const narrow = useWindowDimensions().width < 360; // e.g. iPhone SE: smaller labels so "Exercises" fits
  const { bottom } = useSafeAreaInsets(); // home-indicator space in the installed app; 0 in a browser tab
  const { log } = useStore();
  const live = !!log?.workouts.some((w) => w.active && w.profileId === log.settings.currentProfileId);
  // A new person: onboarding's second step (optional), then the tour.
  const pending = !!log?.settings.setupPending;
  const due = !!log && backupDue(log);
  useEffect(() => { if (pending) router.push({ pathname: '/about', params: { first: '1' } }); }, [pending]);
  // The rest timer belongs to the workout in progress: once it's saved, discarded or deleted, the timer goes too.
  useEffect(() => { if (!live) stopRest(); }, [live]);
  useForgottenWorkout();
  return (
    <View style={{ flex: 1 }}>
    <Tabs screenOptions={({ navigation }) => ({
      headerShown: false,
      tabBarActiveTintColor: c.accent,
      tabBarInactiveTintColor: c.muted,
      // On a wide screen the bar stays as wide as the content column above it.
      tabBarStyle: { backgroundColor: c.card, borderTopColor: c.border, height: 70 + bottom, paddingBottom: bottom, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' },
      tabBarLabelPosition: 'below-icon',
      tabBarItemStyle: { paddingTop: 6, paddingBottom: 8 },
      tabBarLabelStyle: { fontSize: narrow ? 11 : 13, lineHeight: 18, fontWeight: '600', fontFamily: sans },
      // Tabs you're not on stay mounted (they keep their scroll) but are hidden, so screen readers and Tab skip them.
      sceneStyle: { backgroundColor: c.bg, display: navigation.isFocused() ? 'flex' : 'none' },
    })}>
      {TABS.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} options={{
          title: t.title,
          // A dot on Me when a backup is overdue (Settings, from Me, is where you save one).
          ...(t.name === 'me' && due ? { tabBarBadge: '', tabBarBadgeStyle: { backgroundColor: c.warnText, minWidth: 10, height: 10, borderRadius: 5, top: 4 } } : {}),
          tabBarIcon: ({ color, focused, size }) => <Ionicons name={focused ? t.on : t.icon} size={size} color={color} />,
        }} />
      ))}
    </Tabs>
    <WorkoutBar bottom={78 + bottom} />
    <TourOverlay inset={bottom} />
    </View>
  );
}
