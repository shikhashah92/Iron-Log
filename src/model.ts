// The data model and every change to it, as pure functions (no I/O), so it can be unit tested with node --test.
import { BUILT_IN, GROUPS, PLANS, STARTERS, type Plan } from './exercises.ts';

export const SCHEMA_VERSION = 4;
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
  { id: 'Easy', hint: 'Plenty left in the tank' },
  { id: 'Moderate', hint: 'Worked, but comfortable' },
  { id: 'Hard', hint: 'A rep or two left at the end' },
  { id: 'Max effort', hint: 'Nothing left' },
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
  kind?: 'cardio' | 'activity' | 'yoga'; met?: [number, number, number]; art?: false;
  /** Strength: the muscles it works, main ones and helpers (a helper counts half a set). Unset: guessed from the name. */
  muscles?: Muscles;
  /** Yoga: how a set is logged. w = rounds, r = seconds, the hold per round ('hold') or the total ('rounds', 'time'). */
  yoga?: YogaLog;
}
export const INTENSITIES = ['', 'Light', 'Moderate', 'Vigorous'] as const;
export const ACTIVITY_GROUPS = ['Cardio', 'Yoga', 'Pranayama', 'Mobility', 'Sports', 'Classes'] as const;
/** Asanas: rounds × hold. Surya Namaskar: rounds (time optional). Pranayama: time (rounds optional). */
export type YogaLog = 'hold' | 'rounds' | 'time';
/** Logged by time rather than weight × reps: no records, 1RM or volume, and no rest timer. */
export const isTimed = (ex: Exercise) => ex.kind === 'cardio' || ex.kind === 'activity' || ex.kind === 'yoga';
/** Seconds a set took: a yoga hold counts once per round. */
export const secsOf = (ex: Exercise, s: SetRow) => (ex.yoga === 'hold' ? Math.max(1, s.w) * s.r : s.r);
export interface CustomExercise extends Exercise { profileId: string; updatedAt: number }
export interface Profile {
  id: string; name: string; createdAt: number;
  /** Bodyweight to use before any weigh-in is logged (after that, the weigh-in trend is used). */
  bodyweight: number;
  height?: number; // cm
  target?: WeightTarget;
  weighEvery?: 'daily' | '3x' | 'weekly' | 'off';
  /** Optional, from onboarding: never leaves the device. */
  dob?: string; gender?: Gender; goal?: Goal;
  /** Workouts a week you're aiming for (the ring on Home). */
  weeklyGoal?: number;
  /** Your training days (0 = Monday … 6 = Sunday) and time ("07:00"), for the calendar reminder. */
  trainDays?: number[]; trainTime?: string;
  /** Weight suggestions ("try 85 kg today"): `off` to hide them; `step`, the usual jump in kg (2.5 by default). */
  progression?: { off?: true; step?: number };
  /** Challenges you've joined: a built-in one by id, or one from a friend's link (`def`). */
  challenges?: JoinedChallenge[];
}
export type ChallengeKind = 'days' | 'daily' | 'total' | 'best' | 'workouts';
/**
 * What a challenge asks, within `days` days of joining: `days`: do the exercise on `target` different days; `daily`:
 * reach `perDay` of it on `target` days; `total`: `target` in all (reps, km, seconds or rounds); `best`: one set of at
 * least `target` (kg, reps or seconds); `workouts`: `target` workouts of any kind.
 */
