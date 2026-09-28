// The data model and every change to it, as pure functions (no I/O), so it can be unit tested with node --test.
import { BUILT_IN } from './exercises.ts';

export const SCHEMA_VERSION = 1;
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

export interface Exercise {
  id: string; name: string; group: string; equip: string; weightType: WeightType; metric?: 'secs';
  setup: string[]; exec: string[]; avoid: string[];
}
export interface CustomExercise extends Exercise { profileId: string; updatedAt: number }
export interface Profile { id: string; name: string; bodyweight: number; createdAt: number }
/** One set: weight (kg, may be negative for assisted bodyweight) and reps (or seconds for holds). */
export interface SetRow { w: number; r: number }
/** Everything one person did on one exercise on one day. */
export interface Entry { profileId: string; date: string; exerciseId: string; sets: SetRow[]; updatedAt: number }
/** One person's workout on one day: the exercises planned and the optional timer / feeling. */
export interface Session {
  profileId: string; date: string; exerciseIds: string[]; startedAt?: number; endedAt?: number; feeling?: string; updatedAt: number;
}
export interface Template { id: string; profileId: string; name: string; exerciseIds: string[]; updatedAt: number }
export interface Favorite { profileId: string; exerciseId: string; at: number }
export interface Settings {
  theme: Theme; restSecs: number; currentProfileId: string;
  lastBackupAt?: number;
  /** What the person chose on first run: back up to a file, or keep everything on this device only. */
  backupChoice?: 'file' | 'local';
}
export interface Log {
  schemaVersion: number; profiles: Profile[]; exercises: CustomExercise[]; favorites: Favorite[];
  templates: Template[]; sessions: Session[]; entries: Entry[]; settings: Settings;
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
export const longDate = (day: string) =>
  new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
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
    schemaVersion: SCHEMA_VERSION, profiles: [p], exercises: [], favorites: [], templates: [], sessions: [], entries: [],
    settings: { theme: 'system', restSecs: 90, currentProfileId: p.id },
  };
}

// ---- reading one person's data ----
/** The current person's slice of the log. Every screen works on this, so profiles never mix. */
export interface View {
  profile: Profile; exercises: CustomExercise[]; favorites: Favorite[]; templates: Template[];
  sessions: Map<string, Session>; entries: Entry[];
}
export function viewOf(l: Log): View {
  const pid = l.settings.currentProfileId;
  const mine = <T extends { profileId: string }>(xs: T[]) => xs.filter((x) => x.profileId === pid);
  return {
    profile: l.profiles.find((p) => p.id === pid) ?? l.profiles[0],
    exercises: mine(l.exercises), favorites: mine(l.favorites).sort((a, b) => b.at - a.at), templates: mine(l.templates),
    sessions: new Map(mine(l.sessions).map((s) => [s.date, s])), entries: mine(l.entries),
  };
}

const builtInById = new Map(BUILT_IN.map((e) => [e.id, e]));
/** Built-in exercises ship with drawings (public/illustrations/<id>/1-3.svg); custom ones don't. */
export const isBuiltIn = (id: string) => builtInById.has(id);
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
export const entryOf = (v: View, date: string, exerciseId: string) => v.entries.find((e) => e.date === date && e.exerciseId === exerciseId);

/** Oldest first; only days that have at least one set. */
export const historyOf = (v: View, exerciseId: string) =>
  v.entries.filter((e) => e.exerciseId === exerciseId && e.sets.length).sort((a, b) => (a.date < b.date ? -1 : 1));
export function lastEntry(v: View, exerciseId: string, before?: string): Entry | null {
  const h = historyOf(v, exerciseId).filter((e) => !before || e.date < before);
  return h[h.length - 1] ?? null;
}
export const bestSet = (sets: SetRow[]) => [...sets].sort((a, b) => b.w - a.w || b.r - a.r)[0];
export const prOf = (v: View, exerciseId: string) =>
  historyOf(v, exerciseId).reduce((m, e) => Math.max(m, ...e.sets.map((s) => s.w)), 0);
const load = (s: SetRow, ex: Exercise, bw: number) => (ex.weightType === 'bodyweight' ? (bw > 0 ? bw + s.w : s.w) : s.w);
export const topLoad = (e: Entry, ex: Exercise, bw: number) => e.sets.reduce((m, s) => Math.max(m, load(s, ex, bw)), 0);
export function volumeOf(e: Entry, ex: Exercise, bw: number): number {
  if (ex.metric === 'secs') return 0;
  return e.sets.reduce((t, s) => t + Math.max(0, load(s, ex, bw)) * s.r * (ex.weightType === 'dumbbell' ? 2 : 1), 0);
}
/** Epley estimate of the best one-rep max across these days. */
export const estOneRM = (entries: Entry[], ex: Exercise, bw: number) =>
  entries.reduce((m, e) => Math.max(m, ...e.sets.map((s) => load(s, ex, bw) * (1 + s.r / 30))), 0);
