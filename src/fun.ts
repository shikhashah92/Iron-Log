// The come-back loop: a weekly goal, milestones worth celebrating, and (further down) reminders, recaps, suggestions
// and challenges. Everything is worked out from the log on the phone; nothing here is stored except your choices.
import { addDays, daysAgo, getEx, isTimed, lastEntry, num, recordsOf, secsOf, totals as totalsOf, volumeOf, weekStart, type View, type Workout } from './model.ts';

// ---- weekly goal ----
/** This week so far (Monday to Sunday) against the goal. */
export function weekProgress(v: View, date: string, goal: number) {
  const from = weekStart(date);
  const done = v.workouts.filter((w) => !w.active && w.date >= from && w.date <= date).length;
  return { done, goal, left: Math.max(0, goal - done), daysLeft: 6 - daysAgo(from, date), met: done >= goal };
}
/** Weeks in a row the goal was met. This week counts once it's met; until then it doesn't break the run. */
export function goalStreak(v: View, date: string, goal: number): number {
  const per = new Map<string, number>();
  for (const w of v.workouts) if (!w.active && w.date <= date) per.set(weekStart(w.date), (per.get(weekStart(w.date)) ?? 0) + 1);
  const met = (wk: string) => (per.get(wk) ?? 0) >= goal;
  let wk = weekStart(date), n = 0;
  if (!met(wk)) wk = addDays(wk, -7);
  while (met(wk)) { n++; wk = addDays(wk, -7); }
  return n;
}

// ---- milestones ----
export type Track = 'workouts' | 'tonnes' | 'km' | 'yoga' | 'surya' | 'bests' | 'goals';
export interface Milestone { id: string; track: Track; at: number; title: string; detail: string; icon: string }
export interface Earned extends Milestone { date: string; workoutId: string }
/** The next one to reach on each track, and how far along you are. */
export interface Upcoming extends Milestone { progress: number }

const m = (track: Track, icon: string, list: [number, string, string][]): Milestone[] =>
  list.map(([at, title, detail]) => ({ id: `${track}-${at}`, track, at, title, detail, icon }));
/** Every milestone, in order along each track. Comparisons are rounded on purpose: they're for a smile, not a quiz. */
export const MILESTONES: readonly Milestone[] = [
  ...m('workouts', 'barbell-outline', [
    [1, 'First workout', 'The hardest one to start. Done.'], [5, '5 workouts', 'It’s becoming a habit.'], [10, '10 workouts', 'Double figures.'],
    [25, '25 workouts', 'A quarter of a hundred.'], [50, '50 workouts', 'Half a century.'], [100, '100 workouts', 'Triple figures. Serious.'],
    [200, '200 workouts', 'This is just who you are now.'], [365, '365 workouts', 'A year’s worth of sessions.'], [500, '500 workouts', 'Legendary consistency.'],
  ]),
  ...m('tonnes', 'cube-outline', [
    [1, '1 tonne lifted', 'About a small car.'], [5, '5 tonnes lifted', 'About an elephant.'], [12, '12 tonnes lifted', 'About a double-decker bus.'],
    [50, '50 tonnes lifted', 'About eight elephants.'], [150, '150 tonnes lifted', 'About a blue whale.'], [400, '400 tonnes lifted', 'About a jumbo jet at take-off.'],
    [1000, '1,000 tonnes lifted', 'A kilotonne. Unreal.'],
  ]),
  ...m('km', 'walk-outline', [
    [5, 'First 5 km', 'A parkrun’s worth.'], [21.1, 'A half marathon', '21.1 km, all told.'], [42.2, 'A marathon', '42.2 km, all told.'],
    [150, '150 km', 'About Mumbai to Pune.'], [500, '500 km', 'About Delhi to Jaipur and back.'], [1000, '1,000 km', 'About Mumbai to Goa and back.'],
  ]),
  ...m('yoga', 'flower-outline', [
    [60, 'An hour on the mat', 'Your first hour of yoga.'], [600, '10 hours of yoga', 'Breath by breath.'], [3000, '50 hours of yoga', 'A deep practice.'],
  ]),
  ...m('surya', 'sunny-outline', [
    [108, '108 Surya Namaskars', 'A full mala of sun salutations.'], [1008, '1,008 Surya Namaskars', 'The sun salutes you back.'],
  ]),
  ...m('bests', 'trophy-outline', [
    [1, 'First personal best', 'Stronger than you’ve ever been.'], [10, '10 personal bests', 'You keep raising the bar.'],
    [50, '50 personal bests', 'Progress on repeat.'], [100, '100 personal bests', 'Personal best at personal bests.'],
  ]),
  ...m('goals', 'ribbon-outline', [
    [1, 'Weekly goal met', 'You did what you set out to do.'], [4, 'Goal met 4 weeks running', 'A month of keeping your word.'],
    [12, 'Goal met 12 weeks running', 'Three months strong.'], [26, 'Goal met 26 weeks running', 'Half a year.'], [52, 'Goal met 52 weeks running', 'A whole year. Take a bow.'],
  ]),
];