export interface ChallengeDef { name: string; kind: ChallengeKind; exerciseId?: string; target: number; perDay?: number; days: number; from?: string }
export interface JoinedChallenge { id: string; start: string; def?: ChallengeDef }
export type Gender = 'female' | 'male' | 'other';
export type Goal = 'lose' | 'muscle' | 'strength' | 'fit';
export const GOALS: { id: Goal; label: string; icon: string }[] = [
  { id: 'lose', label: 'Lose weight', icon: 'trending-down-outline' }, { id: 'muscle', label: 'Build muscle', icon: 'barbell-outline' },
  { id: 'strength', label: 'Get stronger', icon: 'flash-outline' }, { id: 'fit', label: 'Stay active', icon: 'walk-outline' },
];
export const GENDERS: { id: Gender; label: string }[] = [{ id: 'female', label: 'Female' }, { id: 'male', label: 'Male' }, { id: 'other', label: 'Other' }];
/** Whole years from a date of birth to a day. */
export const ageOn = (dob: string, day = today()) => Number(day.slice(0, 4)) - Number(dob.slice(0, 4)) - (day.slice(5) < dob.slice(5) ? 1 : 0);
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
/** `rpe`: how hard the set was (6–10, halves allowed), only if you chose to note it. */
export interface SetRow { w: number; r: number; done?: false; typed?: true; kind?: SetKind; rpe?: number }
/** `note`: yours, about this exercise today ("seat height 4"). `group`: exercises sharing a number are a superset, done back to back. */
export interface WorkoutExercise { exerciseId: string; sets: SetRow[]; note?: string; group?: number }
/** One workout: a template run, or an empty one you built as you went. At most one per person is `active` at a time. */
export interface Workout {
  id: string; profileId: string; date: string; name: string; startedAt: number; endedAt?: number; feeling?: string; note?: string;
  exercises: WorkoutExercise[]; active?: true; templateId?: string;
  /** What the template asked for when it started (exercise and set count), to offer "update the template?" at Finish. */
  planned?: TemplateExercise[];
  source?: 'strong'; updatedAt: number;
}
/** Derived per exercise per workout (only logged sets): what history, charts and records read. */
export interface Entry { profileId: string; date: string; exerciseId: string; sets: SetRow[]; updatedAt: number; workoutId: string; startedAt: number }
/** `sets`: how many to plan; when absent, as many as last time (or 3 for a new exercise). */
export interface TemplateExercise { exerciseId: string; sets?: number; group?: number }
/** `starter`: a ready-made one from the app (in the view only, never stored). */
export interface Template { id: string; profileId: string; name: string; exercises: TemplateExercise[]; updatedAt: number; starter?: true }
export interface Favorite { profileId: string; exerciseId: string; at: number }
export interface Settings {
  theme: Theme; restSecs: number; currentProfileId: string;
  lastBackupAt?: number;
  /** What the person chose on first run: back up to a file, or keep everything on this device only. */
  backupChoice?: 'file' | 'local';
  /** Units for body weight and measurements (lifts are always kg). */
  units?: { weight: 'kg' | 'lb'; length: 'cm' | 'in' };
  /** A new person who hasn't seen the second onboarding step (starting point and goal) yet. */
  setupPending?: true;
  /** The week (its Monday) whose recap card was closed on Home. */
  recapSeen?: string;
  /** The month ("2026-09") whose Wrapped card was closed on Home. */
  wrappedSeen?: string;
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
// Weights are always stored in kg; the person's unit (Settings) only changes what's shown and typed.
export type WeightUnit = 'kg' | 'lb';
const LB = 2.20462262;
export const toKg = (v: number, u: WeightUnit) => (u === 'lb' ? v / LB : v);
export const fromKg = (kg: number, u: WeightUnit) => (u === 'lb' ? kg * LB : kg);
/** A stored weight in the person's unit, as they'd read it: 90.72 kg → 200 lb. Pounds to 0.1, so kg kept to 0.01 (Strong) reads back clean. */
export const inUnit = (kg: number, u: WeightUnit) => (u === 'lb' ? Math.round(kg * LB * 10) / 10 : kg);
export const wt = (kg: number, u: WeightUnit) => num(inUnit(kg, u));
/** "200 lb", "90.72 kg". */
export const fmtKg = (kg: number, u: WeightUnit) => `${wt(kg, u)} ${u}`;
/** Volume: "850 kg", or "12.3 t" / "27.1k lb" when it's big. */
export const fmtVolume = (kg: number, u: WeightUnit, space = ' ') => {
  const n = fromKg(kg, u);
  return n < 1000 ? `${num(Math.round(n))} ${u}` : u === 'kg' ? `${num(Math.round(n / 100) / 10)}${space}t` : `${num(Math.round(n / 100) / 10)}k lb`;
};
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
  /** The unit weights are shown and typed in. */
  unit: WeightUnit;
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
    profile, exercises: mine(l.exercises), favorites: mine(l.favorites).sort((a, b) => b.at - a.at), templates: withStarters(mine(l.templates)),
    workouts, active: workouts.find((w) => w.active), entries, weighIns,
    bodyweight: weighIns.at(-1)?.weight ?? profile.bodyweight, unit: l.settings.units?.weight ?? 'kg',
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
/** What a chart plots per session: top load for strength; distance (km, else minutes) for cardio; minutes for activities; longest hold (s), rounds or minutes for yoga. */
export function topLoad(e: Entry, ex: Exercise, bw: number): number {
  if (ex.kind === 'cardio') { const km = e.sets.reduce((t, s) => t + s.w, 0); return km || e.sets.reduce((t, s) => t + s.r, 0) / 60; }
  if (ex.kind === 'activity') return e.sets.reduce((t, s) => t + s.r, 0) / 60;
  if (ex.kind === 'yoga') return ex.yoga === 'hold' ? Math.max(0, ...e.sets.map((s) => s.r)) : ex.yoga === 'rounds' ? e.sets.reduce((t, s) => t + s.w, 0) : e.sets.reduce((t, s) => t + s.r, 0) / 60;
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
/** A set's duration with its unit, so it can't be misread: 30s, 5m, 5m 30s, 1h 5m. */
export function fmtDur(secs: number): string {
  const s = Math.round(secs), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h) return m ? `${h}h ${m}m` : `${h}h`;
  if (m) return sec ? `${m}m ${sec}s` : `${m}m`;
  return `${sec}s`;
}
/** "30" (minutes), "30:15" (m:ss), "1:05:00" (h:mm:ss), or with units ("90s", "5m 30s", "1h 15m", "1.5h") → seconds; null if it isn't a time. */
export function parseClock(text: string): number | null {
  const t = text.trim().toLowerCase().replace(/,/g, '.');
  if (!t) return null;
  if (/[hms]/.test(t)) {
    const parts = [...t.matchAll(/(\d+(?:\.\d+)?)\s*(h|m|s)[a-z]*/g)];
    if (!parts.length || t.replace(/(\d+(?:\.\d+)?)\s*(h|m|s)[a-z]*/g, '').trim()) return null;
    const secs = parts.reduce((n, [, v, u]) => n + Number(v) * (u === 'h' ? 3600 : u === 'm' ? 60 : 1), 0);
    return secs <= MAX_R ? Math.round(secs) : null;
  }
  const parts = t.split(':').map((x) => (x === '' ? NaN : Number(x)));
  if (parts.some((x) => !Number.isFinite(x) || x < 0)) return null;
  const secs = parts.length === 1 ? parts[0] * 60 : parts.length === 2 ? parts[0] * 60 + parts[1] : parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : NaN;
  return Number.isFinite(secs) && secs <= MAX_R ? Math.round(secs) : null;
}
/** Minutes per km, e.g. "5:30 /km". */
export const pace = (km: number, secs: number) => (km > 0 && secs > 0 ? `${clock(secs / km)} /km` : '');
export function fmtSet(s: SetRow, ex: Exercise, u: WeightUnit = 'kg'): string {
  if (ex.kind === 'cardio') return [s.w ? `${num(s.w)} km` : '', fmtDur(s.r)].filter(Boolean).join(' · ');
  if (ex.kind === 'activity') return `${Math.round(s.r / 60)} min${s.w ? ` · ${INTENSITIES[s.w] ?? ''}` : ''}`;
  if (ex.kind === 'yoga') return ex.yoga === 'hold' ? `${Math.max(1, s.w)}×${fmtDur(s.r)}` : [s.w ? plural(s.w, 'round') : '', s.r ? fmtDur(s.r) : ''].filter(Boolean).join(' · ');
  const rep = ex.metric === 'secs' ? `${s.r}s` : String(s.r);
  if (ex.weightType === 'bodyweight') return s.w ? `BW${s.w > 0 ? '+' : ''}${wt(s.w, u)}×${rep}` : `BW×${rep}`;
  if (!s.w) return ex.metric === 'secs' ? rep : `${rep} reps`;
  return `${wt(s.w, u)}${ex.weightType === 'dumbbell' ? '/DB' : ''}×${rep}`;
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
// ---- personal bests ----
export type RecordKind = 'weight' | 'e1rm' | 'volume' | 'reps' | 'distance' | 'hold';
export interface PersonalBest { exerciseId: string; kind: RecordKind; value: number }
/**
 * What this workout beat, per exercise (at most one each), against every earlier session of it: heaviest set, else best
 * estimated 1RM, else most volume for weights; most reps for bodyweight; longest distance for cardio; longest hold for a pose. A first
 * ever session isn't a record (nothing to beat), and warm-ups never count.
 */
export function recordsOf(v: View, w: Workout): PersonalBest[] {
  const out: PersonalBest[] = [];
  for (const e of w.exercises) {
    const ex = getEx(v, e.exerciseId);
    const sets = working(e.sets.filter((s) => s.done !== false));
    const before = v.entries.filter((x) => x.exerciseId === e.exerciseId && x.workoutId !== w.id && x.startedAt < w.startedAt);
    if (!sets.length || !before.length) continue;
    const best = (f: (sets: SetRow[]) => number) => Math.max(0, ...before.map((x) => f(working(x.sets))));
    // One record per exercise, the most telling one: they're checked in order and the first beaten wins.
    let found = false;
    const beat = (kind: RecordKind, f: (sets: SetRow[]) => number) => {
      if (found) return;
      const now = f(sets);
      if (now > 0 && now > best(f) + 1e-9) { out.push({ exerciseId: e.exerciseId, kind, value: now }); found = true; }
    };
    if (ex.kind === 'cardio') beat('distance', (ss) => ss.reduce((t, s) => t + s.w, 0));
    else if (ex.kind === 'yoga') { if (ex.yoga === 'hold') beat('hold', (ss) => Math.max(0, ...ss.map((s) => s.r))); }
    else if (ex.kind) continue; // classes and sports: no records
    else if (ex.metric === 'secs') beat('hold', (ss) => Math.max(0, ...ss.map((s) => s.r)));
    else if (ex.weightType === 'bodyweight' && sets.every((s) => s.w === 0)) beat('reps', (ss) => Math.max(0, ...ss.map((s) => s.r)));
    else {
      const bw = v.bodyweight;
      beat('weight', (ss) => Math.max(0, ...ss.map((s) => load(s, ex, bw))));
      beat('e1rm', (ss) => Math.max(0, ...ss.map((s) => load(s, ex, bw) * (1 + s.r / 30))));
      beat('volume', (ss) => volumeOf({ sets: ss }, ex, bw));
    }
  }
  return out;
}
/** "Heaviest: 85 kg", "Most reps: 14"… for a record. */
export function recordLabel(r: PersonalBest, u: WeightUnit = 'kg'): string {
  const kg = (n: number) => `${num(Math.round(fromKg(n, u) * 10) / 10)} ${u}`;
  return r.kind === 'weight' ? `Heaviest: ${kg(r.value)}` : r.kind === 'e1rm' ? `Best est. 1RM: ${kg(r.value)}` : r.kind === 'volume' ? `Most volume: ${kg(r.value)}`
    : r.kind === 'reps' ? `Most reps: ${r.value}` : r.kind === 'distance' ? `Longest: ${num(Math.round(r.value * 100) / 100)} km` : `Longest hold: ${fmtDur(r.value)}`;
}

// ---- history: calendar and trends ----
/** Monday of the week `day` is in. */
export const weekStart = (day: string) => addDays(day, -((new Date(`${day}T12:00:00`).getDay() + 6) % 7));
/** Finished workouts, minutes, working sets and volume from `from` to `to` (inclusive). */
export function totals(v: View, from: string, to: string) {
  const done = v.workouts.filter((w) => !w.active && w.date >= from && w.date <= to);
  let sets = 0, volume = 0;
  for (const e of v.entries) {
    if (e.date < from || e.date > to) continue;
    sets += working(e.sets).length;
    volume += volumeOf(e, getEx(v, e.exerciseId), v.bodyweight);
  }
  const minutes = Math.round(done.reduce((t, w) => t + (w.endedAt ? (w.endedAt - w.startedAt) / 60_000 : 0), 0));
  return { workouts: done.length, days: new Set(done.map((w) => w.date)).size, minutes, sets, volume };
}
/** The last `weeks` weeks (Monday start), oldest first, ending with the week of `date`. */
export const weekly = (v: View, date: string, weeks = 12) => Array.from({ length: weeks }, (_, i) => {
  const start = addDays(weekStart(date), -7 * (weeks - 1 - i));
  return { start, ...totals(v, start, addDays(start, 6)) };
});
/** Weeks in a row with at least one workout. This week counts once you've trained; until then it doesn't break the run. */
export function weekStreak(v: View, date: string) {
  const weeks = new Set(v.workouts.filter((w) => !w.active && w.date <= date).map((w) => weekStart(w.date)));
  let wk = weekStart(date), current = 0;
  if (!weeks.has(wk)) wk = addDays(wk, -7);
  while (weeks.has(wk)) { current++; wk = addDays(wk, -7); }
  let best = 0, run = 0, prev = '';
  for (const w of [...weeks].sort()) { run = prev && addDays(prev, 7) === w ? run + 1 : 1; best = Math.max(best, run); prev = w; }
  return { current, best };
}
/** The plan a template belongs to, and which one comes after it. */
export const planFor = (templateId?: string): Plan | undefined => PLANS.find((p) => !!templateId && p.templates.includes(templateId));
export const nextInPlan = (p: Plan, templateId?: string) => p.templates[(p.templates.indexOf(templateId ?? '') + 1) % p.templates.length];
/**
 * What to do today: the next workout of a plan you've been following (in the last 3 weeks), else a template for the
 * muscle group you've trained least in the last 2 weeks, else (just starting) the full-body one.
 */
export function upNext(v: View, date: string): { templateId: string; reason: string } {
  const recent = v.workouts.filter((w) => !w.active && daysAgo(w.date, date) <= 21);
  const inPlan = recent.find((w) => planFor(w.templateId));
  if (inPlan) { const p = planFor(inPlan.templateId)!; return { templateId: nextInPlan(p, inPlan.templateId), reason: `Next in ${p.name}` }; }
  if (recent.length >= 2) {
    const g = groupSets(v, addDays(date, -13), date).sort((a, b) => a.sets - b.sets)[0];
    return { templateId: `starter-${g.group.toLowerCase()}`, reason: g.sets ? `${g.group}: your least-trained muscles in the last 2 weeks` : `No ${g.group.toLowerCase()} work in the last 2 weeks` };
  }
  return { templateId: 'starter-full-body', reason: 'A good place to start: the whole body in one session' };
}
/**
 * Monday's look back at last week: its totals against the week before, and a muscle group that was light (well under
 * its usual share over the four weeks before). Null when there's nothing to say (no workouts in either week).
 */
export function weekRecap(v: View, date: string) {
  const start = addDays(weekStart(date), -7), end = addDays(start, 6);
  const last = totals(v, start, end), before = totals(v, addDays(start, -7), addDays(start, -1));
  if (!last.workouts && !before.workouts) return null;
  const usual = groupSets(v, addDays(start, -28), addDays(start, -1)), now = groupSets(v, start, end);
  const light = usual.map((g, k) => ({ group: g.group, avg: g.sets / 4, sets: now[k].sets }))
    .filter((g) => g.avg >= 4 && g.sets < g.avg / 2).sort((a, b) => a.sets / a.avg - b.sets / b.avg)[0];
  return { start, last, before, light: light ? { group: light.group, sets: light.sets, usual: Math.round(light.avg) } : undefined };
}
/** The muscles the body map draws (react-native-body-highlighter's names), with the group each belongs to. */
export const MUSCLES = {
  chest: 'Chest', 'upper-back': 'Back', 'lower-back': 'Back', trapezius: 'Back', deltoids: 'Shoulders',
  biceps: 'Arms', triceps: 'Arms', forearm: 'Arms', quadriceps: 'Legs', hamstring: 'Legs', gluteal: 'Legs',
  adductors: 'Legs', calves: 'Legs', tibialis: 'Legs', abs: 'Core', obliques: 'Core',
} as const;
export type Muscle = keyof typeof MUSCLES;
export interface Muscles { main: Muscle[]; help: Muscle[] }
export const MUSCLE_NAMES: Record<Muscle, string> = {
  chest: 'Chest', 'upper-back': 'Upper back', 'lower-back': 'Lower back', trapezius: 'Traps', deltoids: 'Shoulders',
  biceps: 'Biceps', triceps: 'Triceps', forearm: 'Forearms', quadriceps: 'Quads', hamstring: 'Hamstrings', gluteal: 'Glutes',
  adductors: 'Inner thighs', calves: 'Calves', tibialis: 'Shins', abs: 'Abs', obliques: 'Obliques',
};
const m = (main: string, help = ''): Muscles => ({ main: main.split(' ') as Muscle[], help: (help ? help.split(' ') : []) as Muscle[] });
// The first match that fits the exercise's group wins, so narrower names come before broad words ("Leg Curl" before
// "curl", "Tricep Press" before "press"), and "Kickback" can be glutes under Legs but triceps under Arms.
const GUESS: [RegExp, Muscles][] = [
  [/\b(leg|knee) raises?\b/, m('abs', 'obliques')], [/\bupright rows?\b/, m('deltoids trapezius', 'biceps')],
  [/\b(reverse fl(y|ies|yes)|rear delts?|face pulls?)\b/, m('deltoids', 'upper-back trapezius')],
  [/\bhammer curls?\b/, m('biceps forearm')], [/\b(leg curls?|hamstring curls?|hamstrings?|nordic)\b/, m('hamstring', 'calves')],
  [/\b(wrists?|forearms?|farmers?)\b/, m('forearm', 'trapezius')], [/\b(curls?|biceps?)\b/, m('biceps', 'forearm')],
  [/\b(glutes?|hip thrusts?|bridges?|abduct\w*|kickbacks?)\b/, m('gluteal', 'hamstring')],
  [/\b(triceps?|skull\w*|push ?downs?|dips?|kickbacks?)\b/, m('triceps')],
  [/\b(romanian|rdl|stiff[- ]leg\w*|good ?mornings?)\b/, m('hamstring gluteal', 'lower-back')],
  [/\bdeadlifts?\b/, m('hamstring gluteal lower-back', 'upper-back trapezius forearm quadriceps')],
  [/\b(calf|calves)\b/, m('calves')], [/\badduct\w*\b/, m('adductors')], [/\b(leg extensions?|quads?)\b/, m('quadriceps')],
  [/\b(squats?|sqats?|lunges?|step-ups?|hack|legs?)\b/, m('quadriceps gluteal', 'hamstring')],
  [/\bshrugs?\b/, m('trapezius', 'forearm')], [/\b(back extensions?|hyper ?extensions?|supermans?)\b/, m('lower-back', 'gluteal hamstring')],
  [/\b(rows?|pull ?downs?|pull ?ups?|chin ?ups?|pullovers?|lats?)\b/, m('upper-back', 'biceps')],
  [/\b(fly|flys|flyes|flies|pec deck)\b/, m('chest', 'deltoids')], [/\b(bench|chest|push ?ups?|pec)\b/, m('chest', 'triceps deltoids')],
  [/\b(press|raises?|shoulders?|delts?)\b/, m('deltoids', 'triceps')],
  [/\b(twists?|obliques?|side bends?|woodchop\w*)\b/, m('obliques', 'abs')],
  [/\b(abs?|crunch(es)?|planks?|core|sit ?ups?|hollow|rollouts?)\b/, m('abs', 'obliques')],
];
/** What a name alone suggests ("Linear Hack Press": quads and glutes, hamstrings helping). */
export const fromName = (name: string) => GUESS.find(([re]) => re.test(name.toLowerCase()))?.[1];
const BY_GROUP: Record<string, Muscles> = {
  Chest: m('chest', 'triceps deltoids'), Back: m('upper-back', 'biceps'), Shoulders: m('deltoids', 'triceps'),
  Legs: m('quadriceps gluteal', 'hamstring'), Arms: m('biceps triceps'), Core: m('abs', 'obliques'),
};
/**
 * What a name suggests, kept only if it agrees with the exercise's group (that was chosen, the name is a guess);
 * otherwise the group's usual muscles. Nothing for cardio, activities and "Other".
 */
export function guessMuscles(name: string, group: string): Muscles | undefined {
  const n = name.toLowerCase();
  return GUESS.find(([re, ms]) => MUSCLES[ms.main[0]] === group && re.test(n))?.[1] ?? BY_GROUP[group];
}
export const musclesOf = (ex: Exercise): Muscles | undefined => (ex.kind ? undefined : ex.muscles ?? guessMuscles(ex.name, ex.group));

/** Working sets per muscle from `from` to `to` (strength only); a helper muscle gets half of each set. */
export function muscleSets(v: View, from: string, to: string): Record<Muscle, number> {
  const n = Object.fromEntries(Object.keys(MUSCLES).map((k) => [k, 0])) as Record<Muscle, number>;
  for (const e of v.entries) {
    if (e.date < from || e.date > to) continue;
    const ms = musclesOf(getEx(v, e.exerciseId)), sets = working(e.sets).length;
    if (!ms || !sets) continue;
    for (const k of ms.main) n[k] += sets;
    for (const k of ms.help) n[k] += sets / 2;
  }
  return n;
}
/** Working sets per muscle group (strength only) from `from` to `to`, in the library's group order. */
export function groupSets(v: View, from: string, to: string) {
  const n = new Map<string, number>(GROUPS.map((g) => [g, 0]));
  for (const e of v.entries) {
    const ex = getEx(v, e.exerciseId);
    if (e.date < from || e.date > to || ex.kind || !n.has(ex.group)) continue;
    n.set(ex.group, n.get(ex.group)! + working(e.sets).length);
  }
  return [...n].map(([group, sets]) => ({ group, sets }));
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
/** Time to back up: a week of changes since the last backup, or 3 workouts and never one (unless you chose device only). */
export const backupDue = (l: Log, now = Date.now()) =>
  needsBackupNudge(l, now) || (!l.settings.lastBackupAt && l.settings.backupChoice !== 'local' && l.workouts.filter((w) => !w.active).length >= 3);
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

const withStarters = (own: Template[]) => [...own, ...STARTERS.filter((s) => !own.some((t) => t.id === s.id))];
export function putTemplate(l: Log, t: { id: string; name: string; exercises: TemplateExercise[] }, now = Date.now()): Log {
  const pid = pidOf(l);
  // Only these fields are kept: saving a ready-made template stores a plain copy (no `starter` flag).
  const saved = { id: t.id, name: t.name, exercises: t.exercises, profileId: pid, updatedAt: now };
  return { ...l, templates: [...l.templates.filter((x) => !(x.profileId === pid && x.id === t.id)), saved] };
}
export const delTemplate = (l: Log, id: string) => ({ ...l, templates: l.templates.filter((t) => !(t.profileId === pidOf(l) && t.id === id)) });
/** A template from a workout you did: its exercises, with as many sets as you did. */
export const templateFrom = (w: Workout): TemplateExercise[] =>
  w.exercises.map((e) => ({ exerciseId: e.exerciseId, sets: e.sets.filter((s) => s.done !== false).length || e.sets.length, ...(e.group ? { group: e.group } : {}) }));

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
  const fresh = ex.kind === 'activity' ? 2 : ex.kind === 'yoga' ? 1 : 0; // a new activity starts at moderate intensity; a pose at one round
  const hint = (s?: SetRow): SetRow => ({ w: s?.w ?? fresh, r: s?.r ?? 0, done: false, ...(s?.kind ? { kind: s.kind } : {}) });
  return Array.from({ length: n }, (_, i) => hint(prev[i] ?? (prev.length ? { w: prev.at(-1)!.w, r: prev.at(-1)!.r } : undefined)));
}
/** Start a workout (from a template, or empty). No-op if one is already in progress: resume that instead. */
export function startWorkout(l: Log, templateId?: string, now = Date.now()): Log {
  const v = viewOf(l);
  if (v.active) return l;
  const t = templateId ? v.templates.find((x) => x.id === templateId) : undefined;
  const exercises = (t?.exercises ?? []).map((te) => ({ exerciseId: te.exerciseId, sets: planSets(v, te.exerciseId, te.sets), ...(te.group ? { group: te.group } : {}) }));
  const w: Workout = {
    id: newId('w'), profileId: pidOf(l), date: dayKey(new Date(now)), name: t?.name ?? timeOfDayName(now), startedAt: now, active: true,
    exercises, updatedAt: now,
    ...(t ? { templateId: t.id, planned: exercises.map((e) => ({ exerciseId: e.exerciseId, sets: e.sets.length })) } : {}),
  };
  return { ...l, workouts: [...l.workouts, w] };
}
export const putWorkout = (l: Log, w: Workout, now = Date.now()): Log =>
  ({ ...l, workouts: l.workouts.map((x) => (x.id === w.id ? { ...w, updatedAt: now } : x)) });
/**
 * Move a workout in time: never into the future, its day follows the start, the end never comes before the start,
 * and a name the app gave it ("Morning Workout") follows the new time.
 */
export function setTimes(w: Workout, startedAt: number, endedAt = w.endedAt, now = Date.now()): Workout {
  startedAt = Math.min(startedAt, now);
  const name = w.name === timeOfDayName(w.startedAt) ? timeOfDayName(startedAt) : w.name;
  return { ...w, name, startedAt, date: dayKey(new Date(startedAt)), ...(endedAt !== undefined ? { endedAt: Math.min(Math.max(endedAt, startedAt), Math.max(now, startedAt)) } : {}) };
}
/** A workout you forgot to log: already finished, empty, an hour long. Fill it in on "Edit workout". */
export function logPastWorkout(l: Log, startedAt: number, now = Date.now()): { log: Log; id: string } {
  const w: Workout = { id: newId('w'), profileId: pidOf(l), date: dayKey(new Date(startedAt)), name: timeOfDayName(startedAt), startedAt, endedAt: startedAt + 3_600_000, exercises: [], updatedAt: now };
  return { log: { ...l, workouts: [...l.workouts, w] }, id: w.id };
}
export const delWorkout = (l: Log, id: string): Log => ({ ...l, workouts: l.workouts.filter((w) => w.id !== id) });
export const unfinished = (w: Workout) => w.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done === false).length, 0);
/** A set with nothing in it: no reps or time (for Surya Namaskar, no rounds either). */
export const isEmptySet = (v: View, exerciseId: string, s: SetRow) => !(s.r > 0 || (getEx(v, exerciseId).yoga === 'rounds' && s.w > 0));
export const emptySets = (v: View, w: Workout) => w.exercises.reduce((n, e) => n + e.sets.filter((s) => isEmptySet(v, e.exerciseId, s)).length, 0);
/** Remove empty sets, and exercises left with none. */
export const dropEmptySets = (v: View, w: Workout): Workout =>
  ({ ...w, exercises: w.exercises.map((e) => ({ ...e, sets: e.sets.filter((s) => !isEmptySet(v, e.exerciseId, s)) })).filter((e) => e.sets.length) });
