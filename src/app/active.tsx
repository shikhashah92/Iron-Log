import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { duration, longDate } from '../model';
import { useLog, useTheme } from '../store';
import { useNow } from '../timer';
import { ask } from '../io';
import { goBack, RestBar } from '../components';
import { useEditWorkout, useWorkoutFlow, WorkoutEditor } from '../workout';
import { Button, Gap, IconButton, Screen, T } from '../ui';
import { condensed, mono, space } from '../theme';

/** The workout in progress, full screen. Swipe down or tap ⌄ to shrink it to the bar above the tabs. */
export default function ActiveWorkout() {
  const { v } = useLog();
  const w = v.active;
  if (!w) return <NoWorkout />;
  return <Live key={w.id} />;
}

function Live() {
  const { v } = useLog();
  const { c } = useTheme();
  const w = v.active!;
  const now = useNow(true);
  const flow = useWorkoutFlow();
  const edit = useEditWorkout(w.id);

  async function finish() {
    const r = await flow.finish(w);
    if (r === 'discarded') goBack();
    else if (r) router.replace({ pathname: '/feeling', params: { id: r } });
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
          <Button title="Finish" onPress={finish} style={{ minHeight: 44, paddingHorizontal: space.xl, backgroundColor: c.good }} />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`${w.name}. Rename`} onPress={rename}>
          <T numberOfLines={2} style={{ fontFamily: condensed, fontWeight: '700', fontSize: 28, textTransform: 'uppercase', marginTop: space.sm }}>{w.name}</T>
        </Pressable>
        <T v="small">{longDate(w.date)} · <T v="small" style={{ fontFamily: mono }}>{duration(now - w.startedAt)}</T> · tap the name to rename</T>
        <Gap h={space.md} />
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
