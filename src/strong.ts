// Import a Strong app export (Settings → Export data → CSV) into the current profile. Pure, so it's unit tested.
// Columns: Date, Workout Name, Duration, Exercise Name, Set Order, Weight, Reps, Distance, Seconds, Notes, Workout Notes, RPE
import { GROUPS } from './exercises.ts';
import {
  isRealDay, MAX_R, MAX_W, newId, type CustomExercise, type Entry, type Log, type Session, type SetRow, type Template, type WeightType,
} from './model.ts';

/** Strong's standard names → our built-ins, only where the weight means the same thing (total vs per dumbbell). */
const BUILT_IN: Record<string, string> = {
  'bench press (barbell)': 'bench-press-bb', 'incline bench press (barbell)': 'incline-barbell-press',
  'bench press (dumbbell)': 'flat-db-press', 'incline bench press (dumbbell)': 'incline-db-press',
  'bench press - close grip (barbell)': 'close-grip-bench', 'chest press (machine)': 'machine-chest-press',
  'chest fly cable': 'cable-fly', 'cable fly mid level': 'cable-fly', 'cable crossover': 'cable-fly', 'push up': 'push-up',
  'deadlift (barbell)': 'deadlift', 'bent over row (barbell)': 'bb-bent-row', 'bent over row - underhand (barbell)': 'bb-bent-row',
  't bar row': 't-bar-row', 'lat pulldown (cable)': 'lat-pulldown', 'lat pulldown (machine)': 'lat-pulldown',
  'lat pulldown - wide grip (cable)': 'lat-pulldown', 'seated row (cable)': 'seated-cable-row',
  'bent over one arm row (dumbbell)': 'one-arm-db-row', 'pull up (assisted)': 'pull-up',
  'straight arm pulldown (cable)': 'straight-arm-pulldown', 'shrug (dumbbell)': 'db-shrug', 'shrugs dumbbell': 'db-shrug',
  'shrug (barbell)': 'bb-shrug', 'back extension': 'back-extension', 'overhead press (barbell)': 'ohp-bb',
  'seated overhead press (dumbbell)': 'seated-db-press', 'overhead press (dumbbell)': 'seated-db-press',
  'shoulder press (machine)': 'machine-shoulder-press', 'lateral raise (dumbbell)': 'lateral-raise',
  'front raise (dumbbell)': 'db-front-raise', 'reverse fly (dumbbell)': 'rear-delt-fly', 'face pull (cable)': 'face-pull',
  'upright row (cable)': 'upright-row', 'squat (barbell)': 'back-squat', 'front squat (barbell)': 'front-squat',
  'goblet squat (kettlebell)': 'goblet-squat', 'goblet squat (dumbbell)': 'goblet-squat', 'romanian deadlift (barbell)': 'rdl',
  'leg press': 'leg-press', 'leg press (machine)': 'leg-press', 'seated leg press (machine)': 'leg-press',
  'bulgarian split squat': 'bulgarian-split-squat', 'step-up': 'step-up', 'leg extension (machine)': 'leg-extension',
  'seated leg curl (machine)': 'seated-leg-curl', 'lying leg curl (machine)': 'lying-leg-curl', 'hip thrust (barbell)': 'hip-thrust',
  'glute bridge': 'glute-bridge', 'standing calf raise (machine)': 'calf-raise', 'bicep curl (barbell)': 'bb-curl',
  'bicep curl (dumbbell)': 'db-biceps-curl', 'bicep curl (cable)': 'cable-biceps-curl', 'hammer curl (dumbbell)': 'hammer-curl',
  'preacher curl (barbell)': 'preacher-curl', 'triceps pushdown (cable - straight bar)': 'triceps-pushdown',
  'rope push down (triceps)': 'rope-pushdown', 'triceps pushdown (cable - rope)': 'rope-pushdown',
  'triceps extension (cable)': 'overhead-triceps-ext', 'skullcrusher (barbell)': 'ez-skull-crusher', 'bench dip': 'bench-dips',
  'plank': 'plank', 'hanging leg raise': 'hanging-leg-raise', 'cable crunch': 'cable-crunch', 'russian twist': 'russian-twist',
};

/** RFC 4180 CSV: quoted fields, doubled quotes, commas and newlines inside quotes, CRLF. */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') quoted = false; else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

