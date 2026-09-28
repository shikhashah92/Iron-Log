import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  addSet, delSet, duration, entryOf, fmtSet, getEx, lastEntry, longDate, num, prOf, removeFromWorkout, repeatLast,
  startTemplate, startWorkout, today, updateSet, volumeOf, workoutExIds, WEIGHT_TYPES, plural,
} from '../../model';
import { useLog, useTheme } from '../../store';
import { startRest, useNow } from '../../timer';
import { confirm } from '../../io';
import { Empty, openExercise, Tag, useSaveAsTemplate } from '../../components';
import { Button, Card, Gap, Header, IconButton, Screen, selectAll, T } from '../../ui';
import { condensed, mono, radius, space } from '../../theme';

export default function Workout() {
  const { v, update } = useLog();
  const { c } = useTheme();
  const saveAsTemplate = useSaveAsTemplate();
  const iso = today();
  const ids = workoutExIds(v, iso);
  const s = v.sessions.get(iso);
  const live = !!s?.startedAt && !s.endedAt;
  const now = useNow(live);
  let sets = 0, vol = 0;
  for (const id of ids) {
    const e = entryOf(v, iso, id);
    if (e) { sets += e.sets.length; vol += volumeOf(e, getEx(v, id), v.profile.bodyweight); }
  }

  return (
    <Screen>
      <Header title="Workout" right={<T v="mono" style={{ fontSize: 12 }}>{longDate(iso)}</T>} />
      {/* The clock starts by itself with the first set; this row only shows it, or lets you start it early. */}
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm }}>
        <Ionicons name="stopwatch-outline" size={22} color={live ? c.accent : c.muted} />
        {!s?.startedAt ? (
          <>
            <T v="small" style={{ flex: 1 }}>The clock starts with your first set.</T>
            <Button title="Start now" kind="ghost" onPress={() => update((l) => startWorkout(l))} style={st.small} />
          </>
        ) : live ? (
          <>
            <T style={{ flex: 1, fontFamily: mono, fontSize: 22 }}>{duration(now - s.startedAt)}</T>
            <Button title="End workout" kind="secondary" onPress={() => router.push('/feeling')} style={st.small} />
          </>
        ) : (
          <>
            <T v="small" style={{ flex: 1 }}>Finished in {duration(s.endedAt! - s.startedAt)}{s.feeling ? ` · felt ${s.feeling}` : ''}</T>
            <Button title="Start again" kind="ghost" onPress={() => update((l) => startWorkout(l))} style={st.small} />
          </>
        )}
      </Card>
      <Gap h={space.md} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <T v="small" style={{ flex: 1 }}>{plural(ids.length, 'exercise')} · {plural(sets, 'set')} · {num(vol)} kg</T>
        <Button title="Templates" kind="ghost" onPress={() => router.push('/templates')} style={{ minHeight: 44, paddingHorizontal: space.md }} />
        <Button title="Add" icon="add" onPress={() => router.push('/picker')} style={{ minHeight: 44, paddingHorizontal: space.md }} />
      </View>
      <Gap h={space.md} />
      {ids.length ? (
        <>
          {ids.map((id) => <ExerciseCard key={id} id={id} />)}
          <Button title="Save today’s exercises as a template" icon="star-outline" kind="ghost" onPress={() => saveAsTemplate(ids)} />
        </>
      ) : (
        <Card style={{ gap: space.sm }}>
          <Empty>No exercises yet. Tap “Add” to build today’s session{v.templates.length ? ', or start a template:' : ', or start one from Home.'}</Empty>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {v.templates.map((t) => (
              <Button key={t.id} title={t.name} icon="play" kind="secondary" style={{ minHeight: 44 }}
                onPress={() => update((l) => startTemplate(l, t.exerciseIds))} />
            ))}
          </View>
        </Card>
      )}
    </Screen>
  );
}

