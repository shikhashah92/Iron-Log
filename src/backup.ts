// Pure backup logic (no platform I/O) so it can be unit tested with node --test.
import {
  isRealDay, MAX_R, MAX_W, MEASURES, MUSCLES, SCHEMA_VERSION, WEIGHT_TYPES, timeOfDayName,
  type ChallengeDef, type CustomExercise, type Images, type Log, type Muscle, type Muscles, type SetRow, type Template, type WeighIn, type Workout,
} from './model.ts';
import { BUILT_IN } from './exercises.ts';
import { STRONG_BUILT_IN } from './strong.ts';

export const BACKUP_APP = 'uplift';
/** Backups made before the rename (Uplift) still restore. */
const BACKUP_APPS = new Set([BACKUP_APP, 'ironlog']);
export const MAX_IMPORT_BYTES = 60 * 1024 * 1024;

/** Compact form used for on-device storage; parseBackup reads both. Photos are stored separately. */
export const serialize = (l: Log) => JSON.stringify({ app: BACKUP_APP, ...l });

export function toBackupJSON(l: Log, images: Images): string {
  return JSON.stringify({ app: BACKUP_APP, exportedAt: new Date().toISOString(), ...l, images });
}

const isStr = (v: unknown, max = 200): v is string => typeof v === 'string' && v.length <= max;
const isName = (v: unknown, max = 80): v is string => isStr(v, max) && v.trim().length > 0;
const isId = (v: unknown): v is string => isStr(v, 100) && v.length > 0;
const isTime = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;
const isKg = (v: unknown): v is number => Number.isFinite(v) && (v as number) >= 20 && (v as number) <= 400;
const time = (v: unknown) => (isTime(v) ? v : 0);
const muscleList = (v: unknown): Muscle[] => (Array.isArray(v) ? [...new Set(v.filter((k): k is Muscle => typeof k === 'string' && Object.hasOwn(MUSCLES, k)))] : []);
/** An exercise's muscles, keeping only names the map knows; none left means it's guessed again. */
function musclesIn(v: any): Muscles | undefined {
  const main = muscleList(v?.main);
  return main.length ? { main, help: muscleList(v?.help).filter((k) => !main.includes(k)) } : undefined;
}
const lines = (v: unknown) => (Array.isArray(v) ? v.filter((x) => isStr(x, 500)).slice(0, 30) : []);
const TYPES = new Set(WEIGHT_TYPES.map((t) => t.id));
const isPhoto = (v: unknown): v is string => isStr(v, 2_000_000) && /^data:image\/(jpeg|png|gif|webp);base64,/.test(v);

/**
 * Validate an untrusted backup (or our own stored copy) and return clean data (only known fields copied).
 * Throws Error with a human-readable message on the first problem found.
 */