/** "1h 5m", "49m", "1h", "30s" → milliseconds. */
export function durationMs(s: string): number {
  let ms = 0;
  for (const [, n, u] of s.matchAll(/(\d+)\s*([hms])/g)) ms += Number(n) * { h: 3600_000, m: 60_000, s: 1000 }[u as 'h' | 'm' | 's'];
  return ms;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'exercise';
function weightTypeOf(name: string): { weightType: WeightType; equip: string } {
  const eq = /\(([^)]+)\)\s*$/.exec(name)?.[1].toLowerCase() ?? '';
  if (/dumbbell/.test(eq) || /dumbbell/i.test(name)) return { weightType: 'dumbbell', equip: 'Dumbbell' };
  if (/barbell|ez bar|trap bar/.test(eq)) return { weightType: 'barbell', equip: 'Barbell' };
  if (/cable|band/.test(eq)) return { weightType: 'cable', equip: eq.includes('band') ? 'Band' : 'Cable' };
  if (/machine|smith/.test(eq)) return { weightType: 'machine', equip: eq.includes('smith') ? 'Smith machine' : 'Machine' };
  if (/bodyweight|assisted/.test(eq)) return { weightType: 'bodyweight', equip: 'Bodyweight' };
  if (/kettlebell/.test(eq) || /kettle/i.test(name)) return { weightType: 'barbell', equip: 'Kettlebell' }; // one bell: plain kg
  return { weightType: 'barbell', equip: '' };
}
function groupOf(name: string): string {
  const n = name.toLowerCase();
  // Whole words only ("chin" must not match "machine"). Cardio has no muscle group: Other.
  if (/\b(running|cycling|swimming|elliptical|treadmill|rowing|walk|jumping)\b/.test(n)) return 'Other';
  const rules: [RegExp, (typeof GROUPS)[number]][] = [
    [/\b(curls?|biceps?|triceps?|skull\w*|push ?downs?|dips?)\b/, 'Arms'], [/\b(squats?|lunges?|legs?|calf|deadlifts?|step-ups?|hips?|glutes?)\b/, 'Legs'],
    [/\b(rows?|pull ?downs?|pull ?ups?|chin ?ups?|pullovers?|low pull|back)\b/, 'Back'], [/\b(bench|chest|fly|flyes|push ?ups?|pec)\b/, 'Chest'],
    [/\b(press|raises?|shoulders?|shrugs?|delts?|face pull)\b/, 'Shoulders'], [/\b(abs|crunch(es)?|plank|hold|twist|core|sit ?ups?)\b/, 'Core'],
  ];
  return rules.find(([re]) => re.test(n))?.[1] ?? 'Other';
}

export interface StrongSummary {
  sets: number; days: number; entries: number; skippedEntries: number;
  newExercises: number; matched: number; templates: number; heaviest: number; notes: number; from: string; to: string;
}

/**
 * Merge a Strong export into the current profile. Days already logged for an exercise are left alone, as are existing
 * workouts and same-named templates. Throws a readable Error if this isn't a Strong export.
 */
