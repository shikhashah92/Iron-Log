// Pure backup logic (no platform I/O) so it can be unit tested with node --test.
import {
  isRealDay, MAX_R, MAX_W, MEASURES, SCHEMA_VERSION, WEIGHT_TYPES, imgKey, timeOfDayName,
  type CustomExercise, type Images, type Log, type SetRow, type Template, type WeighIn, type Workout,
} from './model.ts';
import { BUILT_IN } from './exercises.ts';
import { STRONG_BUILT_IN } from './strong.ts';

export const BACKUP_APP = 'ironlog';
export const LEGACY_APP = 'ironlog-legacy';
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
const lines = (v: unknown) => (Array.isArray(v) ? v.filter((x) => isStr(x, 500)).slice(0, 30) : []);
const TYPES = new Set(WEIGHT_TYPES.map((t) => t.id));
const isPhoto = (v: unknown): v is string => isStr(v, 2_000_000) && /^data:image\/(jpeg|png|gif|webp);base64,/.test(v);

/**
 * Validate an untrusted backup (or our own stored copy) and return clean data (only known fields copied).
 * Throws Error with a human-readable message on the first problem found.
 */
export function parseBackup(text: string): { log: Log; images: Images } {
  if (text.length > MAX_IMPORT_BYTES) throw new Error('File is too large to be an Iron Log backup.');
  let raw: any;
  try { raw = JSON.parse(text); } catch { throw new Error('This file is not valid JSON.'); }
  if (!raw || typeof raw !== 'object' || raw.app !== BACKUP_APP) throw new Error('This is not an Iron Log backup file.');
  if (!Number.isInteger(raw.schemaVersion) || raw.schemaVersion < 1) throw new Error('Unknown backup version.');
  if (raw.schemaVersion > SCHEMA_VERSION) throw new Error('This backup is from a newer version of the app. Please update the app first.');
  if (raw.schemaVersion === 1) raw = fromV1(raw);
  if (raw.schemaVersion === 2) raw = fromV2(raw);
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
      ...(['lose', 'muscle', 'strength', 'fit'].includes(p.goal) ? { goal: p.goal } : {}) };
  });
  if (!profiles.length) throw new Error('Backup is damaged: it has no profiles.');
  const pids = new Set<string>(profiles.map((p: any) => p.id));
  const owned = (x: any) => pids.has(x?.profileId);

  const exercises: CustomExercise[] = raw.exercises.map((e: any, i: number) => {
    if (!owned(e) || !isId(e.id) || !isName(e.name) || !isStr(e.group, 40) || !isStr(e.equip ?? '', 60) || !TYPES.has(e.weightType)) fail('exercise', i);
    unique(`e:${e.profileId}:${e.id}`, 'exercise', i);
    return { id: e.id, profileId: e.profileId, name: e.name, group: e.group || 'Other', equip: e.equip ?? '', weightType: e.weightType,
      ...(e.metric === 'secs' ? { metric: 'secs' as const } : {}), ...(e.kind === 'cardio' || e.kind === 'activity' ? { kind: e.kind } : {}),
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
      ...(x.kind === 'W' || x.kind === 'D' ? { kind: x.kind } : {}) });
    const exercises = w.exercises.map((e: any) => ({ exerciseId: e.exerciseId,
      sets: (active ? e.sets : e.sets.filter((x: any) => x.done !== false)).map(set) }))
      .filter((e: any) => active || e.sets.length);
    const out: Workout = { id: w.id, profileId: w.profileId, date: w.date, name: w.name, startedAt: w.startedAt, exercises, updatedAt: time(w.updatedAt) };
    if (active) out.active = true;
    if (isTime(w.endedAt) && w.endedAt >= w.startedAt) out.endedAt = w.endedAt;
    if (isName(w.feeling, 30)) out.feeling = w.feeling;
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
      ...(s.units && ['kg', 'lb'].includes(s.units.weight) && ['cm', 'in'].includes(s.units.length) ? { units: { weight: s.units.weight, length: s.units.length } } : {}),
    },
  };
  return { log, images: parseImages(raw.images, pids) };
}

