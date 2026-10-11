import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { monthName as fullMonth, wrappedMonths, yearGrid } from '../../fun';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { addDays, weekStart, bestSet, exercisesFor, isTimed, daysAgo, delWorkout, duration, fmtDur, fmtSet, fmtVolume, getEx, groupSets, longDate, MUSCLE_NAMES, MUSCLES, muscleSets, type Muscle, matches, num, plural, recordsOf, templateFrom, today, totals, weekly, weekStreak, workoutStats, type Workout } from '../../model';
import { confirm, menu } from '../../io';
import { useWorkoutFlow } from '../../workout';
import { workoutCalories } from '../../calories';
import { useLog, useTheme } from '../../store';
import { BodyMap, mix } from '../../bodyMap';
import { Empty, openExercise, ProgressBlock, Records, Section, SetLines, ShareWorkout, useSaveAsTemplate } from '../../components';
import { Button, Card, Field, Gap, Header, IconButton, Row, Screen, Segmented, T } from '../../ui';
import { sans, radius, space } from '../../theme';

export default function History() {
  const [tab, setTab] = useState<'sessions' | 'trends' | 'progress'>('sessions');
  return (
    <Screen>
      <Header title="History" />
      <Segmented value={tab} onChange={setTab} options={[{ id: 'sessions', label: 'Workouts' }, { id: 'trends', label: 'Trends' }, { id: 'progress', label: 'Progress' }]} />
      <Gap h={space.md} />
      {tab === 'sessions' ? <Sessions /> : tab === 'trends' ? <Trends /> : <Progress />}
    </Screen>
  );
}

function Sessions() {
  const { v } = useLog();
  const [open, setOpen] = useState<string | null>(null);
  const [shown, setShown] = useState(30);
  const [day, setDay] = useState<string | null>(null);
  const done = v.workouts.filter((w) => !w.active);
  if (!done.length) return (
    <Card style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.xl }}>
      <T style={{ fontFamily: sans, fontWeight: '700', fontSize: 18 }}>Your history starts here</T>
      <T v="small" center>Every workout you finish lands in this list.</T>
      <Button title="Start a workout" onPress={() => router.navigate('/workout')} style={{ alignSelf: 'stretch', marginTop: space.xs }} />
    </Card>
  );
  const list = day ? done.filter((w) => w.date === day) : done.slice(0, shown);
  // Newest first, under a heading per month with its totals.
  const months = [...new Set(list.map((w) => w.date.slice(0, 7)))];
  return (
    <>
      <Calendar trained={new Set(done.map((w) => w.date))} day={day} onDay={(d) => setDay(d === day ? null : d)} />
      {day && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm }}>
          <T v="label">{longDate(day)} · {plural(list.length, 'workout')}</T>
          <Button title="Show all" kind="ghost" onPress={() => setDay(null)} style={{ minHeight: 40, paddingHorizontal: space.sm }} />
        </View>
      )}
      {months.map((m) => {
        const t = totals(v, `${m}-01`, `${m}-31`);
        return (
          <View key={m}>
            {!day && <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: space.sm, marginBottom: space.sm, marginHorizontal: 2 }}>
              <T style={{ flex: 1, fontFamily: sans, fontWeight: '700', fontSize: 16 }}>{monthName(m)}</T>
              <T v="small">{[plural(t.workouts, 'workout'), t.volume ? fmtVolume(t.volume, v.unit) : ''].filter(Boolean).join(' · ')}</T>
            </View>}
            {list.filter((w) => w.date.startsWith(m)).map((w) => <WorkoutCard key={w.id} w={w} open={open === w.id} onToggle={() => setOpen(open === w.id ? null : w.id)} />)}
          </View>
        );
      })}
      {!day && shown < done.length && <Button title={`Show more (${done.length - shown})`} kind="ghost" onPress={() => setShown(shown + 30)} />}
    </>
  );
}

