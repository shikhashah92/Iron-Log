// Pure backup logic (no platform I/O) so it can be unit tested with node --test.
import {
  isRealDay, MAX_R, MAX_W, SCHEMA_VERSION, WEIGHT_TYPES, imgKey,
  type CustomExercise, type Entry, type Images, type Log, type Session, type Template,
} from './model.ts';

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
const time = (v: unknown) => (isTime(v) ? v : 0);
const lines = (v: unknown) => (Array.isArray(v) ? v.filter((x) => isStr(x, 500)).slice(0, 30) : []);
const ids = (v: unknown) => (Array.isArray(v) ? [...new Set(v.filter(isId))].slice(0, 200) : []);
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
  const fail = (what: string, i: number): never => { throw new Error(`Backup is damaged: ${what} #${i + 1} is invalid.`); };
  for (const k of ['profiles', 'exercises', 'favorites', 'templates', 'sessions', 'entries'] as const)
    if (!Array.isArray(raw[k])) throw new Error(`Backup is damaged: missing ${k}.`);

  const seen = new Set<string>();
  const unique = (key: string, what: string, i: number) => { if (seen.has(key)) fail(what, i); seen.add(key); };

  const profiles = raw.profiles.map((p: any, i: number) => {
    if (!isId(p?.id) || !isName(p.name, 40)) fail('profile', i);
    unique(`p:${p.id}`, 'profile', i);
    const bw = Number.isFinite(p.bodyweight) && p.bodyweight >= 0 && p.bodyweight <= 500 ? p.bodyweight : 0;
    return { id: p.id, name: p.name, bodyweight: bw, createdAt: time(p.createdAt) };
  });
  if (!profiles.length) throw new Error('Backup is damaged: it has no profiles.');
  const pids = new Set<string>(profiles.map((p: any) => p.id));
  const owned = (x: any) => pids.has(x?.profileId);

  const exercises: CustomExercise[] = raw.exercises.map((e: any, i: number) => {
    if (!owned(e) || !isId(e.id) || !isName(e.name) || !isStr(e.group, 40) || !isStr(e.equip ?? '', 60) || !TYPES.has(e.weightType)) fail('exercise', i);
    unique(`e:${e.profileId}:${e.id}`, 'exercise', i);
    return { id: e.id, profileId: e.profileId, name: e.name, group: e.group || 'Other', equip: e.equip ?? '', weightType: e.weightType,
      ...(e.metric === 'secs' ? { metric: 'secs' as const } : {}), setup: lines(e.setup), exec: lines(e.exec), avoid: lines(e.avoid),
      updatedAt: time(e.updatedAt) };
  });
  const favorites = raw.favorites.map((f: any, i: number) => {
    if (!owned(f) || !isId(f.exerciseId)) fail('favorite', i);
    unique(`f:${f.profileId}:${f.exerciseId}`, 'favorite', i);
    return { profileId: f.profileId, exerciseId: f.exerciseId, at: time(f.at) };
  });
  const templates: Template[] = raw.templates.map((t: any, i: number) => {
    if (!owned(t) || !isId(t.id) || !isName(t.name, 60)) fail('template', i);
    unique(`t:${t.profileId}:${t.id}`, 'template', i);
    return { id: t.id, profileId: t.profileId, name: t.name, exerciseIds: ids(t.exerciseIds), updatedAt: time(t.updatedAt) };
  });
  const sessions: Session[] = raw.sessions.map((s: any, i: number) => {
    if (!owned(s) || !isRealDay(s.date)) fail('workout', i);
    unique(`s:${s.profileId}:${s.date}`, 'workout', i);
    const out: Session = { profileId: s.profileId, date: s.date, exerciseIds: ids(s.exerciseIds), updatedAt: time(s.updatedAt) };
    if (isTime(s.startedAt)) out.startedAt = s.startedAt;
    if (isTime(s.endedAt) && out.startedAt !== undefined && s.endedAt >= out.startedAt) out.endedAt = s.endedAt;
    if (isName(s.feeling, 30)) out.feeling = s.feeling;
    return out;
  });
  const entries: Entry[] = raw.entries.map((e: any, i: number) => {
    const okSets = Array.isArray(e?.sets) && e.sets.length <= 200 && e.sets.every((s: any) =>
      Number.isFinite(s?.w) && Math.abs(s.w) <= MAX_W && Number.isInteger(s.r) && s.r >= 0 && s.r <= MAX_R);
    if (!owned(e) || !isRealDay(e.date) || !isId(e.exerciseId) || !okSets) fail('logged exercise', i);
    unique(`x:${e.profileId}:${e.date}:${e.exerciseId}`, 'logged exercise', i);
    return { profileId: e.profileId, date: e.date, exerciseId: e.exerciseId, sets: e.sets.map((s: any) => ({ w: s.w, r: s.r })), updatedAt: time(e.updatedAt) };
  }).filter((e: Entry) => e.sets.length);

  const s = raw.settings ?? {};
  const log: Log = {
    schemaVersion: SCHEMA_VERSION, profiles, exercises, favorites, templates, sessions, entries,
    settings: {
      theme: ['system', 'light', 'dark'].includes(s.theme) ? s.theme : 'system',
      restSecs: Number.isInteger(s.restSecs) && s.restSecs >= 0 && s.restSecs <= 600 ? s.restSecs : 90,
      currentProfileId: pids.has(s.currentProfileId) ? s.currentProfileId : profiles[0].id,
      ...(isTime(s.lastBackupAt) ? { lastBackupAt: s.lastBackupAt } : {}),
      ...(s.backupChoice === 'file' || s.backupChoice === 'local' ? { backupChoice: s.backupChoice } : {}),
    },
  };
  return { log, images: parseImages(raw.images, pids) };
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
  const log: any = { app: BACKUP_APP, schemaVersion: SCHEMA_VERSION, profiles: [], exercises: [], favorites: [], templates: [], sessions: [], entries: [] };
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

/** One row per set, for spreadsheets. */
export function toCSV(l: Log, exName: (profileId: string, exerciseId: string) => string): string {
  const who = new Map(l.profiles.map((p) => [p.id, p.name]));
  const head = ['Date', 'Person', 'Exercise', 'Set', 'Weight (kg)', 'Reps / seconds'];
  const rows = [...l.entries].sort((a, b) => (a.date === b.date ? a.updatedAt - b.updatedAt : a.date < b.date ? -1 : 1))
    .flatMap((e) => e.sets.map((s, i) => [e.date, who.get(e.profileId) ?? '', exName(e.profileId, e.exerciseId), i + 1, s.w, s.r].map(csvCell).join(',')));
  return [head.join(','), ...rows].join('\r\n') + '\r\n';
}

/** Newest first, capped: the undo history never grows without bound. */
export function pushSnapshot<T>(list: T[], snap: T, max = 10): T[] {
  return [snap, ...list].slice(0, max);
}