/**
 * Finish: unticked sets are dropped (or, with `markDone`, logged as shown), exercises left with no sets go, and a
 * workout with nothing logged is removed altogether (returns `empty`).
 */
export function finishWorkout(l: Log, id: string, markDone: boolean, now = Date.now()): { log: Log; workout?: Workout } {
  const w = l.workouts.find((x) => x.id === id);
  if (!w) return { log: l };
  const logged = (s: SetRow): SetRow => ({ w: s.w, r: s.r, ...(s.kind ? { kind: s.kind } : {}), ...(s.rpe ? { rpe: s.rpe } : {}) });
  const v = viewOf(l);
  const exercises = w.exercises
    .map((e) => ({ ...e, sets: e.sets.filter((s) => s.done !== false || (markDone && !isEmptySet(v, e.exerciseId, s))).map(logged) }))
    .filter((e) => e.sets.length);
  if (!exercises.length) return { log: delWorkout(l, id) };
  const { active: _a, ...rest } = w;
  const end = Math.max(now, w.startedAt);
  // Logged after the fact (a 45-minute class entered in a minute): the workout lasted as long as its activities.
  const timed = exercises.every((e) => isTimed(getEx(v, e.exerciseId))) ? exercises.reduce((t, e) => t + e.sets.reduce((u, s) => u + secsOf(getEx(v, e.exerciseId), s), 0), 0) * 1000 : 0;
  const done: Workout = { ...rest, exercises, startedAt: Math.min(w.startedAt, end - timed), endedAt: end, updatedAt: now };
  return { log: { ...l, workouts: l.workouts.map((x) => (x.id === id ? done : x)) }, workout: done };
}
/** A workout left running: started over 3 hours ago and untouched for the last 2. (Nobody lifts for 3 hours without a tap.) */
export const isForgotten = (w: Workout | undefined, now = Date.now()): w is Workout =>
  !!w?.active && now - w.startedAt > 3 * 3_600_000 && now - w.updatedAt > 2 * 3_600_000;
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
/** Your note on one exercise today (blank removes it). */
export const setNote = (w: Workout, i: number, note: string): Workout =>
  mapEx(w, i, (e) => { const { note: _n, ...rest } = e; const t = note.trim().slice(0, 300); return t ? { ...rest, note: t } : rest; });