export function parseBackup(text: string): { log: Log; images: Images } {
  if (text.length > MAX_IMPORT_BYTES) throw new Error('File is too large to be an Uplift backup.');
  let raw: any;
  try { raw = JSON.parse(text); } catch { throw new Error('This file is not valid JSON.'); }
  if (!raw || typeof raw !== 'object' || !BACKUP_APPS.has(raw.app)) throw new Error('This is not an Uplift backup file.');
  if (!Number.isInteger(raw.schemaVersion) || raw.schemaVersion < 1) throw new Error('Unknown backup version.');
  if (raw.schemaVersion > SCHEMA_VERSION) throw new Error('This backup is from a newer version of the app. Please update the app first.');
  if (raw.schemaVersion === 1) raw = fromV1(raw);
  if (raw.schemaVersion === 2) raw = fromV2(raw);
  if (raw.schemaVersion === 3) raw = fromV3(raw);
  const fail = (what: string, i: number): never => { throw new Error(`Backup is damaged: ${what} #${i + 1} is invalid.`); };
  for (const k of ['profiles', 'exercises', 'favorites', 'templates', 'workouts', 'weighIns'] as const)
    if (!Array.isArray(raw[k])) throw new Error(`Backup is damaged: missing ${k}.`);

  const seen = new Set<string>();
  const unique = (key: string, what: string, i: number) => { if (seen.has(key)) fail(what, i); seen.add(key); };

  const profiles = raw.profiles.map((p: any, i: number) => {
    if (!isId(p?.id) || !isName(p.name, 40)) fail('profile', i);
    unique(`p:${p.id}`, 'profile', i);
    const bw = Number.isFinite(p.bodyweight) && p.bodyweight >= 0 && p.bodyweight <= 500 ? p.bodyweight : 0;
    const t = p.target;
    const target = t && isKg(t.weight) && isKg(t.startWeight) && isRealDay(t.date) && isRealDay(t.startDate) && t.date > t.startDate
      ? { weight: t.weight, date: t.date, startWeight: t.startWeight, startDate: t.startDate } : undefined;
    return { id: p.id, name: p.name, bodyweight: bw, createdAt: time(p.createdAt),
      ...(Number.isFinite(p.height) && p.height >= 50 && p.height <= 272 ? { height: p.height } : {}),
      ...(target ? { target } : {}),
      ...(['daily', '3x', 'weekly', 'off'].includes(p.weighEvery) ? { weighEvery: p.weighEvery } : {}),
      ...(isRealDay(p.dob) ? { dob: p.dob } : {}),
      ...(['female', 'male', 'other'].includes(p.gender) ? { gender: p.gender } : {}),
      ...(['lose', 'muscle', 'strength', 'fit'].includes(p.goal) ? { goal: p.goal } : {}),
      ...(Number.isInteger(p.weeklyGoal) && p.weeklyGoal >= 1 && p.weeklyGoal <= 7 ? { weeklyGoal: p.weeklyGoal } : {}),
      ...(Array.isArray(p.trainDays) && p.trainDays.length <= 7 && p.trainDays.every((d: unknown) => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6)
        ? { trainDays: [...new Set<number>(p.trainDays)].sort() } : {}),
      ...(typeof p.trainTime === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(p.trainTime) ? { trainTime: p.trainTime } : {}),
      ...(p.progression && typeof p.progression === 'object' ? { progression: {
        ...(p.progression.off === true ? { off: true as const } : {}),
        ...(Number.isFinite(p.progression.step) && p.progression.step > 0 && p.progression.step <= 20 ? { step: p.progression.step } : {}) } } : {}),
      ...(Array.isArray(p.challenges) ? { challenges: p.challenges.slice(0, 50).flatMap((c: any) => {
        if (!isId(c?.id) || !isRealDay(c.start)) return [];
        const def = c.def === undefined ? undefined : challengeDef(c.def);
        return c.def !== undefined && !def ? [] : [{ id: c.id, start: c.start, ...(def ? { def } : {}) }];
      }) } : {}) };
  });
  if (!profiles.length) throw new Error('Backup is damaged: it has no profiles.');
  const pids = new Set<string>(profiles.map((p: any) => p.id));
  const owned = (x: any) => pids.has(x?.profileId);

  // A repeated exercise id (older Strong imports made them) keeps the first: refusing would lock the person out of everything.
  const exercises: CustomExercise[] = raw.exercises.filter((e: any) => !seen.has(`e:${e?.profileId}:${e?.id}`) && seen.add(`e:${e?.profileId}:${e?.id}`)).map((e: any, i: number) => {
    if (!owned(e) || !isId(e.id) || !isName(e.name) || !isStr(e.group, 40) || !isStr(e.equip ?? '', 60) || !TYPES.has(e.weightType)) fail('exercise', i);
    return { id: e.id, profileId: e.profileId, name: e.name, group: e.group || 'Other', equip: e.equip ?? '', weightType: e.weightType,
      ...(e.metric === 'secs' ? { metric: 'secs' as const } : {}), ...(['cardio', 'activity', 'yoga'].includes(e.kind) ? { kind: e.kind } : {}),
      ...(e.kind === 'yoga' ? { yoga: ['hold', 'rounds', 'time'].includes(e.yoga) ? e.yoga : 'hold' } : {}),
      ...(musclesIn(e.muscles) ? { muscles: musclesIn(e.muscles) } : {}),
      setup: lines(e.setup), exec: lines(e.exec), avoid: lines(e.avoid), updatedAt: time(e.updatedAt) };
  });
  const favorites = raw.favorites.map((f: any, i: number) => {
    if (!owned(f) || !isId(f.exerciseId)) fail('favorite', i);
    unique(`f:${f.profileId}:${f.exerciseId}`, 'favorite', i);
    return { profileId: f.profileId, exerciseId: f.exerciseId, at: time(f.at) };
  });
  const templates: Template[] = raw.templates.map((t: any, i: number) => {
    if (!owned(t) || !isId(t.id) || !isName(t.name, 60) || !Array.isArray(t.exercises)) fail('template', i);
    unique(`t:${t.profileId}:${t.id}`, 'template', i);
    return { id: t.id, profileId: t.profileId, name: t.name, exercises: planOf(t.exercises), updatedAt: time(t.updatedAt) };
  });
  const isSet = (x: any) => Number.isFinite(x?.w) && Math.abs(x.w) <= MAX_W && Number.isInteger(x.r) && x.r >= 0 && x.r <= MAX_R;
  const activeOf = new Map<string, number>(); // newest active workout per person: only one can be in progress
  const workouts: Workout[] = raw.workouts.map((w: any, i: number) => {
    const okEx = Array.isArray(w?.exercises) && w.exercises.length <= 200 && w.exercises.every((e: any) =>
      isId(e?.exerciseId) && Array.isArray(e.sets) && e.sets.length <= 200 && e.sets.every(isSet));
    if (!owned(w) || !isId(w.id) || !isRealDay(w.date) || !isName(w.name, 60) || !isTime(w.startedAt) || !okEx) fail('workout', i);
    unique(`w:${w.profileId}:${w.id}`, 'workout', i);
    if (w.active === true && w.startedAt >= (activeOf.get(w.profileId) ?? -1)) activeOf.set(w.profileId, w.startedAt);
    return w;
  }).map((w: any): Workout => {
    const active = w.active === true && activeOf.get(w.profileId) === w.startedAt;
    const set = (x: any): SetRow => ({ w: x.w, r: x.r,
      ...(active && x.done === false ? { done: false as const, ...(x.typed === true ? { typed: true as const } : {}) } : {}),
      ...(x.kind === 'W' || x.kind === 'D' ? { kind: x.kind } : {}), ...(isRpe(x.rpe) ? { rpe: x.rpe } : {}) });
    const exercises = w.exercises.map((e: any) => ({ exerciseId: e.exerciseId,
      sets: (active ? e.sets : e.sets.filter((x: any) => x.done !== false)).map(set),
      ...(isName(e.note, 300) ? { note: e.note } : {}), ...(isGroup(e.group) ? { group: e.group } : {}) }))
      .filter((e: any) => active || e.sets.length);
    const out: Workout = { id: w.id, profileId: w.profileId, date: w.date, name: w.name, startedAt: w.startedAt, exercises, updatedAt: time(w.updatedAt) };
    if (active) out.active = true;
    if (isTime(w.endedAt) && w.endedAt >= w.startedAt) out.endedAt = w.endedAt;
    if (isName(w.feeling, 30)) out.feeling = w.feeling;
    if (isName(w.note, 1000)) out.note = w.note;
    if (isId(w.templateId)) out.templateId = w.templateId;
    if (Array.isArray(w.planned)) out.planned = planOf(w.planned);
    if (w.source === 'strong') out.source = 'strong';
    return out;
  }).filter((w: Workout) => w.active || w.exercises.length);

  const cm = (v: unknown) => Number.isFinite(v) && (v as number) > 0 && (v as number) <= 300;
  const weighIns: WeighIn[] = raw.weighIns.map((w: any, i: number) => {
    if (!owned(w) || !isId(w.id) || !isRealDay(w.date) || !isKg(w.weight)) fail('weigh-in', i);
    unique(`b:${w.profileId}:${w.id}`, 'weigh-in', i);
    const out: WeighIn = { id: w.id, profileId: w.profileId, date: w.date, weight: w.weight, at: time(w.at) };
    if (Number.isFinite(w.fat) && w.fat > 0 && w.fat < 80) out.fat = w.fat;
    for (const k of MEASURES.map((m) => m.id)) if (cm(w[k])) out[k] = w[k];
    if (w.photo === true) out.photo = true;
    return out;
  });

  const s = raw.settings ?? {};
  const log: Log = {
    schemaVersion: SCHEMA_VERSION, profiles, exercises, favorites, templates, workouts, weighIns,
    settings: {
      theme: ['system', 'light', 'dark'].includes(s.theme) ? s.theme : 'system',
      restSecs: Number.isInteger(s.restSecs) && s.restSecs >= 0 && s.restSecs <= 600 ? s.restSecs : 90,
      currentProfileId: pids.has(s.currentProfileId) ? s.currentProfileId : profiles[0].id,
      ...(isTime(s.lastBackupAt) ? { lastBackupAt: s.lastBackupAt } : {}),
      ...(s.backupChoice === 'file' || s.backupChoice === 'local' ? { backupChoice: s.backupChoice } : {}),
      ...(s.setupPending === true ? { setupPending: true as const } : {}),
      ...(isRealDay(s.recapSeen) ? { recapSeen: s.recapSeen } : {}),
      ...(typeof s.wrappedSeen === 'string' && /^\d{4}-\d{2}$/.test(s.wrappedSeen) ? { wrappedSeen: s.wrappedSeen } : {}),
      ...(s.units && ['kg', 'lb'].includes(s.units.weight) && ['cm', 'in'].includes(s.units.length) ? { units: { weight: s.units.weight, length: s.units.length } } : {}),
    },
  };
  return { log, images: parseImages(raw.images, pids) };
}