function ExerciseCard({ id }: { id: string }) {
  const { v, log, update } = useLog();
  const { c } = useTheme();
  const [focusRow, setFocusRow] = useState<number | null>(null);
  const iso = today();
  const ex = getEx(v, id);
  const sets = entryOf(v, iso, id)?.sets ?? [];
  const pr = prOf(v, id);
  const hit = pr > 0 && sets.some((x) => x.w >= pr);
  const prev = lastEntry(v, id, iso);
  const unit = WEIGHT_TYPES.find((t) => t.id === ex.weightType)?.unit ?? 'kg';
  const wLabel = ex.weightType === 'bodyweight' ? '±kg' : ex.weightType === 'dumbbell' ? 'kg/DB' : 'kg';
  const rLabel = ex.metric === 'secs' ? 'secs' : 'reps';
  const add = () => { update((l) => addSet(l, id)); setFocusRow(sets.length); };

  async function remove() {
    if (await confirm(`Remove ${ex.name} from today?`, sets.length ? `Its ${plural(sets.length, 'set')} from today are removed too.` : '', 'Remove', true))
      update((l) => removeFromWorkout(l, id));
  }

  return (
    <Card style={{ marginBottom: space.md, paddingBottom: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <T numberOfLines={2} style={{ flex: 1, fontFamily: condensed, fontWeight: '600', fontSize: 20 }}>{ex.name}</T>
        <Tag label={pr > 0 ? `PR ${num(pr)}` : 'no PR'} tone={hit ? 'good' : undefined} />
        <IconButton icon="close" label={`Remove ${ex.name}`} onPress={remove} size={22} color={c.muted} />
      </View>
      <T v="small" style={{ fontSize: 13 }}>{[ex.equip, `enter ${unit}`, prev ? `last: ${prev.sets.map((x) => fmtSet(x, ex)).join(', ')}` : ''].filter(Boolean).join(' · ')}</T>
      <View style={[st.row, { marginTop: space.sm }]}>
        <T v="label" style={{ ...st.idx, fontSize: 11 }}> </T>
        <T v="label" style={{ ...st.cell, fontSize: 11, textAlign: 'center' }}>{wLabel}</T>
        <T v="label" style={{ ...st.cell, fontSize: 11, textAlign: 'center' }}>{rLabel}</T>
        <View style={st.del} />
      </View>
      {sets.map((x, i) => (
        <View key={`${log.settings.currentProfileId}-${i}`} style={st.row}>
          <T v="mono" style={st.idx}>{i + 1}</T>
          <SetInput value={x.w} decimal label={`Set ${i + 1} weight`} autoFocus={focusRow === i}
            onCommit={(t) => update((l) => updateSet(l, id, i, 'w', t))} />
          <SetInput value={x.r} label={`Set ${i + 1} ${rLabel}`}
            onCommit={(t) => { update((l) => updateSet(l, id, i, 'r', t)); if (t.trim()) startRest(log.settings.restSecs); }}
            onSubmit={add} />
          <Pressable accessibilityRole="button" accessibilityLabel={`Delete set ${i + 1}`} onPress={() => update((l) => delSet(l, id, i))} style={st.del}>
            <Ionicons name="close" size={18} color={c.muted} />
          </Pressable>
        </View>
      ))}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm }}>
        <Button title="Set" icon="add" kind="secondary" onPress={add} style={st.small} />
        {prev && <Button title={`Repeat last (${prev.sets.length})`} kind="ghost" onPress={() => update((l) => repeatLast(l, id))} style={st.small} />}
        <Button title="Form" kind="ghost" onPress={() => openExercise(id)} style={st.small} />
      </View>
    </Card>
  );
}

/**
 * A number field that keeps what's being typed and saves on blur / enter. The text is selected on focus, so typing
 * replaces a pre-filled value instead of mixing with it (the old app's "47.545" bug).
 */
function SetInput({ value, decimal, label, autoFocus, onCommit, onSubmit }: {
  value: number; decimal?: boolean; label: string; autoFocus?: boolean; onCommit: (text: string) => void; onSubmit?: () => void;
}) {
  const { c } = useTheme();
  const shown = value ? String(value) : '';
  const [text, setText] = useState<string | null>(null); // null: not editing, show the stored value
  const [focused, setFocused] = useState(false);
  const commit = () => { if (text !== null && text !== shown) onCommit(text); setText(null); };
  return (
    <TextInput value={text ?? shown} onChangeText={setText} inputMode={decimal ? 'decimal' : 'numeric'} accessibilityLabel={label}
      autoFocus={autoFocus} returnKeyType={onSubmit ? 'next' : 'done'}
      onFocus={(e) => { setFocused(true); selectAll(e); }} onBlur={() => { setFocused(false); commit(); }}
      onSubmitEditing={() => { commit(); onSubmit?.(); }} blurOnSubmit={!!onSubmit}
      style={[st.cell, st.input, { color: c.text, backgroundColor: c.field, borderColor: focused ? c.accent : c.fieldBorder, outlineWidth: 0 }]} />
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 3 },
  idx: { width: 22, textAlign: 'center' },
  cell: { flex: 1, minWidth: 0 }, // minWidth: web inputs otherwise refuse to shrink below ~20 characters
  input: { minHeight: 48, borderWidth: 1.5, borderRadius: radius.sm, textAlign: 'center', fontFamily: mono, fontSize: 20, fontWeight: '500' },
  del: { width: 36, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  small: { minHeight: 40, paddingHorizontal: space.md },
});
