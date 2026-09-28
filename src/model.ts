// The data model and every change to it, as pure functions (no I/O), so it can be unit tested with node --test.
import { BUILT_IN } from './exercises.ts';

export const SCHEMA_VERSION = 3;
export type Theme = 'system' | 'light' | 'dark';
export type WeightType = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight';
export const WEIGHT_TYPES: { id: WeightType; label: string; unit: string }[] = [
  { id: 'barbell', label: 'Barbell: total kg', unit: 'kg (total)' },
  { id: 'dumbbell', label: 'Dumbbell: kg per hand', unit: 'kg / dumbbell' },
  { id: 'machine', label: 'Machine: kg / load', unit: 'kg / load' },
  { id: 'cable', label: 'Cable: kg / load', unit: 'kg / load' },
  { id: 'bodyweight', label: 'Bodyweight: +/- kg', unit: '+/- kg (optional)' },
];
export const FEELINGS = [
  { id: 'Easy', emoji: '😌' }, { id: 'Moderate', emoji: '🙂' }, { id: 'Hard', emoji: '😓' }, { id: 'Max effort', emoji: '🥵' },
] as const;

/**
 * `kind`: strength (absent: weight × reps), `cardio` (time + distance: a set's `w` is km, `r` seconds) or `activity`
 * (time + intensity: `w` is 1 light / 2 moderate / 3 vigorous, `r` seconds). `met`: energy cost at light / moderate /
 * vigorous effort (Compendium of Physical Activities), for calorie estimates. `icon` / `art: false`: activities without
 * a drawing show an icon instead.
 */
export interface Exercise {
  id: string; name: string; group: string; equip: string; weightType: WeightType; metric?: 'secs';
  setup: string[]; exec: string[]; avoid: string[];
  kind?: 'cardio' | 'activity'; met?: [number, number, number]; icon?: string; art?: false;
}
export const INTENSITIES = ['', 'Light', 'Moderate', 'Vigorous'] as const;
export const ACTIVITY_GROUPS = ['Cardio', 'Yoga & mobility', 'Sports', 'Classes'] as const;
export const isTimed = (ex: Exercise) => ex.kind === 'cardio' || ex.kind === 'activity';
export interface CustomExercise extends Exercise { profileId: string; updatedAt: number }
export interface Profile {
  id: string; name: string; createdAt: number;
  /** Bodyweight to use before any weigh-in is logged (after that, the weigh-in trend is used). */
  bodyweight: number;
  height?: number; // cm
  target?: WeightTarget;
  weighEvery?: 'daily' | '3x' | 'weekly' | 'off';
}
/** A target weight by a date. The plan starts from the trend when it was set. */
export interface WeightTarget { weight: number; date: string; startWeight: number; startDate: string }
/** One weigh-in (kg, cm). Everything but the weight is optional; a photo is kept with the other photos. */
export interface WeighIn {
  id: string; profileId: string; date: string; weight: number; at: number;
  fat?: number; waist?: number; chest?: number; hips?: number; arm?: number; thigh?: number; photo?: true;
}
export const MEASURES = [
  { id: 'waist', label: 'Waist' }, { id: 'chest', label: 'Chest' }, { id: 'hips', label: 'Hips' }, { id: 'arm', label: 'Arm' }, { id: 'thigh', label: 'Thigh' },
] as const;
export type MeasureId = (typeof MEASURES)[number]['id'];
export type SetKind = 'W' | 'D'; // warm-up, drop set
/**
 * One set: weight (kg, may be negative for assisted bodyweight) and reps (or seconds for holds).
 * In a workout in progress a set is planned until ticked: `done: false`, and until you type in it its values are only a
 * hint (last time's numbers, shown grey). Logged sets have neither flag. Warm-ups don't count toward records.
 */