/** A template's (or a workout's planned) exercises: bad or repeated entries are dropped. */
/** A challenge's terms, from a backup or a friend's link: everything checked, anything odd refused (null). */
export function challengeDef(v: any): ChallengeDef | null {
  const kinds = ['days', 'daily', 'total', 'best', 'workouts'];
  if (!v || typeof v !== 'object' || !isName(v.name, 60) || !kinds.includes(v.kind)) return null;
  if (!Number.isFinite(v.target) || v.target <= 0 || v.target > 100_000 || !Number.isInteger(v.days) || v.days < 1 || v.days > 366) return null;
  if (v.kind !== 'workouts' && !BUILT_IN.some((e) => e.id === v.exerciseId)) return null; // links only name built-in exercises
  if (v.kind === 'daily' && !(Number.isFinite(v.perDay) && v.perDay > 0 && v.perDay <= 100_000)) return null;
  return { name: v.name.trim(), kind: v.kind, target: v.target, days: v.days,
    ...(v.kind !== 'workouts' ? { exerciseId: v.exerciseId } : {}), ...(v.kind === 'daily' ? { perDay: v.perDay } : {}),
    ...(isName(v.from, 40) ? { from: v.from.trim() } : {}) };
}
const isGroup = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 200;
const isRpe = (v: unknown): v is number => Number.isFinite(v) && (v as number) >= 1 && (v as number) <= 10;

