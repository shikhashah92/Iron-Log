import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  addSet, allExercises, entryOf, fmtSet, getEx, lastEntry, matches, MAX_R, MAX_W, recentExIds, shortDate, today, workoutExIds, type Exercise,
} from '../model';
import { useLog, useTheme } from '../store';
import { startRest } from '../timer';
import { ExRow, goBack, Illustration, RestBar } from '../components';
import { Button, Card, Field, Gap, Header, IconButton, Screen, selectAll, T } from '../ui';
import { condensed, mono, radius, space } from '../theme';

/**
 * Quick log, one question at a time (like Munshi's quick add): which exercise, then weight and reps, set after set.
 * Everything is pre-filled from the last set, so most sets are a single tap.
 */
export default function QuickLog() {
  const { id: start } = useLocalSearchParams<{ id?: string }>();
  const { v } = useLog();
  const [exId, setExId] = useState<string | null>(start ?? null);
  return (
    <View style={{ flex: 1 }}>
      <Screen edges={['top', 'bottom']}>
        <Header title={exId ? 'Log a set' : 'Which exercise?'} right={<IconButton icon="close" label="Close" onPress={goBack} />} />
        {exId ? <SetStep ex={getEx(v, exId)} onChange={() => setExId(null)} /> : <ExerciseStep onPick={setExId} />}
      </Screen>
      <RestBar />
    </View>
  );
}

function ExerciseStep({ onPick }: { onPick: (id: string) => void }) {
  const { v } = useLog();
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  // Today's plan first, then favorites, then whatever was done recently: usually the answer is in the first few rows.
  const quick = [...new Set([...workoutExIds(v, today()), ...v.favorites.map((f) => f.exerciseId), ...recentExIds(v)])].slice(0, 8);
  const list: Exercise[] = query
    ? allExercises(v).filter((e) => matches(e, query)).sort((a, b) => a.name.localeCompare(b.name)).slice(0, 60)
    : quick.map((id) => getEx(v, id));
  return (
    <>
      <Field placeholder="Search exercises…" value={q} onChangeText={setQ} autoFocus autoCorrect={false} accessibilityLabel="Search exercises" inputMode="search" />
      <Gap h={space.md} />
      {!query && <T v="label" style={{ marginBottom: space.xs }}>{quick.length ? 'Quick picks' : 'Start typing to find an exercise'}</T>}
      {list.length ? (
        <Card pad={false} style={{ paddingHorizontal: space.md }}>
          {list.map((e, i) => <ExRow key={e.id} ex={e} star={false} last={i === list.length - 1} onPress={() => onPick(e.id)} />)}
        </Card>
      ) : query ? <T v="small">No exercises match.</T> : null}
    </>
  );
}

