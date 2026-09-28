import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { addToWorkout, allExercises, isFav, matches, putTemplate, today, workoutExIds } from '../model';
import { useLog, useTheme } from '../store';
import { ExRow, goBack, Tag } from '../components';
import { Button, Card, Field, Header, IconButton, Screen, T } from '../ui';
import { space } from '../theme';

/** Pick exercises for today's workout, or for a template (`?template=<id>`). Favorites first. */
export default function Picker() {
  const { template } = useLocalSearchParams<{ template?: string }>();
  const { v, update } = useLog();
  const { c } = useTheme();
  const [q, setQ] = useState('');
  const t = template ? v.templates.find((x) => x.id === template) : undefined;
  const already = t ? t.exerciseIds : workoutExIds(v, today());
  const query = q.trim().toLowerCase();
  const items = allExercises(v).filter((e) => matches(e, query))
    .sort((a, b) => Number(isFav(v, b.id)) - Number(isFav(v, a.id)) || a.name.localeCompare(b.name)).slice(0, 90);

  function pick(id: string) {
    if (t) {
      if (!t.exerciseIds.includes(id)) update((l) => putTemplate(l, { ...t, exerciseIds: [...t.exerciseIds, id] }));
    } else {
      update((l) => addToWorkout(l, id));
      goBack();
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={t ? `Add to ${t.name}` : 'Add to workout'} right={<IconButton icon="close" label="Close" onPress={goBack} />} />
      <Field placeholder="Search…" value={q} onChangeText={setQ} autoFocus autoCorrect={false} accessibilityLabel="Search exercises" inputMode="search" />
      <View style={{ flexDirection: 'row', marginVertical: space.sm }}>
        <Button title="New custom exercise" icon="add" kind="ghost" onPress={() => router.push('/edit-exercise')} style={{ paddingHorizontal: 0 }} />
      </View>
      <Card pad={false} style={{ paddingHorizontal: space.md }}>
        {items.length ? items.map((e, i) => (
          <ExRow key={e.id} ex={e} star={false} last={i === items.length - 1} onPress={() => pick(e.id)}
            right={already.includes(e.id) ? <Tag label="Added" tone="good" /> : <T style={{ fontWeight: '600' }} color={c.accent}>Add</T>} />
        )) : <T v="small" style={{ padding: space.lg }}>No exercises match.</T>}
      </Card>
    </Screen>
  );
}