/** The most recent note you left on this exercise in an earlier workout. */
export const lastNote = (v: View, exerciseId: string, except?: string) =>
  v.workouts.find((w) => !w.active && w.id !== except && w.exercises.some((e) => e.exerciseId === exerciseId && e.note))
    ?.exercises.find((e) => e.exerciseId === exerciseId && e.note)?.note;

// ---- supersets: neighbours sharing a `group` number are done back to back, resting only after the last one ----
/** Join exercise i with the next one (joining an existing superset on either side). */
export function supersetWithNext(w: Workout, i: number): Workout {
  const a = w.exercises[i], b = w.exercises[i + 1];
  if (!a || !b) return w;
  const g = a.group ?? b.group ?? Math.max(0, ...w.exercises.map((e) => e.group ?? 0)) + 1;
  const from = b.group;
  return { ...w, exercises: w.exercises.map((e, j) => (j === i || j === i + 1 || (from !== undefined && e.group === from) ? { ...e, group: g } : e)) };
}
/** Take exercise i out of its superset (a superset left with one exercise ends). */
export function leaveSuperset(w: Workout, i: number): Workout {
  const g = w.exercises[i]?.group;
  if (g === undefined) return w;
  const strip = (e: WorkoutExercise): WorkoutExercise => { const { group: _g, ...rest } = e; return rest; };
  let ex = w.exercises.map((e, j) => (j === i ? strip(e) : e));
  if (ex.filter((e) => e.group === g).length < 2) ex = ex.map((e) => (e.group === g ? strip(e) : e));
  return { ...w, exercises: ex };
}
/** Rest after a set of exercise i? Not in the middle of a superset: go straight to the next exercise. */
export const restsAfter = (w: Workout, i: number) => { const g = w.exercises[i]?.group; return g === undefined || w.exercises[i + 1]?.group !== g; };