export function importStrong(l: Log, text: string, unit: 'kg' | 'lb', now = Date.now()): { log: Log; summary: StrongSummary } {
  const [head, ...rows] = parseCSV(text.replace(/^﻿/, ''));
  const col = (k: string) => head?.indexOf(k) ?? -1;
  const C = { date: col('Date'), workout: col('Workout Name'), dur: col('Duration'), ex: col('Exercise Name'), order: col('Set Order'),
    w: col('Weight'), r: col('Reps'), secs: col('Seconds'), notes: col('Notes') };
  if ([C.date, C.ex, C.order, C.w, C.r].some((i) => i < 0)) throw new Error('This doesn’t look like a Strong export. In Strong: Settings → Export data.');
  const pid = l.settings.currentProfileId;
  const factor = unit === 'lb' ? 0.45359237 : 1;

  // Which exercise each Strong name becomes: a built-in, an existing custom one with the same name, or a new custom one.
  const mine = l.exercises.filter((e) => e.profileId === pid);
  const byName = new Map(mine.map((e) => [e.name.toLowerCase(), e.id]));
  const idOf = new Map<string, string>();
  const created: CustomExercise[] = [];
  const timed = new Map<string, boolean>(); // every set is seconds-only (planks, cardio)
  for (const r of rows) {
    const n = r[C.ex]?.trim(); if (!n || r[C.order] === 'Rest Timer') continue;
    const onlySecs = !Number(r[C.r]) && Number(r[C.secs]) > 0;
    timed.set(n, (timed.get(n) ?? true) && onlySecs);
  }
  const exFor = (name: string) => {
    let id = idOf.get(name);
    if (id) return id;
    id = BUILT_IN[name.toLowerCase()] ?? byName.get(name.toLowerCase());
    if (!id) {
      id = `u_strong_${slug(name)}`;
      const { weightType, equip } = weightTypeOf(name);
      created.push({ id, profileId: pid, name: name.slice(0, 80), group: groupOf(name), equip, weightType,
        ...(timed.get(name) ? { metric: 'secs' as const } : {}), setup: [], exec: [], avoid: [], updatedAt: now });
    }
    idOf.set(name, id);
    return id;
  };

  // Group sets by day and exercise, and workouts by day, in file order.
  const perEntry = new Map<string, { date: string; exId: string; sets: SetRow[]; at: number }>();
  const perDay = new Map<string, { start: number; end: number; ids: string[] }>();
  const lastByWorkout = new Map<string, { at: number; ids: string[] }>();
  let sets = 0, heaviest = 0, notes = 0, from = '', to = '';
  for (const r of rows) {
    const name = r[C.ex]?.trim();
    const order = r[C.order]?.trim();
    const date = r[C.date]?.slice(0, 10);
    if (!name || !order || order === 'Rest Timer' || !isRealDay(date)) continue;
    const at = new Date(r[C.date].replace(' ', 'T')).getTime() || now;
    const exId = exFor(name);
    const secs = timed.get(name);
    const w = Math.round(Math.max(-MAX_W, Math.min(MAX_W, (Number(r[C.w]) || 0) * factor)) * 100) / 100;
    const reps = Math.round(Math.max(0, Math.min(MAX_R, Number(secs ? r[C.secs] : r[C.r]) || 0)));
    if (!w && !reps) continue;
    if (r[C.notes]?.trim()) notes++;
    const key = `${date}|${exId}`;
    const e = perEntry.get(key) ?? { date, exId, sets: [], at };
    if (e.sets.length < 200) e.sets.push({ w, r: reps });
    perEntry.set(key, e);
    const d = perDay.get(date) ?? { start: at, end: at, ids: [] };
    d.start = Math.min(d.start, at);
    d.end = Math.max(d.end, at + (C.dur >= 0 ? durationMs(r[C.dur] ?? '') : 0));
    if (!d.ids.includes(exId)) d.ids.push(exId);
    perDay.set(date, d);
    const wn = C.workout >= 0 ? r[C.workout]?.trim() : '';
    if (wn) {
      const t = lastByWorkout.get(wn);
      if (!t || at > t.at) lastByWorkout.set(wn, { at, ids: [exId] });
      else if (at === t.at && !t.ids.includes(exId)) t.ids.push(exId);
    }
    sets++;
    heaviest = Math.max(heaviest, w);
    if (!from || date < from) from = date;
    if (!to || date > to) to = date;
  }
  if (!sets) throw new Error('No sets found in this file.');

  const has = new Set(l.entries.filter((e) => e.profileId === pid).map((e) => `${e.date}|${e.exerciseId}`));
  const entries: Entry[] = [...perEntry.entries()].filter(([k]) => !has.has(k))
    .map(([, e]) => ({ profileId: pid, date: e.date, exerciseId: e.exId, sets: e.sets, updatedAt: e.at }));
  const hasDay = new Set(l.sessions.filter((s) => s.profileId === pid).map((s) => s.date));
  const sessions: Session[] = [...perDay.entries()].filter(([d]) => !hasDay.has(d))
    .map(([date, d]) => ({ profileId: pid, date, exerciseIds: d.ids.slice(0, 200), startedAt: d.start, ...(d.end > d.start ? { endedAt: d.end } : {}), updatedAt: d.start }));
  const hasTpl = new Set(l.templates.filter((t) => t.profileId === pid).map((t) => t.name.toLowerCase()));
  const templates: Template[] = [...lastByWorkout.entries()].filter(([n]) => !hasTpl.has(n.toLowerCase()))
    .map(([name, t]) => ({ id: newId('t'), profileId: pid, name: name.slice(0, 60), exerciseIds: t.ids, updatedAt: now }));
  // Only keep new exercises that something actually uses.
  const used = new Set([...entries.map((e) => e.exerciseId), ...templates.flatMap((t) => t.exerciseIds)]);
  const exercises = created.filter((e) => used.has(e.id));

  return {
    log: { ...l, exercises: [...l.exercises, ...exercises], entries: [...l.entries, ...entries], sessions: [...l.sessions, ...sessions], templates: [...l.templates, ...templates] },
    summary: { sets, days: perDay.size, entries: entries.length, skippedEntries: perEntry.size - entries.length, newExercises: exercises.length,
      matched: [...idOf.values()].filter((id) => !id.startsWith('u_strong_')).length, templates: templates.length, heaviest, notes, from, to },
  };
}