const cache = new WeakMap<View, Map<number, { earned: Earned[]; totals: Record<Track, number> }>>();
/** Walk every workout, oldest first, and note which one crossed each milestone. `goal`: the weekly goal (0: none). */
export function milestonesOf(v: View, goal = 0): { earned: Earned[]; upcoming: Upcoming[] } {
  let byGoal = cache.get(v);
  if (!byGoal) { byGoal = new Map(); cache.set(v, byGoal); }
  let r = byGoal.get(goal);
  if (!r) {
    const t: Record<Track, number> = { workouts: 0, tonnes: 0, km: 0, yoga: 0, surya: 0, bests: 0, goals: 0 };
    const earned: Earned[] = [];
    const week = new Map<string, number>();
    let lastMet = '', streak = 0;
    for (const w of [...v.workouts].reverse()) {
      if (w.active) continue;
      t.workouts++;
      for (const e of w.exercises) {
        const ex = getEx(v, e.exerciseId);
        const sets = e.sets.filter((s) => s.done !== false);
        if (ex.kind === 'cardio') t.km += sets.reduce((a, s) => a + s.w, 0);
        else if (ex.kind === 'yoga') { t.yoga += sets.reduce((a, s) => a + secsOf(ex, s), 0) / 60; if (ex.id === 'surya-namaskar') t.surya += sets.reduce((a, s) => a + s.w, 0); }
        else if (!isTimed(ex)) t.tonnes += volumeOf({ sets: sets.filter((s) => s.kind !== 'W') }, ex, v.bodyweight) / 1000;
      }
      t.bests += recordsOf(v, w).length;
      if (goal) {
        const wk = weekStart(w.date), n = (week.get(wk) ?? 0) + 1;
        week.set(wk, n);
        if (n === goal) { streak = lastMet === addDays(wk, -7) ? streak + 1 : 1; lastMet = wk; t.goals = Math.max(t.goals, streak); }
      }
      for (const ms of MILESTONES) if (t[ms.track] >= ms.at && !earned.some((x) => x.id === ms.id)) earned.push({ ...ms, date: w.date, workoutId: w.id });
    }
    r = { earned, totals: t };
    byGoal.set(goal, r);
  }
  const { earned, totals: t } = r;
  const upcoming = (Object.keys(t) as Track[]).filter((k) => k !== 'goals' || goal)
    .map((k) => MILESTONES.find((ms) => ms.track === k && !earned.some((x) => x.id === ms.id)))
    .filter((ms): ms is Milestone => !!ms).map((ms) => ({ ...ms, progress: t[ms.track] }));
  return { earned, upcoming };
}
/** The milestones this workout reached. */
export const newMilestones = (v: View, w: Workout, goal = 0) => milestonesOf(v, goal).earned.filter((e) => e.workoutId === w.id);
/** "42 of 50 workouts", "3.2 of 5 t" for an upcoming milestone. */
export function progressLabel(u: Upcoming): string {
  const unit = { workouts: 'workouts', tonnes: 't', km: 'km', yoga: 'min', surya: 'rounds', bests: 'bests', goals: 'weeks' }[u.track];
  const n = u.track === 'tonnes' || u.track === 'km' ? num(Math.floor(u.progress * 10) / 10) : String(Math.floor(u.progress));
  return `${n} of ${num(u.at)} ${unit}`;
}

// ---- the year at a glance ----
/** Workouts per day for the last `weeks` weeks (Monday first), oldest week first: the heatmap. */
export function yearGrid(v: View, date: string, weeks = 52): { day: string; n: number }[][] {
  const per = new Map<string, number>();
  for (const w of v.workouts) if (!w.active) per.set(w.date, (per.get(w.date) ?? 0) + 1);
  const first = addDays(weekStart(date), -7 * (weeks - 1));
  return Array.from({ length: weeks }, (_, i) => Array.from({ length: 7 }, (_, d) => {
    const day = addDays(first, i * 7 + d);
    return { day, n: day > date ? -1 : per.get(day) ?? 0 }; // -1: still to come
  }));
}