function planOf(v: unknown): { exerciseId: string; sets?: number; group?: number }[] {
  const seen = new Set<string>();
  return (Array.isArray(v) ? v : []).filter((x: any) => isId(x?.exerciseId) && !seen.has(x.exerciseId) && seen.add(x.exerciseId)).slice(0, 200)
    .map((x: any) => ({ exerciseId: x.exerciseId, ...(Number.isInteger(x.sets) && x.sets >= 1 && x.sets <= 50 ? { sets: x.sets } : {}), ...(isGroup(x.group) ? { group: x.group } : {}) }));
}

/**
 * Version 1 kept one "session" and per-exercise "entries" per person per day. Each such day becomes one finished
 * workout; the result is then validated like any version 2 file. Planned-but-empty days are dropped.
 */
function fromV1(raw: any): any {
  const days = new Map<string, { s?: any; es: any[] }>();
  const key = (x: any) => `${x?.profileId}|${x?.date}`;
  for (const s of Array.isArray(raw.sessions) ? raw.sessions : []) days.set(key(s), { ...(days.get(key(s)) ?? { es: [] }), s });
  for (const e of Array.isArray(raw.entries) ? raw.entries : []) { const d = days.get(key(e)) ?? { es: [] }; d.es.push(e); days.set(key(e), d); }
  const workouts = [...days.values()].map(({ s, es }) => {
    const x = s ?? es[0];
    const withSets = es.filter((e) => Array.isArray(e?.sets) && e.sets.length);
    const order = [...(Array.isArray(s?.exerciseIds) ? s.exerciseIds : []), ...withSets.map((e) => e.exerciseId)];
    const exercises = [...new Set(order)].map((id) => withSets.find((e) => e.exerciseId === id)).filter(Boolean)
      .map((e) => ({ exerciseId: e.exerciseId, sets: e.sets }));
    const times = withSets.map((e) => e.updatedAt).filter(isTime);
    const startedAt = isTime(s?.startedAt) ? s.startedAt : times.length ? Math.min(...times) : new Date(`${x?.date}T12:00:00`).getTime() || 0;
    return { id: `w_${String(x?.date).replace(/-/g, '')}_${x?.profileId}`, profileId: x?.profileId, date: x?.date,
      name: isTime(s?.startedAt) ? timeOfDayName(s.startedAt) : 'Workout', startedAt, endedAt: s?.endedAt, feeling: s?.feeling, exercises,
      updatedAt: Math.max(0, ...times, isTime(s?.updatedAt) ? s.updatedAt : 0) };
  }).filter((w) => w.exercises.length);
  const templates = (Array.isArray(raw.templates) ? raw.templates : [])
    .map((t: any) => ({ ...t, exercises: (Array.isArray(t?.exerciseIds) ? t.exerciseIds : []).map((id: unknown) => ({ exerciseId: id })) }));
  return { ...raw, schemaVersion: 2, templates, workouts };
}