const monthName = (m: string) => new Date(`${m}-01T12:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
const shiftMonth = (m: string, by: number) => { const d = new Date(`${m}-01T12:00:00`); d.setMonth(d.getMonth() + by); return d.toISOString().slice(0, 7); };

/** A month at a glance (Monday first): training days filled mint, today ringed. Tap a training day to see just that day. */
function Calendar({ trained, day, onDay }: { trained: Set<string>; day: string | null; onDay: (d: string) => void }) {
  const { c } = useTheme();
  const now = today();
  const [month, setMonth] = useState(now.slice(0, 7));
  const [full, setFull] = useState(false); // this week's strip until you open the month
  const dot = (d: string) => {
    const on = trained.has(d), picked = d === day;
    return (
      <Pressable disabled={!on} onPress={() => onDay(d)} accessibilityRole="button" accessibilityLabel={`${longDate(d)}${on ? ', trained' : ''}`}
        aria-pressed={picked} aria-disabled={!on}
        style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.brand : 'transparent',
          borderWidth: 2, borderColor: picked ? c.text : d === now ? c.accent : 'transparent', opacity: d > now ? 0.35 : 1 }}>
        <T style={{ fontSize: 14, fontWeight: on ? '700' : '400' }} color={on ? c.onAccent : c.text}>{Number(d.slice(8))}</T>
      </Pressable>
    );
  };
  const toggle = (label: string) => (
    <Pressable accessibilityRole="button" accessibilityLabel={full ? 'Show this week' : 'Show the month'} onPress={() => { setFull(!full); setMonth(now.slice(0, 7)); }} hitSlop={8}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 32 }}>
      <T v="small" style={{ fontWeight: '600' }} color={c.accent}>{label}</T>
      <Ionicons name={full ? 'chevron-up' : 'chevron-down'} size={14} color={c.accent} />
    </Pressable>
  );
  if (!full) {
    const mon = weekStart(now), week = Array.from({ length: 7 }, (_, i) => addDays(mon, i));
    const n = week.filter((d) => trained.has(d)).length;
    return (
      <Card style={{ marginBottom: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.xs }}>
          <T style={{ flex: 1, fontWeight: '600' }}>This week · {plural(n, 'workout day')}</T>
          {toggle('Month')}
        </View>
        <View style={{ flexDirection: 'row' }}>
          {week.map((d, i) => (
            <View key={d} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
              <T v="small" style={{ fontSize: 11 }}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</T>
              {dot(d)}
            </View>
          ))}
        </View>
      </Card>
    );
  }
  const first = `${month}-01`;
  const lead = (new Date(`${first}T12:00:00`).getDay() + 6) % 7;
  const count = new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => addDays(first, i))];
  while (cells.length % 7) cells.push(null);
  const days = [...trained].filter((d) => d.startsWith(month)).length;
  return (
    <Card style={{ marginBottom: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.sm }}>
        <IconButton icon="chevron-back" label="Previous month" onPress={() => setMonth(shiftMonth(month, -1))} size={20} />
        <T center style={{ flex: 1, fontFamily: sans, fontWeight: '700', fontSize: 17 }}>{monthName(month)}</T>
        {month < now.slice(0, 7) ? <IconButton icon="chevron-forward" label="Next month" onPress={() => setMonth(shiftMonth(month, 1))} size={20} /> : <View style={{ width: 44 }} />}
      </View>
      <View style={{ flexDirection: 'row' }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <T key={i} v="small" center style={{ flex: 1, fontSize: 11 }}>{d}</T>)}
      </View>
      {Array.from({ length: cells.length / 7 }, (_, r) => (
        <View key={r} style={{ flexDirection: 'row' }}>
          {cells.slice(r * 7, r * 7 + 7).map((d, i) => {
            return (
              <View key={i} style={{ flex: 1, alignItems: 'center', paddingVertical: 3 }}>
                {d && dot(d)}
              </View>
            );
          })}
        </View>
      ))}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm }}>
        <T v="small">{days ? `Trained on ${plural(days, 'day')} in ${monthName(month).split(' ')[0]}` : 'No workouts this month'}</T>
        {toggle('Week')}
      </View>
    </Card>
  );
}

const mins = (m: number) => (m ? fmtDur(m * 60) : '0m');

/** Sets per muscle, twelve weeks of bars, this month against the same point last month (and the weekly streak), the year, and the monthly wraps. */
function Trends() {
  const { v } = useLog();
  const { c } = useTheme();
  const [metric, setMetric] = useState<'workouts' | 'minutes' | 'volume'>('workouts');
  const now = today();
  if (!v.workouts.some((w) => !w.active)) return <Card><Empty>Log a few workouts and your trends show up here.</Empty></Card>;
  const first = `${now.slice(0, 7)}-01`;
  const prevFirst = `${shiftMonth(now.slice(0, 7), -1)}-01`;
  const prevTo = addDays(prevFirst, Math.min(daysAgo(first, now), daysAgo(prevFirst, first) - 1));
  const month = totals(v, first, now), before = totals(v, prevFirst, prevTo);
  const streak = weekStreak(v, now);
  const weeks = weekly(v, now, 12);
  const val = (w: (typeof weeks)[number]) => w[metric];
  const max = Math.max(1, ...weeks.map(val));
  const top = weeks.findLastIndex((w) => val(w) === max); // label the highest bar once, and this week
  const avg = weeks.slice(0, -1).reduce((t, w) => t + val(w), 0) / 11;
  const kg = (n: number) => fmtVolume(n, v.unit, '');
  const fmt = (n: number) => (metric === 'workouts' ? num(Math.round(n * 10) / 10) : metric === 'minutes' ? mins(Math.round(n)) : kg(n));
  const short = (n: number) => (metric === 'minutes' && n >= 60 ? `${num(Math.round(n / 6) / 10)}h` : fmt(n)); // fits over a bar
  // The change on last month: "▲ 2 on last month", "Same as last month".
  const vs = (a: number, b: number, f: (n: number) => string) => (!a && !b ? '' : Math.round(a - b) === 0 ? 'Same as last month' : `${a > b ? '▲' : '▼'} ${f(Math.abs(a - b))} on last month`);
  return (
    <>
      <MuscleMap />

      <Section title="Last 12 weeks">
        <Segmented value={metric} onChange={setMetric} options={[{ id: 'workouts', label: 'Workouts' }, { id: 'minutes', label: 'Time' }, { id: 'volume', label: 'Volume' }]} />
        <View accessibilityRole="image" accessibilityLabel={`Per week: ${weeks.map((w) => fmt(val(w))).join(', ')}`}
          style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 140, marginTop: space.md }}>
          {weeks.map((w, i) => (
            <View key={w.start} style={{ flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' }}>
              {i === weeks.length - 1 || i === top ? <T v="small" numberOfLines={1} style={{ fontSize: 10 }}>{short(val(w))}</T> : null}
              <View style={{ width: '100%', height: `${Math.max(val(w) ? 4 : 1, (val(w) / max) * 82)}%`, borderRadius: 4,
                backgroundColor: val(w) ? c.brand : c.border, opacity: i === weeks.length - 1 ? 1 : 0.7 }} />
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          <T v="small" style={{ fontSize: 11 }}>{longDate(weeks[0].start).replace(/^\w+,? /, '')}</T>
          <T v="small" style={{ fontSize: 11 }}>This week</T>
        </View>
        <T v="small" style={{ marginTop: space.sm }}>Average {fmt(avg)} a week over the 11 weeks before this one.</T>
      </Section>

      <Section title={`This month · ${monthName(now.slice(0, 7)).split(' ')[0]}`}>
        <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.xs }}>
          {[['Workouts', num(month.workouts), vs(month.workouts, before.workouts, num)], ['Time', month.workouts && !month.minutes ? '<1m' : mins(month.minutes), vs(month.minutes, before.minutes, mins)],
            ['Volume', kg(month.volume), vs(month.volume, before.volume, kg)]].map(([k, value, delta]) => (
            <View key={k} style={{ flex: 1, backgroundColor: c.chip, borderRadius: 10, padding: space.sm + 2 }}>
              <T v="label" style={{ fontSize: 11 }}>{k}</T>
              <T style={{ fontFamily: sans, fontSize: 20, marginTop: 2 }}>{value}</T>
              {delta ? <T v="small" style={{ fontSize: 11 }}>{delta}</T> : null}
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md }}>
          <Ionicons name="flame-outline" size={22} color={c.accent} />
          <T style={{ flex: 1 }}><T style={{ fontWeight: '700' }}>{streak.current ? `${plural(streak.current, 'week')} in a row` : 'No streak yet'}</T>
            <T v="small">{streak.current ? ' with a workout' : ': train this week to start one'}{streak.best > streak.current ? ` · best ${plural(streak.best, 'week')}` : ''}</T></T>
        </View>
        <T v="small" style={{ marginTop: space.sm, fontSize: 12 }}>Last month is counted up to the same day, so it’s a fair comparison.</T>
      </Section>

      <YearMap />

      <Section title="Monthly wraps" pad={false}>
        <View style={{ paddingHorizontal: space.lg, paddingBottom: space.sm }}>
          {wrappedMonths(v).slice(0, 12).map((m, i, all) => (
            <Row key={m} title={`${fullMonth(m)} ${m.slice(0, 4)}`} subtitle={m === now.slice(0, 7) ? 'So far this month' : 'Tap for the story, and to share it'} last={i === all.length - 1}
              right={<Ionicons name="chevron-forward" size={18} color={c.muted} />} onPress={() => router.push({ pathname: '/wrapped', params: { month: m } })} />
          ))}
        </View>
      </Section>
    </>
  );
}

const PERIODS = [{ id: '7', label: '7 days' }, { id: '30', label: '30 days' }, { id: '90', label: '3 months' }, { id: '365', label: '1 year' }] as const;
type Period = (typeof PERIODS)[number]['id'];

/**
 * Sets per muscle over a chosen period, on a front and back body: the more sets, the deeper the mint (against your
 * most-trained muscle). Tap a muscle or a group for its count; with nothing chosen it points at your lightest group.
 */
function MuscleMap() {
  const { v } = useLog();
  const { c } = useTheme();
  const [period, setPeriod] = useState<Period>('30');
  const [sel, setSel] = useState<string>(); // a muscle, or a group
  const now = today(), days = Number(period), from = addDays(now, 1 - days);
  const sets = muscleSets(v, from, now), groups = groupSets(v, from, now);
  const max = Math.max(1, ...Object.values(sets));
  const shade = (n: number) => (n ? mix(c.chip, c.brand, Math.ceil((n / max) * 4) / 4) : c.chip);
  const picked = (k: Muscle) => sel === k || MUSCLES[k] === sel;
  const tap = (k: string) => setSel(sel === k ? undefined : k);
  const inPeriod = days === 7 ? 'in the last 7 days' : `in ${PERIODS.find((p) => p.id === period)!.label}`;
  const weekly = (n: number) => (days > 7 && n ? `, about ${num(Math.round((n / days) * 7 * 10) / 10)} a week` : '');
  const lightest = [...groups].sort((a, b) => a.sets - b.sets)[0];
  const starter = v.templates.find((t) => t.id === `starter-${lightest.group.toLowerCase()}`);
  const info = sel && Object.hasOwn(MUSCLES, sel)
    ? `${MUSCLE_NAMES[sel as Muscle]}: ${plural(Math.round(sets[sel as Muscle]), 'set')} ${inPeriod}${weekly(sets[sel as Muscle])}. Helper muscles count half a set.`
    : sel ? `${plural(groups.find((g) => g.group === sel)!.sets, 'working set')} of ${sel.toLowerCase()} exercises ${inPeriod}${weekly(groups.find((g) => g.group === sel)!.sets)}.`
    : !groups.some((g) => g.sets) ? `No strength sets ${inPeriod}.`
    : `${lightest.group} is your lightest: ${plural(lightest.sets, 'set')} ${inPeriod}.`;
  return (
    <Section title="Muscles worked">
      <Segmented value={period} onChange={setPeriod} options={[...PERIODS]} />
      <T v="small" style={{ marginTop: space.sm, fontSize: 12 }}>Working sets per muscle. Pale is what you’ve been skipping.</T>
      <View style={{ marginTop: space.sm }} accessibilityLabel={`Sets ${inPeriod}: ${groups.map((g) => `${g.group} ${g.sets}`).join(', ')}`}>
        <BodyMap fill={(k) => shade(sets[k])} selected={picked} onPress={tap} />
      </View>
      <View style={{ backgroundColor: c.bg, borderRadius: radius.md, padding: space.sm + 2, marginTop: space.sm, gap: 2 }}>
        <T v="small" style={{ color: c.text }}>{info}</T>
        {!sel && starter && groups.some((g) => g.sets) && <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: '/template', params: { id: starter.id } })}>
          <T v="small" color={c.accent} style={{ textDecorationLine: 'underline' }}>Open the {starter.name} workout</T>
        </Pressable>}
        {sel && <>
          <T v="small" style={{ marginTop: space.xs }}>Exercises for it:</T>
          {exercisesFor(v, sel).map((ex) => (
            <Pressable key={ex.id} accessibilityRole="link" onPress={() => openExercise(ex.id)}>
              <T v="small" color={c.accent} style={{ textDecorationLine: 'underline' }}>{ex.name}</T>
            </Pressable>
          ))}
        </>}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: space.sm }}>
        <T v="small" style={{ fontSize: 11 }}>Less</T>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => <View key={t} style={{ width: 16, height: 10, borderRadius: 3, backgroundColor: mix(c.chip, c.brand, t) }} />)}
        <T v="small" style={{ fontSize: 11 }}>More</T>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: space.sm }}>
        {groups.map((g) => (
          <Pressable key={g.group} accessibilityRole="button" aria-pressed={sel === g.group} accessibilityLabel={`${g.group}, ${g.sets} sets`} onPress={() => tap(g.group)}
            style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: sel === g.group ? c.brand : c.chip }}>
            <T style={{ fontSize: 13, color: sel === g.group ? c.onAccent : c.text }}>{g.group}</T>
          </Pressable>
        ))}
      </View>
    </Section>
  );
}

/** The last year, a square a day: mint where you trained (darker for two workouts in a day). Scrolls back in time. */
function YearMap() {
  const { v } = useLog();
  const { c } = useTheme();
  const now = today();
  const grid = yearGrid(v, now, 52);
  const days = grid.flat().filter((d) => d.n > 0).length;
  const cell = 12, gap = 3;
  return (
    <Section title={`The last year · ${plural(days, 'day')} trained`}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} ref={(r) => { r?.scrollToEnd({ animated: false }); }} style={{ marginTop: space.xs }}>
        <View style={{ flexDirection: 'row', gap }} accessibilityRole="image" accessibilityLabel={`Trained on ${plural(days, 'day')} in the last year`}>
          {grid.map((week, i) => (
            <View key={i} style={{ gap }}>
              <T style={{ fontSize: 9, height: 12, width: cell }} color={c.muted}>{week[0].day.slice(8) <= '07' ? fullMonth(week[0].day.slice(0, 7)).slice(0, 1) : ''}</T>
              {week.map((d) => (
                <View key={d.day} style={{ width: cell, height: cell, borderRadius: 3, backgroundColor: d.n < 0 ? 'transparent' : d.n === 0 ? c.chip : c.brand, opacity: d.n === 1 ? 0.6 : 1 }} />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </Section>
  );
}

/** One finished workout: name, when, how long, how much; open it for every set, and to edit or reuse it. */
function WorkoutCard({ w, open, onToggle }: { w: Workout; open: boolean; onToggle: () => void }) {
  const { v, log, replace, update } = useLog();
  const { c } = useTheme();
  const saveAsTemplate = useSaveAsTemplate();
  const flow = useWorkoutFlow();
  const { sets, volume } = workoutStats(v, w);
  const ago = daysAgo(w.date);
  const clock = (ms: number) => new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const cal = workoutCalories(v, w);
  const recs = recordsOf(v, w);
  const prIds = new Set(recs.map((r) => r.exerciseId));
  // One date, said once: "Today, 2:27 PM", "Yesterday, …", "Fri 9 Oct, …"; opened, the whole span.
  const when = open
    ? `${new Date(`${w.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', ...(w.date.slice(0, 4) !== today().slice(0, 4) ? { year: 'numeric' } : {}) })}, ${clock(w.startedAt)}${w.endedAt ? `–${clock(w.endedAt)}` : ''}`
    : `${ago === 0 ? 'Today' : ago === 1 ? 'Yesterday' : longDate(w.date)}, ${clock(w.startedAt)}`;
  const stats: [keyof typeof Ionicons.glyphMap, string][] = [
    ...(w.endedAt ? [['time-outline', duration(w.endedAt - w.startedAt)] as [keyof typeof Ionicons.glyphMap, string]] : []),
    ['layers-outline', plural(sets, 'set')],
    ...(volume ? [['barbell-outline', fmtVolume(volume, v.unit)] as [keyof typeof Ionicons.glyphMap, string]] : []),
    ...(open && cal ? [['flame-outline', `≈${cal} kcal`] as [keyof typeof Ionicons.glyphMap, string]] : []),
  ];
  async function editIt() {
    try { await replace({ log }, 'Before editing a workout'); } catch { /* the undo copy is best effort here */ }
    router.push({ pathname: '/edit-workout', params: { id: w.id } });
  }
  async function remove() {
    if (await confirm(`Delete “${w.name}”?`, `${longDate(w.date)}, ${plural(sets, 'set')}. You can get it back from Undo history.`, 'Delete', true)) {
      try { await replace({ log: delWorkout(log, w.id) }, 'Before deleting a workout'); } catch { update((l) => delWorkout(l, w.id)); }
    }
  }
  async function more() {
    const pick = await menu(w.name, [{ label: 'Edit workout' }, { label: 'Save as template' }, { label: 'Delete', destructive: true }]);
    if (pick === 0) editIt(); else if (pick === 1) saveAsTemplate(templateFrom(w), w.name); else if (pick === 2) remove();
  }
  const shown = open ? [] : w.exercises.slice(0, 3);
  return (
    <Card style={{ marginBottom: space.sm }}>
      <Pressable accessibilityRole="button" aria-expanded={open} onPress={onToggle} style={{ gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <T numberOfLines={1} style={{ fontFamily: sans, fontWeight: '700', fontSize: 19, flex: 1 }}>{w.name}</T>
          {recs.length ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.accentSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Ionicons name="trophy" size={12} color={c.accent} />
              <T style={{ fontSize: 12, fontWeight: '700' }} color={c.accent}>{plural(recs.length, 'PB')}</T>
            </View>
          ) : null}
          {open ? <IconButton icon="ellipsis-horizontal" label={`${w.name}: edit, save as template or delete`} onPress={more} size={20} />
            : <Ionicons name="chevron-down" size={18} color={c.muted} />}
        </View>
        <T v="small">{when}</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space.md, rowGap: 4, marginTop: 4, marginBottom: 2 }}>
          {stats.map(([icon, label]) => (
            <View key={icon} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name={icon} size={14} color={c.accent} />
              <T v="small" style={{ color: c.text }}>{label}</T>
            </View>
          ))}
          {w.feeling ? <T v="small" style={{ backgroundColor: c.chip, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1, overflow: 'hidden' }}>{w.feeling}</T> : null}
        </View>
        {w.note ? <T v="small" numberOfLines={open ? undefined : 2} style={{ fontStyle: 'italic', color: c.text }}>“{w.note}”</T> : null}
        {shown.map((e) => {
          const ex = getEx(v, e.exerciseId);
          const work = e.sets.filter((x) => x.kind !== 'W');
          const best = isTimed(ex) ? e.sets[0] : bestSet(work.length ? work : e.sets);
          return (
            <View key={e.exerciseId} style={{ flexDirection: 'row', gap: space.sm, marginTop: 2 }}>
              <T numberOfLines={1} style={{ flex: 1, fontSize: 14 }}>{ex.name}</T>
              {prIds.has(e.exerciseId) ? <Ionicons name="trophy" size={13} color={c.accent} accessibilityLabel="Personal best" /> : null}
              <T v="small">{isTimed(ex) ? (best ? fmtSet(best, ex, v.unit) : '') : `${plural(e.sets.length, 'set')}${best ? ` · best ${fmtSet(best, ex, v.unit)}` : ''}`}</T>
            </View>
          );
        })}
        {!open && w.exercises.length > 3 && <T v="small" style={{ marginTop: 2 }}>+{w.exercises.length - 3} more</T>}
      </Pressable>
      {open && (
        <>
          <Gap h={space.sm} />
          <SetLines entries={v.entries.filter((e) => e.workoutId === w.id)} name />
          {w.exercises.filter((e) => e.note).map((e) => (
            <T key={e.exerciseId} v="small" style={{ marginTop: 4 }}><T v="small" style={{ fontWeight: '700', color: c.text }}>{getEx(v, e.exerciseId).name}:</T> {e.note}</T>
          ))}
          {recs.length ? <><Gap h={space.sm} /><Records v={v} w={w} /></> : null}
          <Gap h={space.sm} />
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <View style={{ flex: 1 }}><ShareWorkout w={w} title="Share" /></View>
            <Button title="Do again" icon="repeat" kind="secondary" style={{ minHeight: 40, flex: 1 }} onPress={() => flow.start(undefined, false, w)} />
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
      <Pressable accessibilityRole="button" aria-expanded={open} accessibilityLabel={`Exercise: ${ex.name}. Change`}
        onPress={() => { setOpen(!open); setQ(''); }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 52, paddingHorizontal: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: open ? c.accent : c.fieldBorder, backgroundColor: c.field, marginBottom: space.sm }}>
        <View style={{ flex: 1 }}>
          <T v="small" style={{ fontSize: 12 }}>Exercise · {logged.length} logged</T>
          <T numberOfLines={1} style={{ fontFamily: sans, fontWeight: '600', fontSize: 20 }}>{ex.name}</T>
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