// ---- warm-ups and plates ----
const round = (n: number, step: number) => Math.round(n / step) * step;
/**
 * Warm-up sets building up to a working weight: the empty bar, then about 40 / 60 / 80 % for a barbell; about
 * 50 / 75 % for dumbbells, machines and cables. Nothing for bodyweight or timed exercises, or a very light weight.
 */
export function warmupsFor(ex: Exercise, top: number, u: WeightUnit = 'kg'): SetRow[] {
  if (isTimed(ex) || ex.metric === 'secs' || ex.weightType === 'bodyweight' || top <= 0) return [];
  const steps: [number, number][] = ex.weightType === 'barbell' ? [[0.4, 5], [0.6, 3], [0.8, 2]] : [[0.5, 8], [0.75, 4]];
  // Round in the person's unit, so warm-ups land on weights they can load: 2.5 kg / 5 lb, dumbbells 1 kg / 2.5 lb.
  const step = ex.weightType === 'dumbbell' ? (u === 'lb' ? 2.5 : 1) : u === 'lb' ? 5 : 2.5;
  const bar = BAR[u], t = fromKg(top, u);
  const out: SetRow[] = ex.weightType === 'barbell' && t > bar ? [{ w: bar, r: 10, kind: 'W' }] : [];
  for (const [pct, r] of steps) {
    const w = round(t * pct, step);
    if (w > (out.at(-1)?.w ?? 0) && w < t) out.push({ w, r, kind: 'W' });
  }
  return out.map((s) => ({ ...s, w: toKg(s.w, u) }));
}
/** Put warm-up sets in front of exercise i's sets, planned (you tick each one). Any earlier warm-ups are replaced. */
export const addWarmups = (w: Workout, i: number, sets: SetRow[]): Workout =>
  mapEx(w, i, (e) => ({ ...e, sets: [...sets.map((s) => ({ ...s, done: false as const, typed: true as const })), ...e.sets.filter((s) => s.kind !== 'W')] }));
