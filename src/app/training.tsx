import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { googleTrainingURL, trainingFile, trainingICS, trainingStart } from '../body';
import { dayKey, plural, putProfile } from '../model';
import { useLog, useTheme } from '../store';
import { notify, saveFile } from '../io';
import { BASE, isAndroid, isIOS } from '../pwa';
import { goBack } from '../components';
import { Button, Field, Gap, Header, IconButton, Screen, selectAll, T } from '../ui';
import { radius, sans, space } from '../theme';

const NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
/** Sensible days for a weekly goal, spread out with rest between. */
const SPREAD: Record<number, number[]> = { 1: [2], 2: [1, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6] };

/**
 * Your training days as a repeating event in your own calendar: the phone reminds you, with no server involved.
 * iPhone: the app's service worker makes the event (Add to Calendar). Android: Google Calendar, pre-filled. Else: a file.
 */
export default function Training() {
  const { v, update } = useLog();
  const { c } = useTheme();
  const p = v.profile;
  const [days, setDays] = useState<number[]>(p.trainDays ?? SPREAD[p.weeklyGoal ?? 3]);
  const [time, setTime] = useState(p.trainTime ?? '07:00');
  const ok = /^([01]?\d|2[0-3])[:.]?[0-5]\d$/.test(time.trim());
  const hhmm = ok ? time.trim().replace(/[:.]/, '').padStart(4, '0') : '';
  const toggle = (d: number) => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort());

  async function add() {
    if (!days.length) return notify('Pick at least one day');
    if (!ok) return notify('Check the time', 'Use 24-hour time, like 07:00 or 18:30.');
    const t = `${hhmm.slice(0, 2)}:${hhmm.slice(2)}`;
    update((l) => putProfile(l, p.id, { trainDays: days, trainTime: t }));
    const start = trainingStart(days, new Date());
    if (isIOS() && navigator.serviceWorker?.controller) { location.href = new URL(`${BASE}${trainingFile(days, hhmm, start)}`, location.origin).href; return; }
    if (isAndroid()) return void window.open(googleTrainingURL(days, hhmm, start), '_blank');
    try { await saveFile('uplift-training.ics', trainingICS(days, hhmm, dayKey(start).replace(/-/g, '')), 'text/calendar'); }
    catch (e) { notify('Could not create the reminder', (e as Error).message); }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title="Training reminders" right={<IconButton icon="close" label="Close" onPress={goBack} />} />
      <T v="small">Your training days go into your own calendar as one repeating event, so your phone reminds you. Tapping it opens Uplift.</T>
      <Gap />
      <T v="label">Days</T>
      <Gap h={space.sm} />
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {NAMES.map((n, d) => {
          const on = days.includes(d);
          return (
            <Pressable key={n} accessibilityRole="checkbox" aria-checked={on} accessibilityLabel={n} onPress={() => toggle(d)}
              style={{ flex: 1, minHeight: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.brand : c.chip }}>
              <T style={{ fontFamily: sans, fontWeight: on ? '800' : '500', fontSize: 14 }} color={on ? c.onAccent : c.text}>{n}</T>
            </Pressable>
          );
        })}
      </View>
      <T v="small" style={{ marginTop: space.xs }}>{days.length ? `${plural(days.length, 'day')} a week${p.weeklyGoal && days.length !== p.weeklyGoal ? ` (your goal is ${p.weeklyGoal})` : ''}` : 'No days picked'}</T>
      <Gap />
      <Field label="Time (24-hour)" value={time} onChangeText={setTime} inputMode="numeric" onFocus={selectAll} placeholder="07:00" />
      <Gap />
      <Button title="Add to my calendar" icon="calendar-outline" onPress={add} />
      <T v="small" center style={{ marginTop: space.sm, fontSize: 12 }}>Changing your days later? Add it again, then delete the old event in your calendar.</T>
    </Screen>
  );
}