export interface SetRow { w: number; r: number; done?: false; typed?: true; kind?: SetKind }
export interface WorkoutExercise { exerciseId: string; sets: SetRow[] }
/** One workout: a template run, or an empty one you built as you went. At most one per person is `active` at a time. */
export interface Workout {
  id: string; profileId: string; date: string; name: string; startedAt: number; endedAt?: number; feeling?: string;
  exercises: WorkoutExercise[]; active?: true; templateId?: string;
  /** What the template asked for when it started (exercise and set count), to offer "update the template?" at Finish. */
  planned?: TemplateExercise[];
  source?: 'strong'; updatedAt: number;
}
/** Derived per exercise per workout (only logged sets): what history, charts and records read. */
export interface Entry { profileId: string; date: string; exerciseId: string; sets: SetRow[]; updatedAt: number; workoutId: string; startedAt: number }
/** `sets`: how many to plan; when absent, as many as last time (or 3 for a new exercise). */
export interface TemplateExercise { exerciseId: string; sets?: number }
export interface Template { id: string; profileId: string; name: string; exercises: TemplateExercise[]; updatedAt: number }
export interface Favorite { profileId: string; exerciseId: string; at: number }
export interface Settings {
  theme: Theme; restSecs: number; currentProfileId: string;
  lastBackupAt?: number;
  /** What the person chose on first run: back up to a file, or keep everything on this device only. */
  backupChoice?: 'file' | 'local';
  /** Units for body weight and measurements (lifts are always kg). */
  units?: { weight: 'kg' | 'lb'; length: 'cm' | 'in' };
}
export interface Log {
  schemaVersion: number; profiles: Profile[]; exercises: CustomExercise[]; favorites: Favorite[];
  templates: Template[]; workouts: Workout[]; weighIns: WeighIn[]; settings: Settings;
}
/** Exercise photos, by `${profileId}:${exerciseId}`: kept apart from the log so everyday saves stay small. */
export type Images = Record<string, string>;
export const imgKey = (profileId: string, exerciseId: string) => `${profileId}:${exerciseId}`;

// ---- dates ----
const pad = (n: number) => String(n).padStart(2, '0');
export const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => dayKey(new Date());
/** A real calendar day (YYYY-MM-DD), not just the right shape: rejects 2026-02-31 and 2026-13-01. */
export function isRealDay(v: unknown): v is string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, mo, d] = v.split('-').map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return y >= 1900 && dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + n));
}
export const daysAgo = (day: string, from = today()) => {
  const [a, b] = [day, from].map((s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); });
  return Math.round((b - a) / 86400_000);
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const shortDate = (day: string) => `${day.slice(8)} ${MONTHS[Number(day.slice(5, 7)) - 1]}`;
/** "Mon, 28 Sep", with the year when it isn't this year ("Thu, 7 May 2025"). */
export const longDate = (day: string, now = today()) =>
  new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', ...(day.slice(0, 4) !== now.slice(0, 4) ? { year: 'numeric' } : {}) });
/** "14 Jul 2022": for chart axes and ranges, where the year always matters. */
export const dateWithYear = (day: string) =>
  new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
export function duration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return `${h > 0 ? `${h}:${pad(m)}` : m}:${pad(s % 60)}`;
}
export const num = (n: number) => (Number.isFinite(n) ? String(Math.round(n * 100) / 100) : '0');
export const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

// ---- a new log ----
export const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
export function newLog(name = 'Me', now = Date.now()): Log {
  const p: Profile = { id: newId('p'), name, bodyweight: 0, createdAt: now };
  return {
    schemaVersion: SCHEMA_VERSION, profiles: [p], exercises: [], favorites: [], templates: [], workouts: [], weighIns: [],
    settings: { theme: 'system', restSecs: 90, currentProfileId: p.id },
  };
}

// ---- reading one person's data ----
/** The current person's slice of the log. Every screen works on this, so profiles never mix. */
export interface View {
  profile: Profile; exercises: CustomExercise[]; favorites: Favorite[]; templates: Template[];
  /** Newest first. */
  workouts: Workout[]; active?: Workout;
  /** Oldest first: one per exercise per workout, logged sets only (the workout in progress counts what's ticked). */
  entries: Entry[];
  /** Oldest first. */
  weighIns: WeighIn[];
  /** For volume, bodyweight exercises and calories: the latest weigh-in, else the profile's number (0 if unknown). */
  bodyweight: number;
}
export function viewOf(l: Log): View {
  const pid = l.settings.currentProfileId;
  const mine = <T extends { profileId: string }>(xs: T[]) => xs.filter((x) => x.profileId === pid);
  const workouts = mine(l.workouts).sort((a, b) => b.startedAt - a.startedAt);
  const entries: Entry[] = [];
  for (const w of [...workouts].reverse()) for (const e of w.exercises) {
    const sets = e.sets.filter((x) => x.done !== false);
    if (sets.length) entries.push({ profileId: pid, date: w.date, exerciseId: e.exerciseId, sets, updatedAt: w.updatedAt, workoutId: w.id, startedAt: w.startedAt });
  }
  const profile = l.profiles.find((p) => p.id === pid) ?? l.profiles[0];
  const weighIns = mine(l.weighIns).sort((a, b) => (a.date === b.date ? a.at - b.at : a.date < b.date ? -1 : 1));
  return {
    profile, exercises: mine(l.exercises), favorites: mine(l.favorites).sort((a, b) => b.at - a.at), templates: mine(l.templates),
    workouts, active: workouts.find((w) => w.active), entries, weighIns,
    bodyweight: weighIns.at(-1)?.weight ?? profile.bodyweight,
  };
}

