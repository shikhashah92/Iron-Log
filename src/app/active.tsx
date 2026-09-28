import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { duration, longDate } from '../model';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLog, useTheme } from '../store';
import { useNow } from '../timer';
import { ask, menu } from '../io';
import { goBack, RestBar } from '../components';
import { useEditWorkout, useWorkoutFlow, WorkoutEditor } from '../workout';
import { Button, Gap, IconButton, Screen, T } from '../ui';
import { sans, space } from '../theme';

/** The workout in progress, full screen. Swipe down or tap ⌄ to shrink it to the bar above the tabs. */
export default function ActiveWorkout() {
  const { v } = useLog();
  const w = v.active;
  if (!w) return <NoWorkout />;
  return <Live key={w.id} />;
}

function Live() {
  const { v } = useLog();
  const w = v.active!;
  const now = useNow(true);
  const flow = useWorkoutFlow();
  const edit = useEditWorkout(w.id);
  const { c } = useTheme();

  async function finish() {
    const r = await flow.finish(w);
    if (r === 'discarded') goBack();
    else if (r) router.replace({ pathname: '/feeling', params: { id: r } });
  }
  async function note() {
    if (w.note && (await menu('Workout note', [{ label: 'Edit note' }, { label: 'Remove note', destructive: true }])) === 1) return edit(({ note: _n, ...x }) => x);
    const t = await ask('Workout note', w.note ?? '');
    if (t !== null) edit((x) => ({ ...x, note: t.slice(0, 1000) }));
  }
  async function rename() {
    const name = await ask('Workout name', w.name);
    if (name) edit((x) => ({ ...x, name: name.slice(0, 60) }));
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen edges={['top', 'bottom']}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: space.sm }}>
          <IconButton icon="chevron-down" label="Minimise workout" onPress={goBack} />
          <Button title="Finish" onPress={finish} style={{ minHeight: 44, paddingHorizontal: space.xl }} />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`${w.name}. Rename`} onPress={rename}>
          <T numberOfLines={2} style={{ fontFamily: sans, fontWeight: '800', fontSize: 28, letterSpacing: -0.56, marginTop: space.sm }}>{w.name}</T>
        </Pressable>
        <T v="small">{longDate(w.date)} · <T v="small" style={{ fontFamily: sans }}>{duration(now - w.startedAt)}</T> · tap the name to rename</T>
        <Pressable accessibilityRole="button" accessibilityLabel={w.note ? `Workout note: ${w.note}. Edit` : 'Add a note about this workout'} onPress={note}
          style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start', marginTop: space.sm, minHeight: 32 }}>
          <Ionicons name="document-text-outline" size={16} color={c.accent} style={{ marginTop: 2 }} />
          <T v="small" style={{ flex: 1, color: w.note ? c.text : c.accent, fontWeight: w.note ? '400' : '600' }}>{w.note || 'Add a note (how you slept, what hurt…)'}</T>
        </Pressable>
        <Gap h={space.sm} />
        <WorkoutEditor workout={w} live />
        <Button title="Add exercises" icon="add" kind="secondary" onPress={() => router.push({ pathname: '/picker', params: { workout: w.id } })} />
        <Gap h={space.sm} />
        <Button title="Cancel workout" kind="danger" onPress={async () => { if (await flow.cancel(w)) goBack(); }} />
        <Gap />
      </Screen>
      <RestBar />
    </View>
  );
}

function NoWorkout() {
  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingTop: space.sm }}>
        <IconButton icon="close" label="Close" onPress={goBack} />
      </View>
      <T v="title">No workout in progress</T>
      <Gap h={space.md} />
      <Button title="Start a workout" onPress={() => router.replace('/workout')} />
    </Screen>
  );
}
