// Import a Strong app export (Settings → Export data → CSV) into the current profile. Pure, so it's unit tested.
// Columns: Date, Workout Name, Duration, Exercise Name, Set Order, Weight, Reps, Distance, Seconds, Notes, Workout Notes, RPE
import { BUILT_IN as ALL_BUILT_IN, GROUPS } from './exercises.ts';
import {
  isRealDay, MAX_R, MAX_W, newId, timeOfDayName, type CustomExercise, type Log, type Template, type WeightType, type Workout,
} from './model.ts';

const LIBRARY = new Map(ALL_BUILT_IN.map((e) => [e.id, e]));

/** Strong's standard names → our built-ins, only where the weight means the same thing (total vs per dumbbell). */
export const STRONG_BUILT_IN: Record<string, string> = {
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
  // cardio and activities (time, and distance for cardio)
  'running': 'run', 'running (outdoor)': 'run', 'running (treadmill)': 'treadmill', 'walking': 'walk', 'hiking': 'hike',
  'cycling': 'cycle', 'cycling (outdoor)': 'cycle', 'cycling (indoor)': 'indoor-cycle', 'swimming': 'swim', 'rowing (machine)': 'row-erg',
  'elliptical machine': 'elliptical', 'stair climber': 'stair-climber', 'stair machine': 'stair-climber', 'jump rope': 'jump-rope',
  'yoga': 'yoga-class', 'stretching': 'stretching', 'hiit': 'hiit', 'boxing': 'boxing', 'climbing': 'climbing',
};

/** RFC 4180 CSV: quoted fields, doubled quotes, separators and newlines inside quotes, CRLF. */
export function parseCSV(text: string, sep = ','): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') quoted = false; else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) { row.push(cell); cell = ''; }
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

/** Newer Strong exports put the unit in the header ("Weight (kg)" / "Weight (lbs)"); older ones don't say. */
export function strongHeaderUnit(text: string): 'kg' | 'lb' | undefined {
  const m = /Weight \((kg|lbs?)\)/.exec(text.slice(0, text.indexOf('\n') >>> 0));
  return m ? (m[1] === 'kg' ? 'kg' : 'lb') : undefined;
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
    // Names that would otherwise hit a broader word below ("Leg Raise" isn't legs, "Upright Row" isn't back).
    [/\b(leg raises?|knee raises?)\b/, 'Core'], [/\b(upright rows?|reverse fl(y|ies|yes)|rear delts?)\b/, 'Shoulders'],
    [/\b(curls?|biceps?|triceps?|skull\w*|push ?downs?|dips?|wrists?|forearms?)\b/, 'Arms'],
    [/\b(squats?|sqats?|lunges?|legs?|calf|deadlifts?|step-ups?|hips?|glutes?|hack|kickbacks?|hamstrings?|quads?)\b/, 'Legs'],
    [/\b(rows?|pull ?downs?|pull ?ups?|chin ?ups?|pullovers?|low pull|back|shrugs?)\b/, 'Back'], [/\b(bench|chest|fly|flyes|push ?ups?|pec)\b/, 'Chest'],
    [/\b(press|raises?|shoulders?|delts?|face pull)\b/, 'Shoulders'], [/\b(abs|crunch(es)?|plank|hold|twist|core|sit ?ups?)\b/, 'Core'],
  ];
  return rules.find(([re]) => re.test(n))?.[1] ?? 'Other';
}

export interface StrongSummary {
  sets: number; workouts: number; days: number; replaced: number;
  newExercises: number; matched: number; templates: number; heaviest: number; notes: number; from: string; to: string;
}

/**
 * Bring a Strong export into the current profile, one Uplift workout per Strong workout (its name, start time,
 * duration, warm-up and drop sets). Workouts already on the days this file covers are replaced, so importing again
 * (or after an older import) never doubles anything; same-named templates are kept. Throws a readable Error if this
 * isn't a Strong export.
 */