export function fmtSet(s: SetRow, ex: Exercise): string {
  const rep = ex.metric === 'secs' ? `${s.r}s` : String(s.r);
  if (ex.weightType === 'bodyweight') return s.w ? `BW${s.w > 0 ? '+' : ''}${num(s.w)}×${rep}` : `BW×${rep}`;
  if (!s.w) return ex.metric === 'secs' ? rep : `${rep} reps`;
  return `${num(s.w)}${ex.weightType === 'dumbbell' ? '/DB' : ''}×${rep}`;
}
/** Today's exercises, in the order they were added: planned ones first, then anything with sets. */
export function workoutExIds(v: View, date: string): string[] {
  const ids = [...(v.sessions.get(date)?.exerciseIds ?? []), ...v.entries.filter((e) => e.date === date && e.sets.length).map((e) => e.exerciseId)];
  return [...new Set(ids)];
}
/** Exercises by most recent use (newest first). */
export function recentExIds(v: View): string[] {
  const last = new Map<string, string>();
  for (const e of v.entries) if (e.sets.length && (last.get(e.exerciseId) ?? '') < e.date) last.set(e.exerciseId, e.date);
  return [...last.keys()].sort((a, b) => (last.get(b)! < last.get(a)! ? -1 : 1));
}
export function weekStats(v: View, date: string) {
  const since = addDays(date, -6);
  const days = new Set<string>();
  let sets = 0, volume = 0;
  for (const e of v.entries) {
    if (e.date < since || e.date > date || !e.sets.length) continue;
    days.add(e.date);
    sets += e.sets.length;
    volume += volumeOf(e, getEx(v, e.exerciseId), v.profile.bodyweight);
  }
  return { sessions: days.size, sets, volume };
}

/** Nudge when work is at risk: something changed since the last backup, and that was over a week ago. */
export function needsBackupNudge(l: Log, now = Date.now(), days = 7): boolean {
  const last = l.settings.lastBackupAt ?? 0;
  const changed = l.entries.filter((e) => e.updatedAt > last);
  if (!changed.length) return false;
  const since = last || Math.min(...changed.map((e) => e.updatedAt));
  return now - since > days * 86400_000;
}

// ---- changes (all return a new Log for the current person) ----
const pidOf = (l: Log) => l.settings.currentProfileId;
const sameEntry = (pid: string, date: string, exId: string) => (e: Entry) => e.profileId === pid && e.date === date && e.exerciseId === exId;

function putSession(l: Log, date: string, fn: (s: Session) => Session, now: number): Log {
  const pid = pidOf(l);
  const cur = l.sessions.find((s) => s.profileId === pid && s.date === date) ?? { profileId: pid, date, exerciseIds: [], updatedAt: now };
  const next = { ...fn(cur), updatedAt: now };
  return { ...l, sessions: [...l.sessions.filter((s) => s !== cur), next] };
}
function putEntry(l: Log, date: string, exId: string, fn: (sets: SetRow[]) => SetRow[], now: number): Log {
  const pid = pidOf(l);
  const match = sameEntry(pid, date, exId);
  const cur = l.entries.find(match);
  const sets = fn(cur?.sets ?? []);
  const rest = l.entries.filter((e) => !match(e));
  return { ...l, entries: sets.length ? [...rest, { profileId: pid, date, exerciseId: exId, sets, updatedAt: now }] : rest };
}

export const addToWorkout = (l: Log, exId: string, date = today(), now = Date.now()) =>
  putSession(l, date, (s) => (s.exerciseIds.includes(exId) ? s : { ...s, exerciseIds: [...s.exerciseIds, exId] }), now);
export function removeFromWorkout(l: Log, exId: string, date = today(), now = Date.now()): Log {
  const next = putSession(l, date, (s) => ({ ...s, exerciseIds: s.exerciseIds.filter((x) => x !== exId) }), now);
  return putEntry(next, date, exId, () => [], now);
}
export const startWorkout = (l: Log, date = today(), now = Date.now()) =>
  putSession(l, date, ({ endedAt: _e, feeling: _f, ...s }) => ({ ...s, startedAt: now }), now);
