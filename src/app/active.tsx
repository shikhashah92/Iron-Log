import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { plural, setTimes, stopwatch } from '../model';
import { DateTimeField } from '../DateField';
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
  const [editStart, setEditStart] = useState(false);
  const sets = w.exercises.flatMap((e) => e.sets);
  const total = sets.length, done = sets.filter((x) => x.done !== false).length, allDone = total > 0 && done === total;

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
          <Pressable accessibilityRole="button" accessibilityLabel="Minimise workout" onPress={goBack} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44 }}>
            <Ionicons name="chevron-down" size={20} color={c.muted} />
            <T v="small">Minimise</T>
          </Pressable>
          {/* An outline until every set is ticked, so it isn't tapped by mistake halfway through. */}
          <Button title="Finish" kind={allDone ? 'primary' : 'secondary'} onPress={finish} style={{ minHeight: 44, paddingHorizontal: space.xl }} />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`${w.name}. Rename`} onPress={rename}>
          <T numberOfLines={2} style={{ fontFamily: sans, fontWeight: '800', fontSize: 26, letterSpacing: -0.5, marginTop: space.xs }}>{w.name}</T>
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: space.sm }}>
          <T style={{ fontFamily: sans, fontWeight: '700', fontSize: 34, fontVariant: ['tabular-nums'] }}>{stopwatch(now - w.startedAt)}</T>
          <Pressable accessibilityRole="button" accessibilityLabel="Change the start time" onPress={() => setEditStart(!editStart)} hitSlop={6} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <T v="small">started {new Date(w.startedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</T>
            <Ionicons name="pencil" size={13} color={c.muted} />
          </Pressable>
        </View>
        {editStart && <View style={{ marginTop: space.xs, alignSelf: 'flex-start' }}><DateTimeField value={w.startedAt} label="Workout start" onChange={(ms) => edit((x) => setTimes(x, ms))} /></View>}
        {total > 0 && <>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: c.chip, marginTop: space.sm, overflow: 'hidden' }}>
            <View style={{ width: `${(done / total) * 100}%`, height: '100%', backgroundColor: c.brand }} />
          </View>
          <T v="small" style={{ marginTop: 4 }} color={allDone ? c.accent : undefined}>{allDone ? `All ${plural(total, 'set')} done. Finish when you’re ready.` : `${done} of ${plural(total, 'set')}`}</T>
        </>}
        <Pressable accessibilityRole="button" accessibilityLabel={w.note ? `Workout note: ${w.note}. Edit` : 'Add a note about this workout'} onPress={note}
          style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start', marginTop: space.xs, minHeight: 32 }}>
          <Ionicons name="document-text-outline" size={16} color={c.accent} style={{ marginTop: 2 }} />
          <T v="small" style={{ flex: 1, color: w.note ? c.text : c.accent, fontWeight: w.note ? '400' : '600' }}>{w.note || 'Add a note (how you slept, what hurt…)'}</T>
        </Pressable>
        <Gap h={space.sm} />
        <WorkoutEditor workout={w} live />
        <Button title="Add exercises" icon="add" kind="secondary" onPress={() => router.push({ pathname: '/picker', params: { workout: w.id } })} />
        {w.exercises.length > 0 && <><Gap h={space.sm} /><Button title="Finish" kind={allDone ? 'primary' : 'secondary'} onPress={finish} /></>}
        <Gap h={space.sm} />
        <Button title="Cancel workout" kind="danger" onPress={async () => { if (await flow.cancel(w)) goBack(); }} />
        <Gap />
      </Screen>
      <RestBar docked />
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
