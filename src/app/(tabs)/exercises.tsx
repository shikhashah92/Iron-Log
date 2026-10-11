import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { GROUPS } from '../../exercises';
import { ACTIVITY_GROUPS, allExercises, isCustom, matches } from '../../model';
import { useLog } from '../../store';
import { Empty, ExRow, GroupChips, inGroup } from '../../components';
import { Button, Card, Field, Header, Screen, T } from '../../ui';
import { space } from '../../theme';

export default function Exercises() {
  const { v } = useLog();
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('All');
  const all = allExercises(v);
  const query = q.trim().toLowerCase();
  const items = all.filter((e) => inGroup(v, e, group) && matches(e, query))
    .sort((a, b) => a.name.localeCompare(b.name));
  // Grouped by muscle when browsing everything; a flat list when searching or filtered.
  const sections = query || group !== 'All'
    ? [{ title: '', list: items }]
    : [...[...GROUPS, ...ACTIVITY_GROUPS].map((g) => ({ title: g, list: items.filter((e) => e.group === g && !isCustom(v, e.id)) })),
      { title: 'Custom', list: items.filter((e) => isCustom(v, e.id)) }].filter((s) => s.list.length);

  return (
    <Screen>
      <Header title="Exercises" right={<Button title="Add" icon="add" kind="secondary" onPress={() => router.push('/edit-exercise')} style={{ minHeight: 44, paddingHorizontal: space.md }} />} />
      <Field placeholder={`Search ${all.length} exercises…`} value={q} onChangeText={setQ} autoCorrect={false} accessibilityLabel="Search exercises" inputMode="search" />
      <GroupChips group={group} onChange={setGroup} />
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