const builtInById = new Map(BUILT_IN.map((e) => [e.id, e]));
/** Built-in exercises ship with drawings (public/illustrations/<id>/1-3.svg); custom ones don't. */
export const isBuiltIn = (id: string) => builtInById.has(id);
/** Has a 3-frame drawing (the built-ins, except the activities that show an icon instead). */
export const hasArt = (id: string) => builtInById.get(id)?.art !== false && builtInById.has(id);
export const allExercises = (v: View): Exercise[] => [...BUILT_IN, ...v.exercises];
export function getEx(v: View, id: string): Exercise {
  return v.exercises.find((e) => e.id === id) ?? builtInById.get(id)
    ?? { id, name: fallbackName(id), group: 'Other', equip: '', weightType: 'barbell', setup: [], exec: [], avoid: [] };
}
/** "back-squat" → "Back squat"; a custom exercise's generated id → "Deleted exercise". */
export function fallbackName(id: string): string {
  if (/^u_[a-z0-9]+$/.test(id)) return 'Deleted exercise';
  const words = id.replace(/[-_]+/g, ' ').trim();
  return words ? words[0].toUpperCase() + words.slice(1) : 'Exercise';
}
/** Search by name or equipment; `q` is already lower-cased and trimmed. */
export const matches = (e: Exercise, q: string) => !q || e.name.toLowerCase().includes(q) || e.equip.toLowerCase().includes(q);
export const isCustom = (v: View, id: string) => v.exercises.some((e) => e.id === id);
export const isFav = (v: View, id: string) => v.favorites.some((f) => f.exerciseId === id);

/** Oldest first; every workout that has a logged set of this exercise. */
export const historyOf = (v: View, exerciseId: string) => v.entries.filter((e) => e.exerciseId === exerciseId);
/** The last time this exercise was done, not counting `except` (the workout you're in). */
export function lastEntry(v: View, exerciseId: string, except?: string): Entry | null {
  const h = historyOf(v, exerciseId).filter((e) => e.workoutId !== except);
  return h[h.length - 1] ?? null;
}
const working = (sets: SetRow[]) => sets.filter((s) => s.kind !== 'W');
export const bestSet = (sets: SetRow[]) => [...sets].sort((a, b) => b.w - a.w || b.r - a.r)[0];
/** Heaviest working set ever (warm-ups don't count). Cardio and activities don't have one. */
export const prOf = (v: View, exerciseId: string) => (isTimed(getEx(v, exerciseId)) ? 0
  : historyOf(v, exerciseId).reduce((m, e) => Math.max(m, ...working(e.sets).map((s) => s.w)), 0));
const load = (s: SetRow, ex: Exercise, bw: number) => (ex.weightType === 'bodyweight' ? (bw > 0 ? bw + s.w : s.w) : s.w);
/** What a chart plots per session: top load for strength; distance (km, else minutes) for cardio; minutes for activities. */
export function topLoad(e: Entry, ex: Exercise, bw: number): number {
  if (ex.kind === 'cardio') { const km = e.sets.reduce((t, s) => t + s.w, 0); return km || e.sets.reduce((t, s) => t + s.r, 0) / 60; }
  if (ex.kind === 'activity') return e.sets.reduce((t, s) => t + s.r, 0) / 60;
  return working(e.sets).reduce((m, s) => Math.max(m, load(s, ex, bw)), 0);
}
export function volumeOf(e: { sets: SetRow[] }, ex: Exercise, bw: number): number {
  if (ex.metric === 'secs' || isTimed(ex)) return 0;
  return e.sets.reduce((t, s) => t + Math.max(0, load(s, ex, bw)) * s.r * (ex.weightType === 'dumbbell' ? 2 : 1), 0);
}
/** Epley estimate of the best one-rep max across these days. */
export const estOneRM = (entries: Entry[], ex: Exercise, bw: number) => isTimed(ex) ? 0 :
  entries.reduce((m, e) => Math.max(m, ...working(e.sets).map((s) => load(s, ex, bw) * (1 + s.r / 30))), 0);