// ---- Monthly Wrapped ----
const monthEnd = (m: string) => addDays(`${nextMonth(m)}-01`, -1);
export const nextMonth = (m: string) => { const [y, mo] = m.split('-').map(Number); return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`; };
export const prevMonth = (m: string) => { const [y, mo] = m.split('-').map(Number); return mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, '0')}`; };
export const monthName = (m: string) => new Date(`${m}-01T12:00:00`).toLocaleDateString(undefined, { month: 'long' });
/** A month in one story: totals, the exercise you did most, your heaviest lift, the best week, bests and milestones. */
export function wrapped(v: View, month: string) {
  const from = `${month}-01`, to = monthEnd(month);
  const ws = v.workouts.filter((w) => !w.active && w.date >= from && w.date <= to);
  if (!ws.length) return null;
  const sets = new Map<string, number>(), heavy = new Map<string, number>();
  let km = 0, yoga = 0, bests = 0;
  for (const w of ws) {
    bests += recordsOf(v, w).length;
    for (const e of w.exercises) {
      const ex = getEx(v, e.exerciseId);
      const done = e.sets.filter((s) => s.done !== false && s.kind !== 'W');
      sets.set(ex.id, (sets.get(ex.id) ?? 0) + done.length);
      if (ex.kind === 'cardio') km += done.reduce((a, s) => a + s.w, 0);
      else if (ex.kind === 'yoga') yoga += done.reduce((a, s) => a + secsOf(ex, s), 0) / 60;
      else if (!isTimed(ex) && ex.weightType !== 'bodyweight') heavy.set(ex.id, Math.max(heavy.get(ex.id) ?? 0, ...done.map((s) => s.w)));
    }
  }
  const top = [...sets].sort((a, b) => b[1] - a[1])[0];
  const heaviest = [...heavy].sort((a, b) => b[1] - a[1])[0];
  const weeks = new Map<string, number>();
  for (const w of ws) weeks.set(weekStart(w.date), (weeks.get(weekStart(w.date)) ?? 0) + 1);
  const best = [...weeks].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0];
  const t = totalsOf(v, from, to);
  return {
    month, workouts: ws.length, days: new Set(ws.map((w) => w.date)).size, minutes: t.minutes, volume: t.volume, km: Math.round(km * 10) / 10,
    yoga: Math.round(yoga), bests, top: top ? { exerciseId: top[0], sets: top[1] } : undefined,
    heaviest: heaviest && heaviest[1] > 0 ? { exerciseId: heaviest[0], kg: heaviest[1] } : undefined,
    bestWeek: { start: best[0], workouts: best[1] },
    milestones: milestonesOf(v, v.profile.weeklyGoal ?? 0).earned.filter((e) => e.date >= from && e.date <= to),
  };
}
export type Wrapped = NonNullable<ReturnType<typeof wrapped>>;
/** Months with at least one workout, newest first (for the list of past wraps). */
export const wrappedMonths = (v: View) => [...new Set(v.workouts.filter((w) => !w.active).map((w) => w.date.slice(0, 7)))].sort().reverse();

// ---- welcome back, and past you ----
/** Days since your last finished workout (null: none yet). */
export function daysOff(v: View, date: string): number | null {
  const last = v.workouts.find((w) => !w.active);
  return last ? daysAgo(last.date, date) : null;
}
/** Planned weights eased back (a return after a break): last time's hints × `factor`, rounded to 2.5 kg. Typed ones stay. */
export const easeBack = (w: Workout, factor = 0.8): Workout => ({ ...w, exercises: w.exercises.map((e) => ({ ...e,
  sets: e.sets.map((s) => (s.done === false && !s.typed && s.w > 0 ? { ...s, w: Math.max(0, Math.round((s.w * factor) / 2.5) * 2.5) } : s)) })) });
/**
 * "3 months ago your best squat was 60 kg; this month, 85." Your lift from about a year, 6 months, 3 months or a month
 * ago (within 3 days of that date) against your best of the last 3 weeks: only when you've clearly got stronger.
 */
