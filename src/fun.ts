// The come-back loop: a weekly goal, milestones worth celebrating, and (further down) reminders, recaps, suggestions
// and challenges. Everything is worked out from the log on the phone; nothing here is stored except your choices.
import { addDays, daysAgo, getEx, isTimed, num, recordsOf, secsOf, volumeOf, weekStart, type View, type Workout } from './model.ts';

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