/** 1800 → "30:00", 3900 → "1:05:00". */
export function clock(secs: number): string {
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), sec = Math.round(secs % 60);
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}
/** "30" (minutes), "30:15" (m:ss) or "1:05:00" (h:mm:ss) → seconds; null if it isn't a time. */
export function parseClock(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  const parts = t.split(':').map((x) => (x === '' ? NaN : Number(x)));
  if (parts.some((x) => !Number.isFinite(x) || x < 0)) return null;
  const secs = parts.length === 1 ? parts[0] * 60 : parts.length === 2 ? parts[0] * 60 + parts[1] : parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : NaN;
  return Number.isFinite(secs) && secs <= MAX_R ? Math.round(secs) : null;
}
/** Minutes per km, e.g. "5:30 /km". */
export const pace = (km: number, secs: number) => (km > 0 && secs > 0 ? `${clock(secs / km)} /km` : '');
export function fmtSet(s: SetRow, ex: Exercise): string {
  if (ex.kind === 'cardio') return [s.w ? `${num(s.w)} km` : '', clock(s.r)].filter(Boolean).join(' · ');
  if (ex.kind === 'activity') return `${Math.round(s.r / 60)} min${s.w ? ` · ${INTENSITIES[s.w] ?? ''}` : ''}`;
  const rep = ex.metric === 'secs' ? `${s.r}s` : String(s.r);
  if (ex.weightType === 'bodyweight') return s.w ? `BW${s.w > 0 ? '+' : ''}${num(s.w)}×${rep}` : `BW×${rep}`;
  if (!s.w) return ex.metric === 'secs' ? rep : `${rep} reps`;
  return `${num(s.w)}${ex.weightType === 'dumbbell' ? '/DB' : ''}×${rep}`;
}
/** Exercises by most recent use (newest first). */
export function recentExIds(v: View): string[] {
  const last = new Map<string, string>();
  for (const e of v.entries) if (e.sets.length && (last.get(e.exerciseId) ?? '') < e.date) last.set(e.exerciseId, e.date);
  return [...last.keys()].sort((a, b) => (last.get(b)! < last.get(a)! ? -1 : 1));
}
export function weekStats(v: View, date: string) {
  const since = addDays(date, -6);
  const workouts = new Set<string>();
  let sets = 0, volume = 0;
  for (const e of v.entries) {
    if (e.date < since || e.date > date) continue;
    workouts.add(e.workoutId);
    sets += e.sets.length;
    volume += volumeOf(e, getEx(v, e.exerciseId), v.bodyweight);
  }
  return { sessions: workouts.size, sets, volume };
}
/** Sets and volume of one workout (logged sets only). */
export function workoutStats(v: View, w: Workout) {
  let sets = 0, volume = 0;
  for (const e of w.exercises) {
    const done = e.sets.filter((s) => s.done !== false);
    sets += done.length;
    volume += volumeOf({ sets: done }, getEx(v, e.exerciseId), v.bodyweight);
  }
  return { sets, volume };
}

/** Nudge when work is at risk: something changed since the last backup, and that was over a week ago. */
export function needsBackupNudge(l: Log, now = Date.now(), days = 7): boolean {
  const last = l.settings.lastBackupAt ?? 0;
  const changed = l.workouts.filter((w) => !w.active && w.updatedAt > last);
  if (!changed.length) return false;
  const since = last || Math.min(...changed.map((w) => w.updatedAt));
  return now - since > days * 86400_000;
}