/** A template's (or a workout's planned) exercises: bad or repeated entries are dropped. */
function planOf(v: unknown): { exerciseId: string; sets?: number }[] {
  const seen = new Set<string>();
  return (Array.isArray(v) ? v : []).filter((x: any) => isId(x?.exerciseId) && !seen.has(x.exerciseId) && seen.add(x.exerciseId)).slice(0, 200)
    .map((x: any) => ({ exerciseId: x.exerciseId, ...(Number.isInteger(x.sets) && x.sets >= 1 && x.sets <= 50 ? { sets: x.sets } : {}) }));
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

/**
 * The old Firestore app's data, as the legacy page dumps it: every profile with its raw subcollections.
 * `{ app: 'ironlog-legacy', prefs: {rest, theme, bw}, profiles: { [id]: { name, ts, logs, sessions, exercises, exImg, favorites, templates } } }`
 * The result goes through parseBackup, so nothing unvalidated gets in.
 */
export function fromLegacy(text: string, now = Date.now()): { log: Log; images: Images } {
  let raw: any;
  try { raw = JSON.parse(text); } catch { throw new Error('The old Iron Log data could not be read.'); }
  if (raw?.app !== LEGACY_APP || !raw.profiles || typeof raw.profiles !== 'object') throw new Error('This is not data from the old Iron Log.');
  const obj = (v: any): Record<string, any> => (v && typeof v === 'object' ? v : {});
  const prefs = obj(raw.prefs);
  const log: any = { app: BACKUP_APP, schemaVersion: 1, profiles: [], exercises: [], favorites: [], templates: [], sessions: [], entries: [] };
  const images: Images = {};
  const pids = Object.keys(raw.profiles);
  for (const pid of pids) {
    const p = obj(raw.profiles[pid]);
    log.profiles.push({ id: pid, name: String(p.name ?? "").trim().slice(0, 40) || "Me", createdAt: time(p.ts),
      // Bodyweight was one device setting; it now belongs to each person. Give it to the first.
      bodyweight: pid === pids[0] && Number.isFinite(+prefs.bw) ? +prefs.bw : 0 });
    // Keep what the old app itself would show; tidy what it tolerated (it never validated).
    for (const [id, e] of Object.entries(obj(p.exercises))) if (isName(e?.name))
      log.exercises.push({ ...e, id, profileId: pid, equip: isStr(e.equip, 60) ? e.equip : '', group: isStr(e.group, 40) && e.group ? e.group : 'Other',
        weightType: TYPES.has(e.weightType) ? e.weightType : 'barbell', updatedAt: time(e.ts) });
    for (const [id, f] of Object.entries(obj(p.favorites))) log.favorites.push({ profileId: pid, exerciseId: id, at: time(f?.ts) });
    for (const [id, t] of Object.entries(obj(p.templates))) if (isName(t?.name, 60))
      log.templates.push({ id, profileId: pid, name: t.name, exerciseIds: t.exerciseIds, updatedAt: time(t.ts) });
    for (const s of Object.values(obj(p.sessions))) if (isRealDay(s?.date))
      log.sessions.push({ ...s, profileId: pid, exerciseIds: s.exerciseIds ?? [], updatedAt: time(s.ts) });
    for (const e of Object.values(obj(p.logs))) {
      if (!isRealDay(e?.date) || !isId(e.exerciseId)) continue;
      // The old app only ever wrote numbers, but its parseFloat/parseInt could leave NaN in older data.
      const sets = (Array.isArray(e.sets) ? e.sets : []).map((s: any) => ({
        w: Number.isFinite(s?.w) ? Math.max(-MAX_W, Math.min(MAX_W, s.w)) : 0,
        r: Number.isInteger(s?.r) ? Math.max(0, Math.min(MAX_R, s.r)) : 0,
      })).slice(0, 200);
      log.entries.push({ profileId: pid, date: e.date, exerciseId: e.exerciseId, sets, updatedAt: time(e.ts) || now });
    }
    for (const [id, x] of Object.entries(obj(p.exImg))) if (isPhoto(x?.img)) images[imgKey(pid, id)] = x.img;
  }
  log.settings = {
    theme: prefs.theme === 'light' || prefs.theme === 'dark' ? prefs.theme : 'system',
    restSecs: Number.isInteger(prefs.rest) ? prefs.rest : 90,
    currentProfileId: typeof raw.currentProfileId === 'string' ? raw.currentProfileId : pids[0],
  };
  const out = parseBackup(JSON.stringify(log));
  return { log: out.log, images };
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