export const PLATES = { kg: [25, 20, 15, 10, 5, 2.5, 1.25], lb: [45, 35, 25, 10, 5, 2.5] } as const;
/** The usual Olympic bar. */
export const BAR = { kg: 20, lb: 45 } as const;
/** Plates for each side of the bar, heaviest first; `left`: what they can't make up (an odd total). */
export function platesFor(total: number, bar = 20, have: readonly number[] = PLATES.kg): { side: number[]; left: number } {
  let rest = Math.max(0, (total - bar) / 2);
  const side: number[] = [];
  for (const p of have) while (rest >= p - 1e-9) { side.push(p); rest -= p; }
  return { side, left: Math.round(rest * 2 * 100) / 100 };
}
const asLogged = (sets: SetRow[], done: boolean) => (done ? sets.map(({ done: _d, typed: _t, ...s }) => s) : sets);
export function addExercises(w: Workout, v: View, ids: string[], done = false): Workout {
  const fresh = [...new Set(ids)].filter((id) => !w.exercises.some((e) => e.exerciseId === id));
  return { ...w, exercises: [...w.exercises, ...fresh.map((id) => ({ exerciseId: id, sets: asLogged(planSets(v, id, undefined, w.id), done) }))] };
}
export const replaceExercise = (w: Workout, v: View, i: number, id: string, done = false): Workout =>
  w.exercises.some((e) => e.exerciseId === id) ? w : mapEx(w, i, () => ({ exerciseId: id, sets: asLogged(planSets(v, id, undefined, w.id), done) }));
