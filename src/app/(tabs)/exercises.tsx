import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { GROUPS } from '../../exercises';
import { allExercises, isCustom, isFav, matches } from '../../model';
import { useLog } from '../../store';
import { Empty, ExRow } from '../../components';
import { Button, Card, Chip, Field, Header, Screen, T } from '../../ui';
import { space } from '../../theme';

export default function Exercises() {
  const { v } = useLog();
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('All');
  const all = allExercises(v);
  const query = q.trim().toLowerCase();
  const items = all.filter((e) => (group === 'All' ? true : group === 'Favorites' ? isFav(v, e.id) : group === 'Custom' ? isCustom(v, e.id) : e.group === group) && matches(e, query))
    .sort((a, b) => a.name.localeCompare(b.name));
  const chips = ['All', ...(v.favorites.length ? ['Favorites'] : []), ...GROUPS, ...(v.exercises.length ? ['Custom'] : [])];
  // Grouped by muscle when browsing everything; a flat list when searching or filtered.
  const sections = query || group !== 'All'
    ? [{ title: '', list: items }]
    : [...GROUPS.map((g) => ({ title: g, list: items.filter((e) => e.group === g && !isCustom(v, e.id)) })),
      { title: 'Custom', list: items.filter((e) => isCustom(v, e.id)) }].filter((s) => s.list.length);

  return (
    <Screen>
      <Header title="Exercises" right={<Button title="Add" icon="add" kind="secondary" onPress={() => router.push('/edit-exercise')} style={{ minHeight: 44, paddingHorizontal: space.md }} />} />
      <Field placeholder={`Search ${all.length} exercises…`} value={q} onChangeText={setQ} autoCorrect={false} accessibilityLabel="Search exercises" inputMode="search" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: space.md }} contentContainerStyle={{ gap: space.sm }}>
        {chips.map((g) => <Chip key={g} label={g === 'Favorites' ? '★ Favorites' : g} selected={group === g} onPress={() => setGroup(g)} />)}
      </ScrollView>
      {!items.length ? <Empty>No exercises match.</Empty> : sections.map((s) => (
        <View key={s.title} style={{ marginBottom: space.md }}>
          {s.title ? <T v="label" style={{ marginBottom: space.xs, marginLeft: 2 }}>{s.title}</T> : null}
          <Card pad={false} style={{ paddingHorizontal: space.md }}>
            {s.list.map((e, i) => <ExRow key={e.id} ex={e} last={i === s.list.length - 1} />)}
          </Card>
        </View>
      ))}
    </Screen>
  );
}