export const endWorkout = (l: Log, feeling: string, date = today(), now = Date.now()) =>
  putSession(l, date, ({ feeling: _f, ...s }) => ({ ...s, startedAt: s.startedAt ?? now, endedAt: now, ...(feeling ? { feeling } : {}) }), now);

/** A set was logged: the exercise is in today's workout, and the workout clock starts if it hadn't (no "Start" needed). */
const logged = (l: Log, exId: string, date: string, now: number) =>
  putSession(l, date, (s) => ({ ...s, exerciseIds: s.exerciseIds.includes(exId) ? s.exerciseIds : [...s.exerciseIds, exId], startedAt: s.startedAt ?? now }), now);

/** Add a set, pre-filled from the previous set today, or else the last set of the last session. */
export function addSet(l: Log, exId: string, date = today(), now = Date.now(), set?: SetRow): Log {
  const v = viewOf(l);
  const prev = entryOf(v, date, exId)?.sets.at(-1) ?? lastEntry(v, exId, date)?.sets.at(-1);
  const row = set ?? { w: prev?.w ?? 0, r: prev?.r ?? 0 };
  return logged(putEntry(l, date, exId, (sets) => [...sets, row], now), exId, date, now);
}
export function updateSet(l: Log, exId: string, i: number, field: 'w' | 'r', raw: string, date = today(), now = Date.now()): Log {
  const t = raw.trim().replace(',', '.');
  const n = field === 'w' ? parseFloat(t) : parseInt(t, 10);
  const val = t === '' || !Number.isFinite(n) ? 0 : Math.max(field === 'w' ? -MAX_W : 0, Math.min(field === 'w' ? MAX_W : MAX_R, n));
  return putEntry(l, date, exId, (sets) => sets.map((s, j) => (j === i ? { ...s, [field]: val } : s)), now);
}
export const delSet = (l: Log, exId: string, i: number, date = today(), now = Date.now()) =>
  putEntry(l, date, exId, (sets) => sets.filter((_, j) => j !== i), now);
/** Copy every set from the last time this exercise was done. */
export function repeatLast(l: Log, exId: string, date = today(), now = Date.now()): Log {
  const prev = lastEntry(viewOf(l), exId, date);
  if (!prev) return l;
  return logged(putEntry(l, date, exId, (sets) => [...sets, ...prev.sets.map((s) => ({ ...s }))], now), exId, date, now);
}

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

export function putTemplate(l: Log, t: { id: string; name: string; exerciseIds: string[] }, now = Date.now()): Log {
  const pid = pidOf(l);
  return { ...l, templates: [...l.templates.filter((x) => !(x.profileId === pid && x.id === t.id)), { ...t, profileId: pid, updatedAt: now }] };
}
export const delTemplate = (l: Log, id: string) => ({ ...l, templates: l.templates.filter((t) => !(t.profileId === pidOf(l) && t.id === id)) });
export const startTemplate = (l: Log, exerciseIds: string[], date = today(), now = Date.now()) =>
  exerciseIds.reduce((acc, id) => addToWorkout(acc, id, date, now), l);

export function addProfile(l: Log, name: string, now = Date.now()): Log {
  const p: Profile = { id: newId('p'), name, bodyweight: 0, createdAt: now };
  return { ...l, profiles: [...l.profiles, p], settings: { ...l.settings, currentProfileId: p.id } };
}
export const putProfile = (l: Log, id: string, patch: Partial<Pick<Profile, 'name' | 'bodyweight'>>) =>
  ({ ...l, profiles: l.profiles.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
export const switchProfile = (l: Log, id: string) => ({ ...l, settings: { ...l.settings, currentProfileId: id } });
/** Removes the person and everything of theirs. There is always at least one profile. */
export function delProfile(l: Log, id: string): Log {
  if (l.profiles.length <= 1) return l;
  const keep = <T extends { profileId: string }>(xs: T[]) => xs.filter((x) => x.profileId !== id);
  const profiles = l.profiles.filter((p) => p.id !== id);
  return {
    ...l, profiles, exercises: keep(l.exercises), favorites: keep(l.favorites), templates: keep(l.templates),
    sessions: keep(l.sessions), entries: keep(l.entries),
    settings: { ...l.settings, currentProfileId: l.settings.currentProfileId === id ? profiles[0].id : l.settings.currentProfileId },
  };
}

export const MAX_W = 2000, MAX_R = 100_000;
