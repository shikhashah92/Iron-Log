// The app tour: a card over the real screens, one tab at a time, pointing at that tab. Shown once after onboarding;
// Settings > App tour runs it again.
import { useEffect, useSyncExternalStore } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from './store';
import { Button, T } from './ui';
import { radius, space } from './theme';

type Step = { tab: number; icon: keyof typeof Ionicons.glyphMap; title: string; body: string };
const TAB_PATHS = ['/', '/exercises', '/workout', '/history', '/me'] as const;
export const STEPS: Step[] = [
  { tab: 0, icon: 'lock-closed-outline', title: 'Welcome to Iron Log', body: 'A quick look around. Everything you log stays on this phone: no account, no sync, nothing uploaded.' },
  { tab: 0, icon: 'home-outline', title: 'Home', body: 'Today at a glance: your workout in progress, this week’s numbers, favourite exercises, and a nudge when a weigh-in or a backup is due.' },
  { tab: 1, icon: 'list-outline', title: 'Exercises', body: 'Over 100 exercises and activities, with drawings and how-to steps. Star your favorites, or add your own.' },
  { tab: 2, icon: 'barbell-outline', title: 'Workout', body: 'Start an empty workout or a template. Sets fill in from last time: type over them and tick each one. The rest timer starts itself. Log a run or a class here too.' },
  { tab: 3, icon: 'stats-chart-outline', title: 'History', body: 'Every workout with its time and estimated calories, and each exercise’s progress over time. Edit, delete, or save one as a template.' },
  { tab: 4, icon: 'person-circle-outline', title: 'Me', body: 'Weigh-ins, your smoothed trend, a target weight with a planned curve, measurements and progress photos.' },
  { tab: 4, icon: 'shield-checkmark-outline', title: 'Keep a backup', body: 'Settings (the gear in Me) saves a backup file to your own Files or Drive, and imports from Strong. You can replay this tour and contact us from there too.' },
];

// One tour at a time, for the whole app: a tiny external store (no provider needed).
let step: number | null = null;
const subs = new Set<() => void>();
const set = (s: number | null) => { step = s; subs.forEach((f) => f()); };
export const startTour = () => set(0);
const useStep = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => step, () => null);

/** Rendered by the tabs layout, over everything. `inset`: the home-indicator space under the 70px tab bar. */
export function TourOverlay({ inset }: { inset: number }) {
  const { c } = useTheme();
  const i = useStep();
  const s = i === null ? null : STEPS[i];
  useEffect(() => { if (s) router.navigate(TAB_PATHS[s.tab]); }, [s]);
  if (!s || i === null) return null;
  const last = i === STEPS.length - 1;
  const pct = `${((s.tab + 0.5) / TAB_PATHS.length) * 100}%` as const;
  return (
    <View style={{ position: 'absolute', inset: 0 }} accessibilityViewIsModal>
      <Pressable accessible={false} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={() => {}} />
      {/* Ring on the tab this step is about. */}
      <View pointerEvents="none" style={{ position: 'absolute', bottom: inset + 5, left: pct, marginLeft: -30, width: 60, height: 60, borderRadius: 30, borderWidth: 3, borderColor: c.accent }} />
      <View style={{ position: 'absolute', left: space.lg, right: space.lg, bottom: 70 + inset + space.lg, alignItems: 'center' }}>
        <View accessibilityRole="alert" style={{ width: '100%', maxWidth: 520, backgroundColor: c.card, borderRadius: radius.lg, padding: space.lg, gap: space.sm, boxShadow: '0 8px 30px rgba(0,0,0,0.25)' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Ionicons name={s.icon} size={24} color={c.accent} />
            <T v="title" style={{ flex: 1 }}>{s.title}</T>
            <T v="small">{i + 1} / {STEPS.length}</T>
          </View>
          <T>{s.body}</T>
          <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.xs }}>
            {last ? null : <Button title="Skip" kind="ghost" onPress={() => set(null)} style={{ paddingHorizontal: space.sm }} />}
            <View style={{ flex: 1 }} />
            {i > 0 && <Button title="Back" kind="secondary" onPress={() => set(i - 1)} style={{ paddingHorizontal: space.lg }} />}
            <Button title={last ? 'Done' : 'Next'} onPress={() => set(last ? null : i + 1)} style={{ paddingHorizontal: space.xl }} />
          </View>
        </View>
      </View>
    </View>
  );
}
