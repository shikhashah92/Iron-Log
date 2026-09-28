// The workout itself: the set table shared by the live workout and "Edit workout", and the start / finish flow.
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  addSetTo, fmtDur, pace, delSetFrom, differsFromTemplate, duration, finishWorkout, fmtSet, getEx, INTENSITIES, isTimed, lastEntry, moveExercise, num, plural, putTemplate,
  putWorkout, removeExercise, setKind, setLabels, setTime, setValue, startWorkout, templateFrom, toggleDone, unfinished,
  type Log, type SetRow, type Workout,
} from './model';
import { useLog, useTheme } from './store';
import { startRest } from './timer';
import { choose, confirm, menu, notify } from './io';
import { ExArt, openExercise } from './components';
import { Button, Card, selectAll, T } from './ui';
import { sans, radius, space } from './theme';

/** Apply a change to one workout, always to its latest stored version. */
export function useEditWorkout(id: string) {
  const { update } = useLog();
  return (fn: (w: Workout) => Workout) => update((l) => {
    const cur = l.workouts.find((w) => w.id === id);
    const next = cur && fn(cur);
    return next && next !== cur ? putWorkout(l, next) : l;
  });
}

/** Start (from a template, or empty), or pick up the workout already in progress. */
export function useWorkoutFlow() {
  const { log, v, update } = useLog();

  /** `replace`: open the workout in place of the current screen (e.g. a template's preview), not on top of it. */
  async function start(templateId?: string, replace = false) {
    const go = () => (replace ? router.replace('/active') : router.push('/active'));
    const cur = v.active;
    if (cur) {
      const resume = await choose('A workout is in progress',
        `“${cur.name}” is still going (${duration(Date.now() - cur.startedAt)}). Pick it up, or finish it and start the new one?`,
        'Resume it', 'Finish it, start new');
      if (resume) return go();
      if (!(await finish(cur))) return;
    }
    update((l) => startWorkout(l, templateId));
    go();
  }

  /**
   * Finish: what to do with unticked sets, then (for a template workout that changed) whether to update the template.
   * Resolves to the finished workout's id, 'discarded' if nothing was logged and it was thrown away, or null if you
   * backed out (the workout is still going).
   */
  async function finish(w: Workout): Promise<string | 'discarded' | null> {
    const open = unfinished(w);
    let markDone = false;
    if (open) markDone = await choose(`${plural(open, 'set')} not ticked`, 'Log them as they’re shown, or leave them out?', 'Mark all done', 'Discard unfinished');
    const preview = finishWorkout(log, w.id, markDone).workout;
    if (!preview) {
      if (!(await confirm('Nothing was logged', 'No sets are ticked, so there’s nothing to save. Discard this workout?', 'Discard', true))) return null;
      update((l) => finishWorkout(l, w.id, false).log);
      return 'discarded';
    }
    const t = preview.templateId ? v.templates.find((x) => x.id === preview.templateId) : undefined;
    const updateTemplate = !!t && differsFromTemplate(preview)
      && await choose(`Update “${t.name}”?`, 'This workout had different exercises or set counts than the template. Save them to the template for next time?', 'Update template', 'Keep original');
    update((l: Log) => {
      const done = finishWorkout(l, w.id, markDone);
      return updateTemplate && t && done.workout ? putTemplate(done.log, { ...t, exercises: templateFrom(done.workout) }) : done.log;
    });
    return preview.id;
  }

  async function cancel(w: Workout) {
    if (!(await confirm('Cancel workout?', 'Everything in this workout will be thrown away.', 'Cancel workout', true))) return false;
    update((l) => ({ ...l, workouts: l.workouts.filter((x) => x.id !== w.id) }));
    return true;
  }

  return { start, finish, cancel };
}

const prevText = (s: SetRow | undefined, ex: ReturnType<typeof getEx>) => (s ? fmtSet(s, ex).replace('×', ' × ') : '—');

