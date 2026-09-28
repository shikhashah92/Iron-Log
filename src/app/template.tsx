import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { daysAgo, delTemplate, getEx, planSets, plural, putTemplate, today, type Template } from '../model';
import { useLog, useTheme } from '../store';
import { ask, confirm } from '../io';
import { Empty, ExArt, goBack } from '../components';
import { useWorkoutFlow } from '../workout';
import { Button, Card, Gap, Header, IconButton, Screen, T } from '../ui';
import { sans, space } from '../theme';

const ago = (day: string) => { const d = daysAgo(day, today()); return d <= 0 ? 'today' : d === 1 ? 'yesterday' : d < 60 ? `${d} days ago` : `on ${new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`; };

/** A template: what it'll plan and when you last did it, then Start. "Edit" changes its exercises and set counts. */
export default function TemplateScreen() {
  const { id = '', edit: startEditing } = useLocalSearchParams<{ id: string; edit?: string }>();
  const { v, update } = useLog();
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

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={t.name} right={<>
        <Button title={editing ? 'Done' : 'Edit'} kind="ghost" onPress={() => setEditing(!editing)} style={small} />
        <IconButton icon="close" label="Close" onPress={goBack} />
      </>} />
      <T v="small">{last ? `Last performed ${ago(last.date)}` : 'Not done yet'} · {plural(t.exercises.length, 'exercise')}</T>
      <Gap h={space.md} />
      {!editing && <Button title="Start workout" icon="play" onPress={() => flow.start(t.id, true)} disabled={!t.exercises.length} />}
      <Gap h={space.md} />
      <Card pad={false} style={{ paddingHorizontal: space.md }}>
        {t.exercises.length ? t.exercises.map((e, i) => {
          const ex = getEx(v, e.exerciseId);
          return (
            <View key={e.exerciseId} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 64, paddingVertical: space.sm,
              borderBottomWidth: i === t.exercises.length - 1 ? 0 : 1, borderBottomColor: c.border }}>
              <ExArt id={e.exerciseId} size={40} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T numberOfLines={1} style={{ fontFamily: sans, fontWeight: '600', fontSize: 18 }}>{editing ? ex.name : `${count(i)} × ${ex.name}`}</T>
                <T v="small" numberOfLines={1}>{ex.group}{e.sets ? '' : ' · sets as last time'}</T>
              </View>
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
          <Button title="Delete template" kind="danger" onPress={remove} />
        </View>
      )}
    </Screen>
  );
}
