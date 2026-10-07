import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { delWorkout, dropEmptySets, duration, emptySets, plural, setTimes, viewOf } from '../model';
import { DateTimeField } from '../DateField';
import { useLog } from '../store';
import { ask, choose, confirm } from '../io';
import { Empty, goBack } from '../components';
import { useEditWorkout, WorkoutEditor } from '../workout';
import { Button, Gap, Header, IconButton, Screen, T } from '../ui';
import { space } from '../theme';

/** Fix a past workout: weights, reps, sets, exercises. Changes save as you go; the version before is in Undo history. */
export default function EditWorkout() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { v, update } = useLog();
  const w = v.workouts.find((x) => x.id === id);
  const edit = useEditWorkout(id);
  // Leaving with nothing logged (e.g. "Log a past workout", then back out): don't keep an empty workout. Undo has it.
  const tidy = useRef(update);
  useEffect(() => { tidy.current = update; });
  useEffect(() => () => tidy.current((l) => {
    const cur = l.workouts.find((x) => x.id === id);
    return cur && !cur.active && !dropEmptySets(viewOf(l), cur).exercises.length ? delWorkout(l, id) : l;
  }), [id]);
  if (!w) return <Screen><Header title="Edit workout" right={<IconButton icon="close" label="Close" onPress={goBack} />} /><Empty>Workout not found.</Empty></Screen>;
  async function rename() { const n = await ask('Workout name', w!.name); if (n) edit((x) => ({ ...x, name: n.slice(0, 60) })); }
  async function done() {
    const n = emptySets(v, w!);
    if (n && dropEmptySets(v, w!).exercises.length
      && await choose(`${plural(n, 'set')} left empty`, 'Remove them, or keep them in this workout?', 'Remove empty sets', 'Keep them')) edit((x) => dropEmptySets(v, x));
    goBack();
  }
  async function remove() {
    if (!(await confirm(`Delete “${w!.name}”?`, 'You can get it back from Undo history.', 'Delete', true))) return;
    update((l) => delWorkout(l, w!.id));
    goBack();
  }
  return (
    <Screen edges={['top', 'bottom']}>
      <Header title="Edit workout" right={<Button title="Done" onPress={done} style={{ minHeight: 44, paddingHorizontal: space.lg }} />} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <T v="title" style={{ flex: 1 }} numberOfLines={2}>{w.name}</T>
        <Button title="Rename" kind="ghost" onPress={rename} style={{ minHeight: 40, paddingHorizontal: space.sm }} />
      </View>
      <View style={{ gap: space.sm, marginTop: space.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <T v="small" style={{ width: 56 }}>Started</T>
          <DateTimeField value={w.startedAt} label="Workout start" onChange={(ms) => edit((x) => setTimes(x, ms, x.endedAt === undefined ? undefined : ms + (x.endedAt - x.startedAt)))} />
        </View>
        {w.endedAt !== undefined && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <T v="small" style={{ width: 56 }}>Ended</T>
            <DateTimeField value={w.endedAt} min={w.startedAt} label="Workout end" onChange={(ms) => edit((x) => setTimes(x, x.startedAt, ms))} />
          </View>
        )}
      </View>
      <T v="small" style={{ marginTop: space.xs }}>{w.endedAt ? `${duration(w.endedAt - w.startedAt)} · ` : ''}changes save as you go</T>
      <Gap h={space.md} />
      <WorkoutEditor workout={w} live={false} />
      <Button title="Add exercises" icon="add" kind="secondary" onPress={() => router.push({ pathname: '/picker', params: { workout: w.id } })} />
      <Gap h={space.sm} />
      <Button title="Delete workout" kind="danger" onPress={remove} />
      <Gap />
    </Screen>
  );
}