export function importStrong(l: Log, text: string, unit: 'kg' | 'lb', now = Date.now()): { log: Log; summary: StrongSummary } {
  text = text.replace(/^\uFEFF/, '');
  const line1 = text.slice(0, text.indexOf('\n') >>> 0);
  // Newer exports: ';'-separated, units in the headers ("Weight (kg)", "Duration (sec)", "Distance (meters)").
  const sep = line1.split(';').length > line1.split(',').length ? ';' : ',';
  // A ';' file usually comes from a region that writes decimals with a comma ("45,36"): make numbers readable.
  const [head, ...rows] = parseCSV(text, sep).map((r) => sep === ';' ? r.map((c) => /^-?\d+,\d+$/.test(c.trim()) ? c.replace(',', '.') : c) : r);
  const col = (k: string) => head?.findIndex((h) => h === k || h.startsWith(`${k} (`)) ?? -1;
  unit = strongHeaderUnit(line1) ?? unit;
  const C = { date: col('Date'), workout: col('Workout Name'), dur: col('Duration'), ex: col('Exercise Name'), order: col('Set Order'),
    w: col('Weight'), r: col('Reps'), secs: col('Seconds'), dist: col('Distance'), notes: col('Notes') };
  if ([C.date, C.ex, C.order, C.w, C.r].some((i) => i < 0)) throw new Error('This doesn’t look like a Strong export. In Strong: Settings → Export data.');
  const pid = l.settings.currentProfileId;
  const factor = unit === 'lb' ? 0.45359237 : 1;
  // Distance → km, by the unit in the header; older exports don't say (km, or miles when the export is in pounds).
  const du = C.dist >= 0 ? /\(([^)]+)\)/.exec(head[C.dist])?.[1].toLowerCase() : undefined;
  const toKm = du === undefined ? (unit === 'lb' ? 1.609344 : 1) : /^(m|meters?|metres?)$/.test(du) ? 0.001 : /^(mi|miles?)$/.test(du) ? 1.609344 : 1;

  // Which exercise each Strong name becomes: a built-in, an existing custom one with the same name, or a new custom one.
  const mine = l.exercises.filter((e) => e.profileId === pid);
  const byName = new Map(mine.map((e) => [e.name.toLowerCase(), e.id]));
  const taken = new Set(mine.map((e) => e.id));
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
    const key = name.slice(0, 80).toLowerCase();
    id = STRONG_BUILT_IN[name.toLowerCase()] ?? byName.get(key);
    if (!id) {
      // Different names can slug alike ("Curl (Cable)" / "Curl - Cable", non-Latin names): a repeated id makes the log unloadable.
      const base = `u_strong_${slug(name)}`;
      id = base;
      for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
      taken.add(id); byName.set(key, id);
      const { weightType, equip } = weightTypeOf(name);
      created.push({ id, profileId: pid, name: name.slice(0, 80), group: groupOf(name), equip, weightType,
        ...(timed.get(name) ? { metric: 'secs' as const } : {}), setup: [], exec: [], avoid: [], updatedAt: now });
    }
    idOf.set(name, id);
    return id;
  };

  // One Strong workout = one start time (the Date column), in file order.
  const byStart = new Map<string, Workout>();
  let sets = 0, heaviest = 0, notes = 0, from = '', to = '';
  for (const r of rows) {
    const name = r[C.ex]?.trim();
    const order = r[C.order]?.trim();
    const date = r[C.date]?.slice(0, 10);
    if (!name || !order || order === 'Rest Timer' || !isRealDay(date)) continue;
    const exId = exFor(name);
    const kind = LIBRARY.get(exId)?.kind;
    const secs = kind ? true : timed.get(name);
    // Cardio: w is distance in km. Activities: w is intensity, moderate.
    const dist = (Number(C.dist >= 0 ? r[C.dist] : 0) || 0) * toKm;
    const w = kind === 'cardio' ? Math.round(Math.min(MAX_W, dist) * 100) / 100 : kind === 'activity' ? 2
      : Math.round(Math.max(-MAX_W, Math.min(MAX_W, (Number(r[C.w]) || 0) * factor)) * 100) / 100;
    const reps = Math.round(Math.max(0, Math.min(MAX_R, Number(secs ? r[C.secs] : r[C.r]) || 0)));
    if (!reps && (kind || !w)) continue;
    if (r[C.notes]?.trim()) notes++;
    let wk = byStart.get(r[C.date]);
    if (!wk) {
      const at = new Date(r[C.date].replace(' ', 'T')).getTime() || now;
      const d = C.dur >= 0 ? r[C.dur]?.trim() ?? '' : '';
      const dur = /^\d+$/.test(d) ? Number(d) * 1000 : durationMs(d); // newer exports: plain seconds
      const title = (C.workout >= 0 ? r[C.workout]?.trim() : '') || timeOfDayName(at);
      wk = { id: newId('w'), profileId: pid, date, name: title.slice(0, 60), startedAt: at, ...(dur ? { endedAt: at + dur } : {}),
        exercises: [], source: 'strong', updatedAt: at };
      byStart.set(r[C.date], wk);
    }
    let ex = wk.exercises.find((e) => e.exerciseId === exId);
    if (!ex) { ex = { exerciseId: exId, sets: [] }; wk.exercises.push(ex); }
    if (ex.sets.length < 200) ex.sets.push({ w, r: reps, ...(order === 'W' || order === 'D' ? { kind: order } : {}) });
    sets++;
    if (!kind) heaviest = Math.max(heaviest, w);
    if (!from || date < from) from = date;
    if (!to || date > to) to = date;
  }
  if (!sets) throw new Error('No sets found in this file.');
  const imported = [...byStart.values()];
  const days = new Set(imported.map((w) => w.date));

  // Replace what's on those days (an earlier import, or its version 1 one-per-day form), never a workout in progress.
  const replaced = l.workouts.filter((w) => w.profileId === pid && !w.active && (days.has(w.date) || w.source === 'strong'));
  const gone = new Set(replaced.map((w) => w.id));
  // Each workout name becomes a template of its latest exercises and set counts (unless one by that name exists).
  const hasTpl = new Set(l.templates.filter((t) => t.profileId === pid).map((t) => t.name.toLowerCase()));
  const latest = new Map<string, Workout>();
  for (const w of imported) if ((latest.get(w.name)?.startedAt ?? -1) < w.startedAt) latest.set(w.name, w);
  const templates: Template[] = [...latest.values()].filter((w) => !hasTpl.has(w.name.toLowerCase()) && !/^(morning|midday|afternoon|evening|night) workout$/i.test(w.name))
    .map((w) => ({ id: newId('t'), profileId: pid, name: w.name, exercises: w.exercises.map((e) => ({ exerciseId: e.exerciseId, sets: e.sets.length })), updatedAt: now }));
  const exercises = created.filter((e) => imported.some((w) => w.exercises.some((x) => x.exerciseId === e.id)));

  return {
    log: { ...l, exercises: [...l.exercises, ...exercises], workouts: [...l.workouts.filter((w) => !gone.has(w.id)), ...imported], templates: [...l.templates, ...templates] },
    summary: { sets, workouts: imported.length, days: days.size, replaced: replaced.length, newExercises: exercises.length,
      matched: [...idOf.values()].filter((id) => !id.startsWith('u_strong_')).length, templates: templates.length, heaviest, notes, from, to },
  };
}