/**
 * Version 3 added weigh-ins and built-in cardio / activities. Strong imports made before that turned cardio into custom
 * exercises ("Running (Treadmill)" as seconds): those move to the matching built-in (time kept; activities get
 * moderate intensity), and the custom copies go.
 */
function fromV2(raw: any): any {
  const lib = new Map(BUILT_IN.map((e) => [e.id, e]));
  const to = new Map<string, string>(); // `${profileId}|${custom id}` → built-in id
  for (const e of Array.isArray(raw.exercises) ? raw.exercises : []) {
    const b = typeof e?.id === 'string' && e.id.startsWith('u_strong_') ? STRONG_BUILT_IN[String(e.name ?? '').toLowerCase()] : undefined;
    if (b && lib.get(b)?.kind) to.set(`${e.profileId}|${e.id}`, b);
  }
  const map = (pid: unknown, id: unknown) => to.get(`${pid}|${id}`) ?? id;
  const workouts = (Array.isArray(raw.workouts) ? raw.workouts : []).map((w: any) => !Array.isArray(w?.exercises) ? w : {
    ...w, exercises: w.exercises.map((e: any) => {
      const id = map(w.profileId, e?.exerciseId);
      if (id === e?.exerciseId) return e;
      const activity = lib.get(id as string)?.kind === 'activity';
      return { ...e, exerciseId: id, sets: Array.isArray(e.sets) ? e.sets.map((s: any) => (activity ? { ...s, w: 2 } : { ...s, w: 0 })) : e.sets };
    }),
  });
  const templates = (Array.isArray(raw.templates) ? raw.templates : []).map((t: any) => !Array.isArray(t?.exercises) ? t :
    { ...t, exercises: t.exercises.map((e: any) => ({ ...e, exerciseId: map(t.profileId, e?.exerciseId) })) });
  const favorites = (Array.isArray(raw.favorites) ? raw.favorites : []).map((f: any) => ({ ...f, exerciseId: map(f?.profileId, f?.exerciseId) }))
    .filter((f: any, i: number, all: any[]) => all.findIndex((g) => g.profileId === f.profileId && g.exerciseId === f.exerciseId) === i);
  const exercises = (Array.isArray(raw.exercises) ? raw.exercises : []).filter((e: any) => !to.has(`${e?.profileId}|${e?.id}`));
  return { ...raw, schemaVersion: 3, exercises, workouts, templates, favorites, weighIns: [] };
}