// ---- changes (all return a new Log for the current person) ----
const pidOf = (l: Log) => l.settings.currentProfileId;
export function toggleFav(l: Log, exId: string, now = Date.now()): Log {
  const pid = pidOf(l);
  const on = l.favorites.some((f) => f.profileId === pid && f.exerciseId === exId);
  return { ...l, favorites: on ? l.favorites.filter((f) => !(f.profileId === pid && f.exerciseId === exId)) : [...l.favorites, { profileId: pid, exerciseId: exId, at: now }] };
}
export function putExercise(l: Log, ex: Exercise, now = Date.now()): Log {
  const pid = pidOf(l);
  const rest = l.exercises.filter((e) => !(e.profileId === pid && e.id === ex.id));
  return { ...l, exercises: [...rest, { ...ex, profileId: pid, updatedAt: now }] };
}
/** Deleting a custom exercise keeps its logged history (it then shows under its id). */
export const delExercise = (l: Log, id: string) => ({ ...l, exercises: l.exercises.filter((e) => !(e.profileId === pidOf(l) && e.id === id)) });

export function putTemplate(l: Log, t: { id: string; name: string; exercises: TemplateExercise[] }, now = Date.now()): Log {
  const pid = pidOf(l);
  return { ...l, templates: [...l.templates.filter((x) => !(x.profileId === pid && x.id === t.id)), { ...t, profileId: pid, updatedAt: now }] };
}
export const delTemplate = (l: Log, id: string) => ({ ...l, templates: l.templates.filter((t) => !(t.profileId === pidOf(l) && t.id === id)) });
/** A template from a workout you did: its exercises, with as many sets as you did. */
export const templateFrom = (w: Workout): TemplateExercise[] =>
  w.exercises.map((e) => ({ exerciseId: e.exerciseId, sets: e.sets.filter((s) => s.done !== false).length || e.sets.length }));

// ---- workouts ----
export function timeOfDayName(ms: number): string {
  const h = new Date(ms).getHours();
  return `${h < 5 ? 'Night' : h < 11 ? 'Morning' : h < 14 ? 'Midday' : h < 17 ? 'Afternoon' : h < 21 ? 'Evening' : 'Night'} Workout`;
}
/**
 * Planned sets for an exercise: last time's sets as grey hints (warm-up / drop marks kept), `count` of them if given
 * (repeating the last one or trimming), or 3 empty sets for an exercise you've never done.
 */
export function planSets(v: View, exerciseId: string, count?: number, except?: string): SetRow[] {
  const prev = lastEntry(v, exerciseId, except)?.sets ?? [];
  const ex = getEx(v, exerciseId);
  const n = Math.max(1, Math.min(50, count ?? (prev.length || (isTimed(ex) ? 1 : 3))));
  const fresh = ex.kind === 'activity' ? 2 : 0; // a new activity starts at moderate intensity
  const hint = (s?: SetRow): SetRow => ({ w: s?.w ?? fresh, r: s?.r ?? 0, done: false, ...(s?.kind ? { kind: s.kind } : {}) });
  return Array.from({ length: n }, (_, i) => hint(prev[i] ?? (prev.length ? { w: prev.at(-1)!.w, r: prev.at(-1)!.r } : undefined)));
}
/** Start a workout (from a template, or empty). No-op if one is already in progress: resume that instead. */
export function startWorkout(l: Log, templateId?: string, now = Date.now()): Log {
  const v = viewOf(l);
  if (v.active) return l;
  const t = templateId ? v.templates.find((x) => x.id === templateId) : undefined;
  const exercises = (t?.exercises ?? []).map((te) => ({ exerciseId: te.exerciseId, sets: planSets(v, te.exerciseId, te.sets) }));
  const w: Workout = {
    id: newId('w'), profileId: pidOf(l), date: dayKey(new Date(now)), name: t?.name ?? timeOfDayName(now), startedAt: now, active: true,
    exercises, updatedAt: now,
    ...(t ? { templateId: t.id, planned: exercises.map((e) => ({ exerciseId: e.exerciseId, sets: e.sets.length })) } : {}),
  };
  return { ...l, workouts: [...l.workouts, w] };
}
export const putWorkout = (l: Log, w: Workout, now = Date.now()): Log =>
  ({ ...l, workouts: l.workouts.map((x) => (x.id === w.id ? { ...w, updatedAt: now } : x)) });
export const delWorkout = (l: Log, id: string): Log => ({ ...l, workouts: l.workouts.filter((w) => w.id !== id) });
export const unfinished = (w: Workout) => w.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done === false).length, 0);
/**
 * Finish: unticked sets are dropped (or, with `markDone`, logged as shown), exercises left with no sets go, and a
 * workout with nothing logged is removed altogether (returns `empty`).
 */