/** Every exercise of a workout as a Strong-style table: Set · Previous · kg · Reps · ✓. `live`: sets can be ticked. */
export function WorkoutEditor({ workout, live }: { workout: Workout; live: boolean }) {
  const { v, log } = useLog();
  const { c } = useTheme();
  const edit = useEditWorkout(workout.id);
  return (
    <>
      {workout.exercises.map((e, i) => {
        const ex = getEx(v, e.exerciseId);
        const prev = lastEntry(v, e.exerciseId, workout.id);
        async function actions() {
          const opts: [string, () => void | Promise<void>, boolean?][] = [
            ['Replace exercise', () => { router.push({ pathname: '/picker', params: { workout: workout.id, replace: String(i) } }); }],
            ...(i > 0 ? [['Move up', () => edit((w) => moveExercise(w, i, -1))] as [string, () => void]] : []),
            ...(i < workout.exercises.length - 1 ? [['Move down', () => edit((w) => moveExercise(w, i, 1))] as [string, () => void]] : []),
            ['Remove exercise', async () => {
              if (await confirm(`Remove ${ex.name}?`, e.sets.length ? `Its ${plural(e.sets.length, 'set')} in this workout go too.` : '', 'Remove', true)) edit((w) => removeExercise(w, i));
            }, true],
          ];
          const pick = await menu(ex.name, opts.map(([label, , destructive]) => ({ label, destructive })));
          if (pick !== null) await opts[pick][1]();
        }
        return (
          <Card key={`${e.exerciseId}-${i}`} style={{ marginBottom: space.md, paddingBottom: space.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <ExArt id={e.exerciseId} size={36} />
              <Pressable accessibilityRole="button" accessibilityLabel={`${ex.name}: form and history`} onPress={() => openExercise(e.exerciseId)} style={{ flex: 1 }}>
                <T numberOfLines={2} style={{ fontFamily: sans, fontWeight: '600', fontSize: 20 }} color={c.accent}>{ex.name}</T>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`${ex.name} options`} onPress={actions} hitSlop={6} style={st.more}>
                <Ionicons name="ellipsis-horizontal" size={20} color={c.text} />
              </Pressable>
            </View>
            <SetTable workout={workout} i={i} prev={prev?.sets ?? []} live={live} restSecs={log.settings.restSecs} />
            {ex.kind === 'cardio' && (() => { const d = e.sets.reduce((t, x) => t + x.w, 0), secs = e.sets.reduce((t, x) => t + x.r, 0); const p = pace(d, secs); return p ? <T v="small" style={{ marginTop: 4 }}>Pace {p}</T> : null; })()}
            <Button title="Add set" icon="add" kind="secondary" onPress={() => edit((w) => addSetTo(w, i, !live))} style={{ minHeight: 40, marginTop: space.sm }} />
          </Card>
        );
      })}
    </>
  );
}

function SetTable({ workout, i, prev, live, restSecs }: { workout: Workout; i: number; prev: SetRow[]; live: boolean; restSecs: number }) {
  const { v } = useLog();
  const { c } = useTheme();
  const edit = useEditWorkout(workout.id);
  const e = workout.exercises[i];
  const ex = getEx(v, e.exerciseId);
  const labels = setLabels(e.sets);
  const yoga = ex.kind === 'yoga';
  const unit = ex.kind === 'cardio' ? 'km' : ex.kind === 'activity' ? 'Effort' : ex.weightType === 'bodyweight' ? '+kg' : ex.weightType === 'dumbbell' ? 'kg/DB' : 'kg';
  // A plain number means seconds in a hold and minutes in other times: the header says which.
  const reps = ex.yoga === 'hold' ? 'Hold (sec)' : isTimed(ex) ? 'Time (min)' : ex.metric === 'secs' ? 'Secs' : 'Reps';
  // Time first for cardio and activities; yoga reads "3 rounds, 30 s hold".
  const cols = yoga ? ['Rounds', reps] : isTimed(ex) ? [reps, unit] : [unit, reps];
  const roundsCount = ex.yoga === 'rounds'; // Surya Namaskar: rounds alone can be ticked
  const minus = ex.weightType === 'bodyweight';
  let working = -1; // index into last time's sets, matching by position

  async function setMenu(j: number) {
    const pick = await menu(`Set ${labels[j]}`, [{ label: 'Normal set' }, { label: 'Warm-up' }, { label: 'Drop set' }, { label: 'Delete set', destructive: true }]);
    if (pick === 0) edit((w) => setKind(w, i, j));
    else if (pick === 1) edit((w) => setKind(w, i, j, 'W'));
    else if (pick === 2) edit((w) => setKind(w, i, j, 'D'));
    else if (pick === 3) edit((w) => delSetFrom(w, i, j));
  }
  function tick(j: number) {
    // Decide from the saved set, not this render's copy: a number typed a moment ago may have only just been saved.
    let outcome: 'ticked' | 'unticked' | 'empty' = 'empty';
    edit((w) => {
      const r = toggleDone(w, i, j, roundsCount);
      outcome = r.ticked ? 'ticked' : r.workout === w ? 'empty' : 'unticked';
      return r.workout;
    });
    if (outcome === 'empty') return notify(`Enter ${roundsCount ? 'the rounds' : yoga && ex.yoga === 'hold' ? 'how long you held it' : isTimed(ex) ? 'the time' : reps.toLowerCase()} first`);
    if (outcome === 'ticked' && !isTimed(ex)) startRest(restSecs); // ticked a lifting set (not a run or class): rest starts
  }

  return (
    <View style={{ marginTop: space.sm }}>
      <View style={st.row}>
        <T v="label" style={{ ...st.head, width: 30, minHeight: 0, textAlign: 'center' }}>Set</T>
        <T v="label" style={{ ...st.head, ...st.prevCol }}>Previous</T>
        {cols.map((h) => <T key={h} v="label" style={{ ...st.head, ...st.cell, textAlign: 'center' }}>{h}</T>)}
        {live && <View style={st.tick}><Ionicons name="checkmark" size={16} color={c.muted} /></View>}
      </View>
      {e.sets.map((s, j) => {
        if (s.kind !== 'W') working++;
        const done = s.done !== false;
        const hint = !done && !s.typed; // last time's numbers, shown grey until you type or tick
        const bg = live && done ? c.goodSoft : 'transparent';
        return (
          <View key={j} style={[st.row, { backgroundColor: bg, borderRadius: radius.sm }]}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Set ${labels[j]}: change type or delete`} onPress={() => setMenu(j)} style={st.setCol}>
              <T style={{ fontFamily: sans, fontWeight: '600', textAlign: 'center', color: s.kind === 'W' ? c.warnText : s.kind === 'D' ? c.accent : c.text }}>{labels[j]}</T>
            </Pressable>
            <T v="mono" numberOfLines={1} style={{ ...st.prevCol, fontSize: 12 }}>{prevText(s.kind === 'W' ? prev.find((p) => p.kind === 'W') : prev.filter((p) => p.kind !== 'W')[working], ex)}</T>
            {yoga ? (
              <>
                <SetInput value={s.w} hint={hint} label={`Set ${labels[j]} rounds`} onCommit={(t) => edit((w) => setValue(w, i, j, 'w', String(Math.round(Number(t.replace(',', '.')) || 0))))} />
                <SetInput value={s.r} hint={hint} fmt={fmtDur} unit={ex.yoga === 'hold' ? 'sec' : 'min'} label={`Set ${labels[j]} ${reps.toLowerCase()}`} onCommit={(t) => edit((w) => setTime(w, i, j, t, ex.yoga === 'hold'))} />
              </>
            ) : isTimed(ex) ? (
              <>
                <SetInput value={s.r} hint={hint} fmt={fmtDur} unit="min" label={`Set ${labels[j]} time`} onCommit={(t) => edit((w) => setTime(w, i, j, t))} />
                {ex.kind === 'cardio'
                  ? <SetInput value={s.w} hint={hint} decimal label={`Set ${labels[j]} distance in km`} onCommit={(t) => edit((w) => setValue(w, i, j, 'w', t))} />
                  : <Pressable accessibilityRole="button" accessibilityLabel={`Set ${labels[j]} intensity: ${INTENSITIES[s.w] || 'Moderate'}. Change`}
                      onPress={() => edit((w) => setValue(w, i, j, 'w', String((s.w % 3) + 1)))}
                      style={[st.cell, st.input, { alignItems: 'center', justifyContent: 'center', backgroundColor: c.field, borderColor: c.fieldBorder }]}>
                      <T numberOfLines={1} style={{ fontSize: 12, fontWeight: '600' }} color={hint ? c.hint : c.text}>{INTENSITIES[s.w] || 'Moderate'}</T>
                    </Pressable>}
              </>
            ) : (
              <>
                <SetInput value={s.w} hint={hint} decimal label={`Set ${labels[j]} weight`} onCommit={(t) => {
                  // Only a bodyweight exercise takes minus kg (assistance); anywhere else it's a typo, so say so rather than keep it.
                  if (!minus && parseFloat(t.replace(',', '.')) < 0) return notify('Weight can’t be below 0 kg. Minus kg is only for assisted bodyweight exercises, like an assisted pull-up.');
                  edit((w) => setValue(w, i, j, 'w', t, minus));
                }} />
                <SetInput value={s.r} hint={hint} label={`Set ${labels[j]} ${reps.toLowerCase()}`} onCommit={(t) => edit((w) => setValue(w, i, j, 'r', t))} />
              </>
            )}
            {live && (
              <Pressable accessibilityRole="checkbox" aria-checked={done} accessibilityLabel={`Set ${labels[j]} done`} onPress={() => tick(j)}
                style={[st.tick, { backgroundColor: done ? c.brand : c.chip, borderRadius: radius.sm }]}>
                <Ionicons name="checkmark" size={20} color={done ? c.onAccent : c.muted} />
              </Pressable>
            )}
          </View>
        );
      })}
    </View>
  );
}

/**
 * A number field that keeps what's being typed and saves on blur / enter. Planned sets show last time's number as a
 * grey hint (tick to accept it, or type to change it). The text is selected on focus, so typing replaces it.
 */
function SetInput({ value, hint, decimal, label, onCommit, fmt = num, unit }: {
  value: number; hint: boolean; decimal?: boolean; label: string; onCommit: (text: string) => void; fmt?: (n: number) => string; unit?: string;
}) {
  const { c } = useTheme();
  const shown = value ? fmt(value) : '';
  const [text, setText] = useState<string | null>(null); // null: not editing, show the stored value
  // The latest keystroke, read at save time: a blur right after typing (tapping the tick) can arrive before a re-render.
  const typed = useRef<string | null>(null);
  const [focused, setFocused] = useState(false);
  const commit = () => { const t = typed.current; typed.current = null; if (t !== null && t !== (hint ? '' : shown)) onCommit(t); setText(null); };
  return (
    <TextInput value={text ?? (hint ? '' : shown)} placeholder={hint ? shown || unit || '0' : unit ?? ''} placeholderTextColor={c.hint}
      onChangeText={(t) => { typed.current = t; setText(t); }} inputMode={decimal ? 'decimal' : fmt === num ? 'numeric' : 'text'} accessibilityLabel={label}
      onFocus={(e) => { setFocused(true); selectAll(e); }} onBlur={() => { setFocused(false); commit(); }} onSubmitEditing={commit}
      style={[st.cell, st.input, fmt === fmtDur && { fontSize: 15 }, { color: c.text, backgroundColor: c.field, borderColor: focused ? c.accent : c.fieldBorder, outlineWidth: 0 }]} />
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingVertical: 3, paddingHorizontal: 2 },
  head: { fontSize: 11, letterSpacing: 0.3 },
  setCol: { width: 30, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  prevCol: { flex: 1.3, minWidth: 0 },
  cell: { flex: 1, minWidth: 0 }, // minWidth: web inputs otherwise refuse to shrink below ~20 characters
  input: { minHeight: 44, borderWidth: 1.5, borderRadius: radius.sm, textAlign: 'center', fontFamily: sans, fontSize: 18, fontWeight: '500' },
  tick: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  more: { minWidth: 40, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
});