/** Move exercise `from` to position `to` (clamped), shifting the ones between. */
export function moveExercise(w: Workout, from: number, to: number): Workout {
  to = Math.max(0, Math.min(w.exercises.length - 1, to));
  if (from === to || from < 0 || from >= w.exercises.length) return w;
  const ex = [...w.exercises];
  ex.splice(to, 0, ...ex.splice(from, 1));
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
/** `minus`: a negative weight means something here (assistance on a bodyweight exercise); elsewhere it can't be below 0. */
/** `u`: the weight was typed in this unit (stored in kg). Leave it out for anything that isn't a weight (km, rounds). */
export function setValue(w: Workout, i: number, j: number, field: 'w' | 'r', raw: string, minus = false, u?: WeightUnit): Workout {
  const t = raw.trim().replace(',', '.');
  const n = field === 'w' ? toKg(parseFloat(t), u ?? 'kg') : parseInt(t, 10);
  const val = t === '' || !Number.isFinite(n) ? 0 : Math.max(field === 'w' && minus ? -MAX_W : 0, Math.min(field === 'w' ? MAX_W : MAX_R, n));
  return mapEx(w, i, (e) => ({ ...e, sets: e.sets.map((s, k) => (k !== j ? s : { ...s, [field]: val, ...(s.done === false ? { typed: true as const } : {}) })) }));
}
/** Set a timed set's duration from "30", "30:15" or "1:05:00" (blank: 0). `bareSecs`: a plain number is seconds (a pose hold), not minutes. */
export function setTime(w: Workout, i: number, j: number, raw: string, bareSecs = false): Workout {
  const secs = (bareSecs && /^\s*\d+\s*$/.test(raw) ? Math.min(MAX_R, Number(raw)) : parseClock(raw)) ?? 0;
  return mapEx(w, i, (e) => ({ ...e, sets: e.sets.map((s, k) => (k !== j ? s : { ...s, r: secs, ...(s.done === false ? { typed: true as const } : {}) })) }));
}
/** Tick (log it as shown) or untick a set. A set needs reps (or seconds) to be ticked; `roundsCount`: rounds alone will do (Surya Namaskar). */
export function toggleDone(w: Workout, i: number, j: number, roundsCount = false): { workout: Workout; ticked: boolean } {
  const s = w.exercises[i]?.sets[j];
  if (!s) return { workout: w, ticked: false };
  if (s.done !== false) return { workout: mapEx(w, i, (e) => ({ ...e, sets: e.sets.map((x, k) => (k === j ? { ...x, done: false, typed: true } : x)) })), ticked: false };
  if (s.r <= 0 && !(roundsCount && s.w > 0)) return { workout: w, ticked: false };
  const { done: _d, typed: _t, ...logged } = s;
  return { workout: mapEx(w, i, (e) => ({ ...e, sets: e.sets.map((x, k) => (k === j ? logged : x)) })), ticked: true };
}
/** How hard a set was (RPE), or none. */
export const setRpe = (w: Workout, i: number, j: number, rpe?: number): Workout =>
  mapEx(w, i, (e) => ({ ...e, sets: e.sets.map((s, k) => { if (k !== j) return s; const { rpe: _r, ...rest } = s; return rpe ? { ...rest, rpe } : rest; }) }));
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
/** Change units. A weight-suggestion step is in the old unit (2.5 kg isn't 2.5 lb), so it goes back to the default. */
export function withUnits(l: Log, units: NonNullable<Settings['units']>): Log {
  if ((l.settings.units?.weight ?? 'kg') === units.weight) return { ...l, settings: { ...l.settings, units } };
  return { ...l, settings: { ...l.settings, units },
    profiles: l.profiles.map((p) => (p.progression?.step ? { ...p, progression: p.progression.off ? { off: true as const } : {} } : p)) };
}
export const putProfile = (l: Log, id: string, patch: Partial<Omit<Profile, 'id' | 'createdAt'>>) =>
  ({ ...l, profiles: l.profiles.map((p) => {
    if (p.id !== id) return p;
    const next = { ...p, ...patch };
    for (const k of ['height', 'target', 'weighEvery', 'dob', 'gender', 'goal'] as const) if (next[k] === undefined) delete next[k];
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

const pad2 = (n: number) => String(n).padStart(2, '0');
/** "12091992" → "12/09/1992", slashes only once the next digit is there (so backspace just works). */
export const dobMask = (digits: string) => digits.slice(0, 2) + (digits.length > 2 ? `/${digits.slice(2, 4)}` : '') + (digits.length > 4 ? `/${digits.slice(4, 8)}` : '');
/** DD/MM/YYYY → ISO day, or why not: '' while incomplete. */
export function dobParse(text: string, min: string, max: string): { day?: string; error?: string } {
  const [d, m, y] = text.split('/').map(Number);
  if (text.length < 10) return {};
  const t = new Date(Date.UTC(y, m - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) return { error: 'That isn’t a real date.' };
  const day = `${y}-${pad2(m)}-${pad2(d)}`;
  if (day < min || day > max) return { error: `Pick a year from ${min.slice(0, 4)} to ${max.slice(0, 4)}.` };
  return { day };
}