export function finishWorkout(l: Log, id: string, markDone: boolean, now = Date.now()): { log: Log; workout?: Workout } {
  const w = l.workouts.find((x) => x.id === id);
  if (!w) return { log: l };
  const logged = (s: SetRow): SetRow => ({ w: s.w, r: s.r, ...(s.kind ? { kind: s.kind } : {}) });
  const exercises = w.exercises
    .map((e) => ({ ...e, sets: e.sets.filter((s) => s.done !== false || (markDone && s.r > 0)).map(logged) }))
    .filter((e) => e.sets.length);
  if (!exercises.length) return { log: delWorkout(l, id) };
  const { active: _a, ...rest } = w;
  const end = Math.max(now, w.startedAt);
  // Logged after the fact (a 45-minute class entered in a minute): the workout lasted as long as its activities.
  const v = viewOf(l);
  const timed = exercises.every((e) => isTimed(getEx(v, e.exerciseId))) ? exercises.reduce((t, e) => t + e.sets.reduce((u, s) => u + s.r, 0), 0) * 1000 : 0;
  const done: Workout = { ...rest, exercises, startedAt: Math.min(w.startedAt, end - timed), endedAt: end, updatedAt: now };
  return { log: { ...l, workouts: l.workouts.map((x) => (x.id === id ? done : x)) }, workout: done };
}
/** Did this workout add or drop exercises, or change set counts, compared with what its template planned? */
export function differsFromTemplate(w: Workout): boolean {
  if (!w.planned) return false;
  const did = new Map(w.exercises.map((e) => [e.exerciseId, e.sets.length]));
  const plan = new Map(w.planned.map((p) => [p.exerciseId, p.sets]));
  return did.size !== plan.size || [...did].some(([id, n]) => plan.get(id) !== n);
}

// Editing one workout (pure, so the live sheet and "Edit workout" in History share it). `done`: new sets are
// planned in a live workout, logged when editing a past one.
const mapEx = (w: Workout, i: number, fn: (e: WorkoutExercise) => WorkoutExercise): Workout =>
  ({ ...w, exercises: w.exercises.map((e, j) => (j === i ? fn(e) : e)) });
const asLogged = (sets: SetRow[], done: boolean) => (done ? sets.map(({ done: _d, typed: _t, ...s }) => s) : sets);
export function addExercises(w: Workout, v: View, ids: string[], done = false): Workout {
  const fresh = [...new Set(ids)].filter((id) => !w.exercises.some((e) => e.exerciseId === id));
  return { ...w, exercises: [...w.exercises, ...fresh.map((id) => ({ exerciseId: id, sets: asLogged(planSets(v, id, undefined, w.id), done) }))] };
}
export const replaceExercise = (w: Workout, v: View, i: number, id: string, done = false): Workout =>
  w.exercises.some((e) => e.exerciseId === id) ? w : mapEx(w, i, () => ({ exerciseId: id, sets: asLogged(planSets(v, id, undefined, w.id), done) }));
