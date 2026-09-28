import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { bestSet, isTimed, daysAgo, delWorkout, duration, fmtSet, getEx, longDate, matches, num, plural, templateFrom, workoutStats, type Workout } from '../../model';
import { confirm } from '../../io';
import { workoutCalories } from '../../calories';
import { useLog, useTheme } from '../../store';
import { Empty, ProgressBlock, SetLines, useSaveAsTemplate } from '../../components';
import { Button, Card, Field, Gap, Header, Row, Screen, Segmented, T } from '../../ui';
import { condensed, radius, space } from '../../theme';

export default function History() {
  const [tab, setTab] = useState<'sessions' | 'progress'>('sessions');
  return (
    <Screen>
      <Header title="History" />
      <Segmented value={tab} onChange={setTab} options={[{ id: 'sessions', label: 'Workouts' }, { id: 'progress', label: 'Progress' }]} />
      <Gap h={space.md} />
      {tab === 'sessions' ? <Sessions /> : <Progress />}
    </Screen>
  );
}

function Sessions() {
  const { v } = useLog();
  const [open, setOpen] = useState<string | null>(null);
  const [shown, setShown] = useState(30);
  const done = v.workouts.filter((w) => !w.active);
  if (!done.length) return <Card><Empty>No workouts logged yet.</Empty></Card>;
  return (
    <>
      {done.slice(0, shown).map((w) => <WorkoutCard key={w.id} w={w} open={open === w.id} onToggle={() => setOpen(open === w.id ? null : w.id)} />)}
      {shown < done.length && <Button title={`Show more (${done.length - shown})`} kind="ghost" onPress={() => setShown(shown + 30)} />}
    </>
  );
}

/** One finished workout: name, when, how long, how much; open it for every set, and to edit or reuse it. */
function WorkoutCard({ w, open, onToggle }: { w: Workout; open: boolean; onToggle: () => void }) {
  const { v, log, replace, update } = useLog();
  const { c } = useTheme();
  const saveAsTemplate = useSaveAsTemplate();
  const { sets, volume } = workoutStats(v, w);
  const ago = daysAgo(w.date);
  const time = new Date(w.startedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const cal = workoutCalories(v, w);
  const meta = [...(w.endedAt ? [duration(w.endedAt - w.startedAt)] : []), plural(sets, 'set'), ...(volume ? [`${num(volume)} kg`] : []),
    ...(cal ? [`≈${cal} kcal`] : []), ...(w.feeling ? [w.feeling] : [])].join(' · ');
  async function editIt() {
    try { await replace({ log }, 'Before editing a workout'); } catch { /* the undo copy is best effort here */ }
    router.push({ pathname: '/edit-workout', params: { id: w.id } });
  }
  async function remove() {
    if (await confirm(`Delete “${w.name}”?`, `${longDate(w.date)}, ${plural(sets, 'set')}. You can get it back from Undo history.`, 'Delete', true)) {
      try { await replace({ log: delWorkout(log, w.id) }, 'Before deleting a workout'); } catch { update((l) => delWorkout(l, w.id)); }
    }
  }
  return (
    <Card style={{ marginBottom: space.sm }}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onToggle} style={{ gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.sm }}>
          <T numberOfLines={1} style={{ fontFamily: condensed, fontWeight: '700', fontSize: 19, flex: 1 }}>{w.name}</T>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={c.muted} />
        </View>
        <T v="small">{longDate(w.date)}, {time} · {ago === 0 ? 'today' : ago === 1 ? 'yesterday' : `${ago}d ago`}</T>
        <T v="mono" style={{ fontSize: 12 }}>{meta}</T>
        {!open && w.exercises.map((e) => {
          const ex = getEx(v, e.exerciseId);
          const best = isTimed(ex) ? e.sets[0] : bestSet(e.sets.filter((x) => x.kind !== 'W').length ? e.sets.filter((x) => x.kind !== 'W') : e.sets);
          return (
            <View key={e.exerciseId} style={{ flexDirection: 'row', gap: space.sm }}>
              <T numberOfLines={1} style={{ flex: 1, fontSize: 14 }}>{isTimed(ex) ? ex.name : `${e.sets.length} × ${ex.name}`}</T>
              <T v="mono" style={{ fontSize: 12 }}>{best ? fmtSet(best, ex) : ''}</T>
            </View>
          );
        })}
      </Pressable>
      {open && (
        <>
          <Gap h={space.sm} />
          <SetLines entries={v.entries.filter((e) => e.workoutId === w.id)} name />
          <Gap h={space.sm} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            <Button title="Edit" icon="create-outline" kind="secondary" style={{ minHeight: 40 }} onPress={editIt} />
            <Button title="Save as template" icon="star-outline" kind="secondary" style={{ minHeight: 40 }}
              onPress={() => saveAsTemplate(templateFrom(w), w.name)} />
            <Button title="Delete" kind="ghost" style={{ minHeight: 40 }} onPress={remove} />
          </View>
        </>
      )}
    </Card>
  );
}

function Progress() {
  const { v } = useLog();
  const { c } = useTheme();
  const logged = [...new Set([...v.entries].reverse().map((e) => e.exerciseId))]; // most recent first
  const [pick, setPick] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  if (!logged.length) return <Card><Empty>Log a few workouts first, then pick an exercise here to see its progress.</Empty></Card>;
  const id = pick && logged.includes(pick) ? pick : logged[0];
  const ex = getEx(v, id);
  const query = q.trim().toLowerCase();
  const found = logged.filter((x) => matches(getEx(v, x), query));
  const last = (x: string) => v.entries.findLast((e) => e.exerciseId === x)?.date;
  return (
    <>
      {/* A dropdown: the exercise you're looking at; tap to search the ones you've logged (most recent first). */}
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={`Exercise: ${ex.name}. Change`}
        onPress={() => { setOpen(!open); setQ(''); }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 52, paddingHorizontal: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: open ? c.accent : c.fieldBorder, backgroundColor: c.field, marginBottom: space.sm }}>
        <View style={{ flex: 1 }}>
          <T v="small" style={{ fontSize: 12 }}>Exercise · {logged.length} logged</T>
          <T numberOfLines={1} style={{ fontFamily: condensed, fontWeight: '600', fontSize: 20 }}>{ex.name}</T>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={22} color={c.muted} />
      </Pressable>
      {open ? (
        <Card pad={false} style={{ paddingHorizontal: space.md, paddingTop: space.md, marginBottom: space.md }}>
          <Field placeholder={`Search ${logged.length} exercises`} value={q} onChangeText={setQ} autoFocus autoCorrect={false} inputMode="search" accessibilityLabel="Search your exercises" />
          {found.slice(0, 40).map((x, i, all) => (
            <Row key={x} title={getEx(v, x).name} subtitle={`${getEx(v, x).group} · last ${longDate(last(x)!)}`} last={i === all.length - 1}
              right={x === id ? <Ionicons name="checkmark" size={20} color={c.accent} /> : undefined}
              onPress={() => { setPick(x); setOpen(false); }} />
          ))}
          {!found.length && <T v="small" style={{ paddingVertical: space.md }}>None of your logged exercises match.</T>}
        </Card>
      ) : (
        <Card>
          <ProgressBlock v={v} id={id} />
        </Card>
      )}
    </>
  );
}