function SetStep({ ex, onChange }: { ex: Exercise; onChange: () => void }) {
  const { v, log, update } = useLog();
  const { c } = useTheme();
  const iso = today();
  const sets = entryOf(v, iso, ex.id)?.sets ?? [];
  const prev = lastEntry(v, ex.id, iso);
  const seed = sets.at(-1) ?? prev?.sets.at(-1);
  const [w, setW] = useState(seed?.w ? String(seed.w) : '');
  const [r, setR] = useState(seed?.r ? String(seed.r) : '');
  const bw = ex.weightType === 'bodyweight';
  const wStep = ex.weightType === 'dumbbell' || ex.weightType === 'barbell' ? 2.5 : 1;
  const rLabel = ex.metric === 'secs' ? 'Seconds' : 'Reps';
  const wNum = parseFloat(w.replace(',', '.'));
  const rNum = parseInt(r, 10);
  const ok = Number.isInteger(rNum) && rNum > 0 && rNum <= MAX_R && (w.trim() === '' || (Number.isFinite(wNum) && Math.abs(wNum) <= MAX_W));

  function log1() {
    if (!ok) return;
    update((l) => addSet(l, ex.id, iso, Date.now(), { w: Number.isFinite(wNum) ? wNum : 0, r: rNum }));
    startRest(log.settings.restSecs);
  }
  const bump = (val: string, by: number, set: (s: string) => void, min: number) => {
    const n = parseFloat(val.replace(',', '.')) || 0;
    set(String(Math.max(min, Math.round((n + by) * 100) / 100)));
  };

  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={`${ex.name}. Change exercise`} onPress={onChange}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: c.border, opacity: pressed ? 0.6 : 1 })}>
        <Illustration id={ex.id} size={56} animate />
        <T style={{ flex: 1, fontFamily: condensed, fontWeight: '600', fontSize: 22 }}>{ex.name}</T>
        <T v="small" color={c.accent}>Change</T>
      </Pressable>
      <T v="small" style={{ marginTop: space.sm }}>
        {prev ? `Last time (${shortDate(prev.date)}): ${prev.sets.map((x) => fmtSet(x, ex)).join(', ')}` : 'First time logging this one.'}
      </T>
      <Gap />
      <Stepper label={bw ? 'Added weight (kg, optional)' : ex.weightType === 'dumbbell' ? 'Weight per dumbbell (kg)' : 'Weight (kg)'}
        value={w} onChange={setW} decimal onMinus={() => bump(w, -wStep, setW, bw ? -MAX_W : 0)} onPlus={() => bump(w, wStep, setW, bw ? -MAX_W : 0)} />
      <Gap h={space.md} />
      <Stepper label={rLabel} value={r} onChange={setR} onMinus={() => bump(r, -1, setR, 0)} onPlus={() => bump(r, 1, setR, 0)} onSubmit={log1} />
      <Gap />
      <Button title={`Log set ${sets.length + 1}`} icon="checkmark" onPress={log1} disabled={!ok} />
      {sets.length > 0 && (
        <>
          <Gap />
          <T v="label">Today</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.xs }}>
            {sets.map((x, i) => (
              <View key={i} style={{ backgroundColor: c.chip, borderRadius: radius.sm, paddingHorizontal: space.md, paddingVertical: space.xs }}>
                <T style={{ fontFamily: mono, fontSize: 15 }}>{i + 1}. {fmtSet(x, ex)}</T>
              </View>
            ))}
          </View>
          <Gap />
          <Button title="Done" kind="secondary" onPress={goBack} />
        </>
      )}
    </>
  );
}

function Stepper({ label, value, onChange, onMinus, onPlus, decimal, onSubmit }: {
  label: string; value: string; onChange: (s: string) => void; onMinus: () => void; onPlus: () => void; decimal?: boolean; onSubmit?: () => void;
}) {
  const { c } = useTheme();
  const [focused, setFocused] = useState(false);
  const btn = (icon: 'remove' | 'add', onPress: () => void) => (
    <Pressable accessibilityRole="button" accessibilityLabel={`${icon === 'add' ? 'More' : 'Less'} ${label}`} onPress={onPress}
      style={({ pressed }) => ({ width: 56, height: 56, borderRadius: radius.md, backgroundColor: c.chip, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
      <Ionicons name={icon} size={26} color={c.text} />
    </Pressable>
  );
  return (
    <View style={{ gap: space.xs }}>
      <T v="label">{label}</T>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        {btn('remove', onMinus)}
        <TextInput value={value} onChangeText={onChange} inputMode={decimal ? 'decimal' : 'numeric'} accessibilityLabel={label}
          onFocus={(e) => { setFocused(true); selectAll(e); }} onBlur={() => setFocused(false)} onSubmitEditing={onSubmit} placeholder="0" placeholderTextColor={c.muted}
          style={{ flex: 1, minWidth: 0, height: 56, borderWidth: 1.5, borderColor: focused ? c.accent : c.fieldBorder, borderRadius: radius.md, backgroundColor: c.field, color: c.text,
            textAlign: 'center', fontFamily: mono, fontSize: 28, outlineWidth: 0 }} />
        {btn('add', onPlus)}
      </View>
    </View>
  );
}
