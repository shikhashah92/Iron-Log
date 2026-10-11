import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { bestSet, daysAgo, delTemplate, fmtSet, getEx, lastEntry, musclesOf, MUSCLE_NAMES, planSets, plural, putTemplate, today, type Muscle, type Template } from '../model';
import { useLog, useTheme } from '../store';
import { ask, confirm } from '../io';
import { Empty, ExArt, goBack, openExercise, Tag } from '../components';
import { useWorkoutFlow } from '../workout';
import { Button, Card, Gap, Header, IconButton, Screen, T } from '../ui';
import { sans, space } from '../theme';

const ago = (day: string) => { const d = daysAgo(day, today()); return d <= 0 ? 'today' : d === 1 ? 'yesterday' : d < 60 ? `${d} days ago` : `on ${new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`; };

/** A template: what it'll plan and when you last did it, then Start. "Edit" changes its exercises and set counts. */
export default function TemplateScreen() {
  const { id = '', edit: startEditing } = useLocalSearchParams<{ id: string; edit?: string }>();
  const { v, log, update } = useLog();
  const { c } = useTheme();
  const flow = useWorkoutFlow();
  const [editing, setEditing] = useState(startEditing === '1');
  const t = v.templates.find((x) => x.id === id);
  if (!t) return <Screen><Header title="Template" right={<IconButton icon="close" label="Close" onPress={goBack} />} /><Empty>Template not found.</Empty></Screen>;
  const last = v.workouts.find((w) => !w.active && (w.templateId === t.id || w.name === t.name));
  const count = (i: number) => t.exercises[i].sets ?? planSets(v, t.exercises[i].exerciseId).length;
  const save = (next: Template) => update((l) => putTemplate(l, next));
  const setCount = (i: number, n: number) => save({ ...t, exercises: t.exercises.map((e, j) => (j === i ? { ...e, sets: Math.max(1, Math.min(20, n)) } : e)) });
  const move = (i: number, by: -1 | 1) => {
    const j = i + by;
    if (j < 0 || j >= t.exercises.length) return;
    const ex = [...t.exercises]; [ex[i], ex[j]] = [ex[j], ex[i]];
    save({ ...t, exercises: ex });
  };
  async function rename() { const n = await ask('Rename template', t!.name); if (n) save({ ...t!, name: n.slice(0, 60) }); }
  async function remove() {
    if (!(await confirm(`Delete “${t!.name}”?`, 'Workouts you already did are not affected.', 'Delete', true))) return;
    update((l) => delTemplate(l, t!.id));
    goBack();
  }
  const small = { minHeight: 40, paddingHorizontal: space.md };
  // What Start will plan: at least the template's sets, never fewer than last time.
  const planned = t.exercises.map((e) => planSets(v, e.exerciseId, e.sets).length);
  // About 45 s a set plus your rest timer (a minute if it's off), to the nearest 5 minutes.
  const mins = Math.max(5, Math.round((planned.reduce((x, y) => x + y, 0) * (45 + (log.settings.restSecs || 60))) / 60 / 5) * 5);
  // Main muscles, the most-hit first.
  const hits = new Map<Muscle, number>();
  t.exercises.forEach((e, i) => musclesOf(getEx(v, e.exerciseId))?.main.forEach((k) => hits.set(k, (hits.get(k) ?? 0) + planned[i])));
  const worked = [...hits].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k]) => k);
  const lastLine = (i: number) => {
    const e = t.exercises[i], ex = getEx(v, e.exerciseId), prev = lastEntry(v, e.exerciseId);
    const work = prev?.sets.filter((x) => x.kind !== 'W') ?? [];
    const best = work.length ? bestSet(work) : undefined;
    return `${plural(planned[i], 'set')} · ${best ? `last ${fmtSet(best, ex, v.unit)}` : 'new for you'}`;
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={t.name} right={<>
        <Button title={editing ? 'Done' : 'Edit'} kind="ghost" onPress={() => setEditing(!editing)} style={small} />
        <IconButton icon="close" label="Close" onPress={goBack} />
      </>} />
      <T v="small">{[plural(t.exercises.length, 'exercise'), plural(planned.reduce((a, b) => a + b, 0), 'set'),
        planned.length ? `about ${mins} min` : '', last ? `last done ${ago(last.date)}` : 'not done yet'].filter(Boolean).join(' · ')}</T>
      {!editing && worked.length > 0 && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: space.sm }}>
        {worked.map((k, i) => <Tag key={k} label={MUSCLE_NAMES[k]} tone={i < 2 ? 'accent' : undefined} />)}
      </View>}
      <Gap h={space.md} />
      {!editing && <Button title="Start workout" icon="play" onPress={() => flow.start(t.id, true)} disabled={!t.exercises.length} />}
      <Gap h={space.md} />
      <Card pad={false} style={{ paddingHorizontal: space.md }}>
        {t.exercises.length ? t.exercises.map((e, i) => {
          const ex = getEx(v, e.exerciseId);
          return (
            <View key={e.exerciseId} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 64, paddingVertical: space.sm,
              borderBottomWidth: i === t.exercises.length - 1 ? 0 : 1, borderBottomColor: c.border }}>
              <Pressable accessibilityRole="button" accessibilityLabel={`${ex.name}: form and history`} onPress={() => openExercise(e.exerciseId)}
                style={({ pressed }) => ({ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: space.sm, opacity: pressed ? 0.6 : 1 })}>
                <ExArt id={e.exerciseId} size={40} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T numberOfLines={1} style={{ fontFamily: sans, fontWeight: '600', fontSize: 18 }}>{ex.name}</T>
                  <T v="small" numberOfLines={1}>{editing ? `${ex.group}${e.sets ? '' : ' · sets as last time'}` : lastLine(i)}</T>
                </View>
              </Pressable>
              {editing && (
                <>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Fewer sets of ${ex.name}`} onPress={() => setCount(i, count(i) - 1)} hitSlop={4}>
                    <Ionicons name="remove-circle-outline" size={26} color={c.muted} />
                  </Pressable>
                  <T style={{ fontFamily: sans, minWidth: 22, textAlign: 'center' }}>{count(i)}</T>
                  <Pressable accessibilityRole="button" accessibilityLabel={`More sets of ${ex.name}`} onPress={() => setCount(i, count(i) + 1)} hitSlop={4}>
                    <Ionicons name="add-circle-outline" size={26} color={c.accent} />
                  </Pressable>
                  <IconButton icon="chevron-up" label={`Move ${ex.name} up`} size={20} onPress={() => move(i, -1)} />
                  <IconButton icon="trash-outline" label={`Remove ${ex.name}`} size={20} color={c.danger}
                    onPress={() => save({ ...t, exercises: t.exercises.filter((_, j) => j !== i) })} />
                </>
              )}
            </View>
          );
        }) : <View style={{ padding: space.md }}><T v="small">No exercises yet. Tap Edit, then “Add exercises”.</T></View>}
      </Card>
      {editing && (
        <View style={{ gap: space.sm, marginTop: space.md }}>
          <Button title="Add exercises" icon="add" kind="secondary" onPress={() => router.push({ pathname: '/picker', params: { template: t.id } })} />
          <Button title="Rename" kind="secondary" onPress={rename} />
          {t.starter ? <T v="small" center>This one comes with Uplift. Any change saves it as your own template.</T>
            : <Button title="Delete template" kind="danger" onPress={remove} />}
        </View>
      )}
    </Screen>
  );
}