export function pastYou(v: View, date: string) {
  for (const [days, label] of [[365, 'A year ago'], [182, 'Six months ago'], [91, 'Three months ago'], [30, 'A month ago']] as const) {
    const then = v.entries.filter((e) => Math.abs(daysAgo(e.date, date) - days) <= 3);
    const picks = then.map((e) => {
      const ex = getEx(v, e.exerciseId);
      if (isTimed(ex) || ex.weightType === 'bodyweight') return null;
      const was = Math.max(0, ...e.sets.filter((s) => s.kind !== 'W').map((s) => s.w));
      const now = Math.max(0, ...v.entries.filter((x) => x.exerciseId === e.exerciseId && daysAgo(x.date, date) <= 21).flatMap((x) => x.sets.filter((s) => s.kind !== 'W').map((s) => s.w)));
      return was > 0 && now >= was * 1.05 ? { exerciseId: e.exerciseId, label, was, now, gain: now - was } : null;
    }).filter((x): x is NonNullable<typeof x> => !!x).sort((a, b) => b.gain / b.was - a.gain / a.was);
    if (picks[0]) return picks[0];
  }
  return null;
}

// ---- beat last time ----
export interface Suggestion { kind: 'up' | 'hold' | 'back' | 'reps'; kg: number; reps: number; text: string }
const r2 = (n: number, step: number) => Math.round(n / step) * step;
/**
 * What to aim for on an exercise today, from last time: one step up if every working set hit its reps (two if it felt
 * easy, RPE 7 or less), the same weight if the reps fell away or it was a grind (RPE 9.5+), about 90% after 3 weeks
 * off. Bodyweight: one more rep. `step`: your usual jump (dumbbells go up 2 kg a hand). Null when there's no history.
 */
export function suggestFor(v: View, exerciseId: string, except: string, date: string, step = 2.5): Suggestion | null {
  const ex = getEx(v, exerciseId);
  if (isTimed(ex) || ex.metric === 'secs') return null;
  const last = lastEntry(v, exerciseId, except);
  const sets = last ? last.sets.filter((s) => s.kind !== 'W') : [];
  if (!last || !sets.length) return null;
  const top = Math.max(...sets.map((s) => s.w));
  const atTop = sets.filter((s) => s.w === top);
  const reps = atTop[0].r;
  const clean = atTop.every((s) => s.r >= reps);
  const rpe = Math.max(0, ...atTop.map((s) => s.rpe ?? 0));
  const inc = ex.weightType === 'dumbbell' ? 2 : step;
  const off = daysAgo(last.date, date);
  if (ex.weightType === 'bodyweight' && top <= 0) {
    return clean && rpe < 9.5 ? { kind: 'reps', kg: top, reps: reps + 1, text: `Try ${reps + 1} reps a set today, one more than last time.` } : null;
  }
  if (off > 21) {
    const kg = Math.max(inc, r2(top * 0.9, inc));
    return { kind: 'back', kg, reps, text: `It’s been ${Math.round(off / 7)} weeks: start around ${num(kg)} kg and build back up.` };
  }
  if (!clean || rpe >= 9.5) return { kind: 'hold', kg: top, reps, text: `Stay at ${num(top)} kg and aim for ${reps} on every set.` };
  const up = rpe && rpe <= 7 ? 2 * inc : inc;
  return { kind: 'up', kg: top + up, reps, text: `Try ${num(top + up)} kg × ${reps} today: +${num(up)} kg on last time${rpe && rpe <= 7 ? ', which felt easy' : ''}.` };
}
/** Put the suggested weight (or reps) in the exercise's planned sets. Warm-ups, ticked and typed sets stay as they are. */
export const applySuggestion = (w: Workout, i: number, s: Suggestion): Workout => ({ ...w, exercises: w.exercises.map((e, j) => (j !== i ? e : { ...e,
  sets: e.sets.map((x) => (x.done === false && !x.typed && x.kind !== 'W' ? { ...x, ...(s.kind === 'reps' ? { r: s.reps } : { w: s.kg }) } : x)) })) });
/** The planned sets already use it. */
export const usesSuggestion = (w: Workout, i: number, s: Suggestion) => {
  const planned = w.exercises[i]?.sets.filter((x) => x.done === false && x.kind !== 'W') ?? [];
  return planned.length > 0 && planned.every((x) => (s.kind === 'reps' ? x.r === s.reps : x.w === s.kg));
};