export function moveExercise(w: Workout, i: number, by: -1 | 1): Workout {
  const j = i + by;
  if (j < 0 || j >= w.exercises.length) return w;
  const ex = [...w.exercises];
  [ex[i], ex[j]] = [ex[j], ex[i]];
  return { ...w, exercises: ex };
}
export const removeExercise = (w: Workout, i: number): Workout => ({ ...w, exercises: w.exercises.filter((_, j) => j !== i) });
/** A new set with the previous set's numbers as its hint. */
export const addSetTo = (w: Workout, i: number, done = false): Workout => mapEx(w, i, (e) => {
  const last = e.sets.at(-1);
  const row: SetRow = { w: last?.w ?? 0, r: last?.r ?? 0, ...(done ? {} : { done: false as const }) };
  return { ...e, sets: [...e.sets, row] };
});
export const delSetFrom = (w: Workout, i: number, j: number): Workout => mapEx(w, i, (e) => ({ ...e, sets: e.sets.filter((_, k) => k !== j) }));
export function setValue(w: Workout, i: number, j: number, field: 'w' | 'r', raw: string): Workout {
  const t = raw.trim().replace(',', '.');
  const n = field === 'w' ? parseFloat(t) : parseInt(t, 10);
  const val = t === '' || !Number.isFinite(n) ? 0 : Math.max(field === 'w' ? -MAX_W : 0, Math.min(field === 'w' ? MAX_W : MAX_R, n));
  return mapEx(w, i, (e) => ({ ...e, sets: e.sets.map((s, k) => (k !== j ? s : { ...s, [field]: val, ...(s.done === false ? { typed: true as const } : {}) })) }));
}
/** Set a timed set's duration from "30", "30:15" or "1:05:00" (blank: 0). */
export function setTime(w: Workout, i: number, j: number, raw: string): Workout {
  const secs = parseClock(raw) ?? 0;
  return mapEx(w, i, (e) => ({ ...e, sets: e.sets.map((s, k) => (k !== j ? s : { ...s, r: secs, ...(s.done === false ? { typed: true as const } : {}) })) }));
}
/** Tick (log it as shown) or untick a set. A set needs reps (or seconds) to be ticked. */
export function toggleDone(w: Workout, i: number, j: number): { workout: Workout; ticked: boolean } {
  const s = w.exercises[i]?.sets[j];
  if (!s) return { workout: w, ticked: false };
  if (s.done !== false) return { workout: mapEx(w, i, (e) => ({ ...e, sets: e.sets.map((x, k) => (k === j ? { ...x, done: false, typed: true } : x)) })), ticked: false };
  if (s.r <= 0) return { workout: w, ticked: false };
  const { done: _d, typed: _t, ...logged } = s;
  return { workout: mapEx(w, i, (e) => ({ ...e, sets: e.sets.map((x, k) => (k === j ? logged : x)) })), ticked: true };
}
export const setKind = (w: Workout, i: number, j: number, kind?: SetKind): Workout =>
  mapEx(w, i, (e) => ({ ...e, sets: e.sets.map((s, k) => { if (k !== j) return s; const { kind: _k, ...rest } = s; return kind ? { ...rest, kind } : rest; }) }));
/** Label for a set's number cell: warm-ups and drops show W / D, working sets count 1, 2, 3… */
export function setLabels(sets: SetRow[]): string[] {
  let n = 0;
  return sets.map((s) => (s.kind ?? String(++n)));
}

export function addProfile(l: Log, name: string, now = Date.now()): Log {
  const p: Profile = { id: newId('p'), name, bodyweight: 0, createdAt: now };
  return { ...l, profiles: [...l.profiles, p], settings: { ...l.settings, currentProfileId: p.id } };
}
export const putProfile = (l: Log, id: string, patch: Partial<Omit<Profile, 'id' | 'createdAt'>>) =>
  ({ ...l, profiles: l.profiles.map((p) => {
    if (p.id !== id) return p;
    const next = { ...p, ...patch };
    for (const k of ['height', 'target', 'weighEvery'] as const) if (next[k] === undefined) delete next[k];
    return next;
  }) });

// ---- weigh-ins ----
export function putWeighIn(l: Log, w: Omit<WeighIn, 'profileId'>): Log {
  const pid = pidOf(l);
  return { ...l, weighIns: [...l.weighIns.filter((x) => !(x.profileId === pid && x.id === w.id)), { ...w, profileId: pid }] };
}
export const delWeighIn = (l: Log, id: string): Log => ({ ...l, weighIns: l.weighIns.filter((w) => !(w.profileId === pidOf(l) && w.id === id)) });
export const switchProfile = (l: Log, id: string) => ({ ...l, settings: { ...l.settings, currentProfileId: id } });
/** Removes the person and everything of theirs. There is always at least one profile. */
export function delProfile(l: Log, id: string): Log {
  if (l.profiles.length <= 1) return l;
  const keep = <T extends { profileId: string }>(xs: T[]) => xs.filter((x) => x.profileId !== id);
  const profiles = l.profiles.filter((p) => p.id !== id);
  return {
    ...l, profiles, exercises: keep(l.exercises), favorites: keep(l.favorites), templates: keep(l.templates), workouts: keep(l.workouts), weighIns: keep(l.weighIns),
    settings: { ...l.settings, currentProfileId: l.settings.currentProfileId === id ? profiles[0].id : l.settings.currentProfileId },
  };
}

export const MAX_W = 2000, MAX_R = 100_000;