/**
 * Version 4 added yoga asanas and pranayama. The four yoga styles (Hatha, Vinyasa, Power, Yin) were whole classes, not
 * poses: they become one "Yoga class" (intensity kept), merged within a workout, template or favorites.
 */
const OLD_YOGA = new Set(['hatha-yoga', 'vinyasa-yoga', 'power-yoga', 'yin-yoga']);
function fromV3(raw: any): any {
  const to = (id: unknown) => (OLD_YOGA.has(id as string) ? 'yoga-class' : id);
  const merged = (list: any[], sets: boolean) => list.reduce((out: any[], e: any) => {
    const id = to(e?.exerciseId), same = out.find((x) => x.exerciseId === id);
    if (same && sets && Array.isArray(same.sets) && Array.isArray(e.sets)) same.sets = [...same.sets, ...e.sets];
    else if (!same) out.push({ ...e, exerciseId: id });
    return out;
  }, []);
  const workouts = (Array.isArray(raw.workouts) ? raw.workouts : []).map((w: any) => (Array.isArray(w?.exercises)
    ? { ...w, exercises: merged(w.exercises, true), ...(Array.isArray(w.planned) ? { planned: merged(w.planned, false) } : {}) } : w));
  const templates = (Array.isArray(raw.templates) ? raw.templates : []).map((t: any) => (Array.isArray(t?.exercises) ? { ...t, exercises: merged(t.exercises, false) } : t));
  const favorites = (Array.isArray(raw.favorites) ? raw.favorites : []).map((f: any) => ({ ...f, exerciseId: to(f?.exerciseId) }))
    .filter((f: any, i: number, all: any[]) => all.findIndex((g) => g.profileId === f.profileId && g.exerciseId === f.exerciseId) === i);
  return { ...raw, schemaVersion: 4, workouts, templates, favorites };
}

/** Photos are optional: a bad one is dropped rather than failing the whole backup. */
export function parseImages(v: unknown, pids?: Set<string>): Images {
  const out: Images = {};
  if (!v || typeof v !== 'object') return out;
  for (const [k, uri] of Object.entries(v)) {
    const [pid, ...rest] = k.split(':');
    if (rest.length && isPhoto(uri) && (!pids || pids.has(pid))) out[k] = uri;
  }
  return out;
}


/** Escape one CSV cell; neutralise spreadsheet formula injection (=, +, -, @, tab, CR). */
export function csvCell(v: string | number): string {
  let s = String(v);
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** One row per logged set, for spreadsheets. */
export function toCSV(l: Log, exName: (profileId: string, exerciseId: string) => string): string {
  const who = new Map(l.profiles.map((p) => [p.id, p.name]));
  const head = ['Date', 'Workout', 'Person', 'Exercise', 'Set', 'Weight (kg)', 'Reps / seconds', 'Type'];
  const rows = [...l.workouts].sort((a, b) => a.startedAt - b.startedAt).flatMap((w) => w.exercises.flatMap((e) =>
    e.sets.filter((s) => s.done !== false).map((s, i) =>
      [w.date, w.name, who.get(w.profileId) ?? '', exName(w.profileId, e.exerciseId), i + 1, s.w, s.r, s.kind === 'W' ? 'Warm-up' : s.kind === 'D' ? 'Drop' : '']
        .map(csvCell).join(','))));
  return [head.join(','), ...rows].join('\r\n') + '\r\n';
}

/** Newest first, capped: the undo history never grows without bound. */
export function pushSnapshot<T>(list: T[], snap: T, max = 10): T[] {
  return [snap, ...list].slice(0, max);
}
