import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { delWorkout, duration, longDate } from '../model';
import { useLog } from '../store';
import { ask, confirm } from '../io';
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
  if (!w) return <Screen><Header title="Edit workout" right={<IconButton icon="close" label="Close" onPress={goBack} />} /><Empty>Workout not found.</Empty></Screen>;
  async function rename() { const n = await ask('Workout name', w!.name); if (n) edit((x) => ({ ...x, name: n.slice(0, 60) })); }
  async function remove() {
    if (!(await confirm(`Delete “${w!.name}”?`, 'You can get it back from Undo history.', 'Delete', true))) return;
    update((l) => delWorkout(l, w!.id));
    goBack();
  }
  return (
    <Screen edges={['top', 'bottom']}>
      <Header title="Edit workout" right={<Button title="Done" onPress={goBack} style={{ minHeight: 44, paddingHorizontal: space.lg }} />} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <T v="title" style={{ flex: 1 }} numberOfLines={2}>{w.name}</T>
        <Button title="Rename" kind="ghost" onPress={rename} style={{ minHeight: 40, paddingHorizontal: space.sm }} />
      </View>
      <T v="small">{longDate(w.date)}{w.endedAt ? ` · ${duration(w.endedAt - w.startedAt)}` : ''} · changes save as you go</T>
      <Gap h={space.md} />
      <WorkoutEditor workout={w} live={false} />
      <Button title="Add exercises" icon="add" kind="secondary" onPress={() => router.push({ pathname: '/picker', params: { workout: w.id } })} />
      <Gap h={space.sm} />
      <Button title="Delete workout" kind="danger" onPress={remove} />
      <Gap />
    </Screen>
  );
}
