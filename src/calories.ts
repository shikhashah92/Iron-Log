// Estimated calories (pure, unit tested). The standard MET method: kcal = MET × body weight (kg) × hours, with MET
// values from the Compendium of Physical Activities. An estimate: good for comparing days, not for exact counting.
import { getEx, type Exercise, type SetRow, type View, type Workout } from './model.ts';

/** Resistance training, multiple exercises, 8–15 reps (Compendium 02054): the rest of a workout's time. */
export const STRENGTH_MET = 3.5;

/** MET by speed (km/h → MET) for the activities where speed decides the cost; linear between points. */
const BY_SPEED: Record<string, [number, number][]> = {
  run: [[6.4, 6], [8, 8.3], [9.7, 9.8], [11.3, 11], [12.9, 11.8], [14.5, 12.8], [16, 14.5], [19.3, 19.8]],
  walk: [[3.2, 2.8], [4, 3], [4.8, 3.5], [5.6, 4.3], [6.4, 5], [7.2, 7]],
  cycle: [[16, 6.8], [19.2, 8], [22.5, 10], [25.7, 12], [30.6, 15.8]],
};
const SPEED_OF: Record<string, keyof typeof BY_SPEED> = { run: 'run', treadmill: 'run', walk: 'walk', hike: 'walk', cycle: 'cycle' };
function interp(table: [number, number][], x: number): number {
  if (x <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) if (x <= table[i][0]) {
    const [x0, y0] = table[i - 1], [x1, y1] = table[i];
    return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  return table[table.length - 1][1];
}

/** MET for one logged set of a cardio exercise or activity. */
export function metOf(ex: Exercise, s: SetRow): number {
  const [light, moderate, vigorous] = ex.met ?? [3, 4, 6];
  if (ex.kind === 'cardio') {
    const table = SPEED_OF[ex.id] && BY_SPEED[SPEED_OF[ex.id]];
    const kmh = s.w > 0 && s.r > 0 ? s.w / (s.r / 3600) : 0;
    return table && kmh > 0 ? interp(table, kmh) : moderate;
  }
  return [light, light, moderate, vigorous][s.w] ?? moderate;
}
/** kcal for a stretch of activity at a MET. */
export const kcal = (met: number, kg: number, secs: number) => met * kg * (secs / 3600);

/**
 * A workout's estimated calories: each logged cardio / activity set at its own MET, plus the rest of the workout's
 * clock at the strength rate. Null without a bodyweight (log a weigh-in first).
 */
export function workoutCalories(v: View, w: Workout): number | null {
  const kg = v.bodyweight;
  if (!kg) return null;
  let total = 0, timed = 0;
  for (const e of w.exercises) {
    const ex = getEx(v, e.exerciseId);
    if (ex.kind !== 'cardio' && ex.kind !== 'activity') continue;
    for (const s of e.sets) if (s.done !== false && s.r > 0) { total += kcal(metOf(ex, s), kg, s.r); timed += s.r; }
  }
  const hasStrength = w.exercises.some((e) => { const ex = getEx(v, e.exerciseId); return ex.kind !== 'cardio' && ex.kind !== 'activity'; });
  const clock = w.endedAt ? (w.endedAt - w.startedAt) / 1000 : 0;
  if (hasStrength && clock > timed) total += kcal(STRENGTH_MET, kg, clock - timed);
  return Math.round(total);
}
