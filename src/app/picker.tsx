import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ACTIVITY_GROUPS, addExercises, allExercises, getEx, isFav, isTimed, matches, putTemplate, putWorkout, recentExIds, replaceExercise, startWorkout, viewOf } from '../model';
import { useLog, useTheme } from '../store';
import { ExRow, goBack, GroupChips, inGroup, openExercise, Tag } from '../components';
import { GROUPS } from '../exercises';
import { Button, Card, Field, Header, IconButton, Screen, T } from '../ui';
import { space } from '../theme';

/**
 * Pick exercises for a workout (`?workout=<id>`, the live one or one you're editing) or a template (`?template=<id>`).
 * Tap to select several, then Add. With `&replace=<i>`, one tap swaps that exercise. Favorites and recent ones first.
 */
export default function Picker() {
  const { workout, template, replace, activity } = useLocalSearchParams<{ workout?: string; template?: string; replace?: string; activity?: string }>();
  const { v, update } = useLog();
  const { c } = useTheme();
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const w = workout ? v.workouts.find((x) => x.id === workout) : undefined;
  const t = template ? v.templates.find((x) => x.id === template) : undefined;
  const already = w ? w.exercises.map((e) => e.exerciseId) : t ? t.exercises.map((e) => e.exerciseId) : [];
  const swapping = replace !== undefined && w ? Number(replace) : null;
  const query = q.trim().toLowerCase();
  const recent = recentExIds(v);
  const rank = (id: string) => (isFav(v, id) ? 0 : recent.includes(id) ? 1 : 2);
  const onlyActivities = activity === '1';
  const [group, setGroup] = useState('All');
  const items = allExercises(v).filter((e) => matches(e, query) && (!onlyActivities || isTimed(e)) && inGroup(v, e, group))
    .sort((a, b) => rank(a.id) - rank(b.id) || a.name.localeCompare(b.name));
  // Browsing everything: your favourites and recent ones first, then the rest by group (yoga and sports apart from the lifts).
  const top = items.filter((e) => rank(e.id) < 2).slice(0, 8), topIds = new Set(top.map((e) => e.id));
  const sections = query || group !== 'All' || onlyActivities ? [{ title: '', list: items }]
    : [{ title: 'Favourites and recent', list: top },
      ...[...GROUPS, ...ACTIVITY_GROUPS, 'Other'].map((g) => ({ title: g, list: items.filter((e) => !topIds.has(e.id) && (g === 'Other' ? !([...GROUPS, ...ACTIVITY_GROUPS] as string[]).includes(e.group) : e.group === g)) }))]
      .filter((x) => x.list.length);

  function add(ids: string[]) {
    if (!ids.length) return;
    if (w) update((l) => putWorkout(l, addExercises(w, v, ids, !w.active)));
    else if (t) update((l) => putTemplate(l, { ...t, exercises: [...t.exercises, ...ids.filter((id) => !already.includes(id)).map((id) => ({ exerciseId: id }))] }));
    goBack();
  }
  function tap(id: string) {
    if (onlyActivities) {
      // One tap: into the workout in progress, or a new workout named after the activity.
      if (w) { update((l) => putWorkout(l, addExercises(w, v, [id], !w.active))); return goBack(); }
      update((l) => {
        const started = startWorkout(l);
        const nw = viewOf(started).active!;
        return putWorkout(started, { ...addExercises(nw, viewOf(started), [id]), name: getEx(v, id).kind === 'yoga' ? 'Yoga' : getEx(v, id).name });
      });
      return router.replace('/active');
    }
    if (swapping !== null && w) { update((l) => putWorkout(l, replaceExercise(w, v, swapping, id, !w.active))); return goBack(); }
    if (already.includes(id)) return;
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }
  const title = onlyActivities ? 'Log an activity' : swapping !== null ? 'Replace with…' : t ? `Add to ${t.name}` : 'Add exercises';

  return (
    <View style={{ flex: 1 }}>
      <Screen edges={['top', 'bottom']}>
        <Header title={title} right={<IconButton icon="close" label="Close" onPress={goBack} />} />
        <Field placeholder={`Search ${allExercises(v).length} exercises…`} value={q} onChangeText={setQ} autoFocus autoCorrect={false} accessibilityLabel="Search exercises" inputMode="search" />
        {!onlyActivities && <GroupChips group={group} onChange={setGroup} />}
        {!items.length ? <Card><T v="small">No exercises match.</T></Card> : sections.map((sec) => (
        <View key={sec.title} style={{ marginBottom: space.md }}>
        {sec.title ? <T v="label" style={{ marginBottom: space.xs, marginLeft: 2 }}>{sec.title}</T> : null}
        <Card pad={false} style={{ paddingHorizontal: space.md }}>
          {sec.list.map((e, i) => {
            const on = picked.includes(e.id);
            const inIt = already.includes(e.id);
            return (
              <ExRow key={e.id} ex={e} star={false} last={i === sec.list.length - 1} onPress={() => tap(e.id)}
                actions={<IconButton icon="information-circle-outline" label={`${e.name}: form and history`} size={22} color={c.muted} onPress={() => openExercise(e.id)} />}
                right={inIt ? <Tag label="Added" tone="good" />
                  : swapping !== null || onlyActivities ? <T style={{ fontWeight: '600' }} color={c.accent}>{onlyActivities ? 'Start' : 'Use'}</T>
                  : <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={on ? c.accent : c.muted} />} />
            );
          })}
        </Card>
        </View>
        ))}
        <Button title="New custom exercise" icon="add" kind="ghost" onPress={() => router.push('/edit-exercise')} style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }} />
      </Screen>
      {swapping === null && !onlyActivities && picked.length > 0 && (
        <View style={{ position: 'absolute', left: space.lg, right: space.lg, bottom: 24, alignItems: 'center' }}>
          <Button title={`Add ${picked.length === 1 ? '1 exercise' : `${picked.length} exercises`}`} icon="add" onPress={() => add(picked)} style={{ width: '100%', maxWidth: 520 }} />
        </View>
      )}
    </View>
  );
}
