import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import {
  ACTIVITY_GROUPS, addDays, fmtDur, addExercises, addProfile, ageOn, addSetTo, clock, pace, parseClock, setTime, topLoad, delProfile, delSetFrom, differsFromTemplate, estOneRM, finishWorkout, fmtSet, getEx, moveExercise,
  delWeighIn, longDate, needsBackupNudge, newLog, planSets, prOf, putExercise, putProfile, putTemplate, putWeighIn, putWorkout, removeExercise, replaceExercise, setKind, setLabels,
  setValue, startWorkout, templateFrom, recordsOf, recordLabel, isForgotten, setNote, lastNote, supersetWithNext, leaveSuperset, restsAfter, warmupsFor, addWarmups, platesFor, setRpe, weekRecap, upNext, backupDue, totals, weekly, weekStart, weekStreak, groupSets, toggleDone, toggleFav, viewOf, volumeOf, weekStats, workoutStats, type Log, type Workout,
} from '../src/model.ts';
import { csvCell, parseBackup, serialize, toBackupJSON, toCSV } from '../src/backup.ts';
import { decryptEnvelope, deriveKey, encryptWithKey, isEnvelope, newSalt } from '../src/crypto.ts';
import { BUILT_IN, STARTERS } from '../src/exercises.ts';

const bench = 'bench-press-bb', row = 'bb-bent-row';
const at = (day: string, time = '07:00') => new Date(`${day}T${time}:00`).getTime();
const D1 = '2026-09-01', D2 = '2026-09-03';

/** Log a finished workout the way the app does: start, fill in, tick everything, finish. */
function did(l: Log, day: string, ex: [string, [number, number, ('W' | 'D')?][]][], time = '07:00'): Log {
  l = startWorkout(l, undefined, at(day, time));
  const w = viewOf(l).active!;
  l = putWorkout(l, { ...w, exercises: ex.map(([id, sets]) => ({ exerciseId: id, sets: sets.map(([w, r, kind]) => ({ w, r, ...(kind ? { kind } : {}) })) })) });
  return finishWorkout(l, w.id, false, at(day, time) + 3600_000).log;
}
const sample = () => did(newLog('Asha', 1), D1, [[bench, [[20, 10, 'W'], [60, 8], [62.5, 6]]], ['push-up', [[0, 20]]]]);
const active = (l: Log) => viewOf(l).active!;

test('starting a template plans each exercise from its last session, as grey hints', () => {
  let l = putTemplate(sample(), { id: 't1', name: 'Push', exercises: [{ exerciseId: bench }, { exerciseId: 'push-up', sets: 2 }, { exerciseId: row }] });
  l = startWorkout(l, 't1', at(D2));
  const w = active(l);
  assert.equal(w.name, 'Push');
  assert.equal(w.date, D2);
  assert.deepEqual(w.exercises[0].sets, [{ w: 20, r: 10, done: false, kind: 'W' }, { w: 60, r: 8, done: false }, { w: 62.5, r: 6, done: false }]);
  assert.deepEqual(w.exercises[1].sets, [{ w: 0, r: 20, done: false }, { w: 0, r: 20, done: false }], 'template set count wins, repeating the last');
  assert.deepEqual(w.exercises[2].sets, Array(3).fill({ w: 0, r: 0, done: false }), 'never done: 3 empty sets');
  assert.deepEqual(w.planned, [{ exerciseId: bench, sets: 3 }, { exerciseId: 'push-up', sets: 2 }, { exerciseId: row, sets: 3 }]);
  assert.equal(startWorkout(l, 't1', at(D2, '09:00')), l, 'one workout at a time');
  assert.equal(viewOf(l).entries.filter((e) => e.workoutId === w.id).length, 0, 'planned sets count nowhere');
  assert.equal(startWorkout(newLog(), undefined, at(D1, '12:30')).workouts[0].name, 'Midday Workout');
});

test('ticking: hints log as shown, typed values override, untick, reps required, warm-ups skip records', () => {
  let l = putTemplate(sample(), { id: 't1', name: 'Push', exercises: [{ exerciseId: bench }] });
  l = startWorkout(l, 't1', at(D2));
  let w = active(l);
  w = setValue(w, 0, 1, 'w', '65');
  assert.deepEqual(w.exercises[0].sets[1], { w: 65, r: 8, done: false, typed: true });
  let t = toggleDone(w, 0, 1);
  assert.equal(t.ticked, true);
  assert.deepEqual(t.workout.exercises[0].sets[1], { w: 65, r: 8 });
  t = toggleDone(t.workout, 0, 1);
  assert.deepEqual(t.workout.exercises[0].sets[1], { w: 65, r: 8, done: false, typed: true }, 'untick keeps what you typed');
  t = toggleDone(toggleDone(t.workout, 0, 1).workout, 0, 2);
  assert.equal(t.ticked, true);
  w = setValue(addSetTo(t.workout, 0), 0, 3, 'r', '');
  assert.equal(toggleDone(w, 0, 3).ticked, false, 'no reps, no tick');
  assert.deepEqual(setLabels(setKind(w, 0, 3, 'D').exercises[0].sets), ['W', '1', '2', 'D']);
  l = putWorkout(l, w);
  const v = viewOf(l);
  assert.deepEqual(v.entries.find((e) => e.workoutId === w.id)!.sets, [{ w: 65, r: 8 }, { w: 62.5, r: 6 }], 'only ticked sets count, live');
  assert.equal(prOf(v, bench), 65);
  assert.equal(prOf(did(newLog(), D1, [[bench, [[100, 1, 'W'], [60, 5]]]]) && viewOf(did(newLog(), D1, [[bench, [[100, 1, 'W'], [60, 5]]]])), bench), 60, 'warm-ups are not records');
  assert.equal(setValue(w, 0, 0, 'w', '99999').exercises[0].sets[0].w, 2000);
  assert.equal(setValue(w, 0, 0, 'w', '47,5').exercises[0].sets[0].w, 47.5);
});

test('finish: discard or mark unfinished sets done; empty workouts vanish; template changes are spotted', () => {
  let l = putTemplate(sample(), { id: 't1', name: 'Push', exercises: [{ exerciseId: bench }, { exerciseId: 'push-up' }] });
  l = startWorkout(l, 't1', at(D2));
  let w = active(l);
  w = toggleDone(w, 0, 1).workout;
  l = putWorkout(l, w);
  const kept = finishWorkout(l, w.id, false, at(D2) + 60_000);
  assert.deepEqual(kept.workout!.exercises.map((e) => [e.exerciseId, e.sets]), [[bench, [{ w: 60, r: 8 }]]]);
  assert.equal(kept.workout!.active, undefined);
  assert.equal(kept.workout!.endedAt, at(D2) + 60_000);
  assert.equal(differsFromTemplate(kept.workout!), true, 'push-up dropped, bench 3 → 1 set');
  assert.deepEqual(templateFrom(kept.workout!), [{ exerciseId: bench, sets: 1 }]);
  const all = finishWorkout(l, w.id, true, at(D2) + 60_000).workout!;
  assert.deepEqual(all.exercises.map((e) => e.sets.length), [3, 1]);
  assert.equal(differsFromTemplate(all), false, 'same exercises and set counts');
  assert.equal(finishWorkout(startWorkout(newLog(), undefined, 5), viewOf(startWorkout(newLog(), undefined, 5)).active!.id, false).workout, undefined);
  const empty = startWorkout(newLog(), undefined, 5);
  assert.equal(finishWorkout(empty, active(empty).id, false).log.workouts.length, 0, 'nothing logged: no workout');
});

test('editing a workout: add, replace, move, remove exercises and sets', () => {
  let l = startWorkout(sample(), undefined, at(D2));
  const v = viewOf(l);
  let w: Workout = addExercises(active(l), v, [row, bench, row]);
  assert.deepEqual(w.exercises.map((e) => e.exerciseId), [row, bench], 'no duplicates');
  assert.equal(w.exercises[1].sets[1].w, 60, 'pre-filled from its last session');
  w = replaceExercise(w, v, 0, 'push-up');
  assert.deepEqual(w.exercises[0].sets, [{ w: 0, r: 20, done: false }]);
  assert.equal(replaceExercise(w, v, 0, bench), w, 'cannot replace with one already in the workout');
  w = moveExercise(w, 1, 0);
  assert.deepEqual(w.exercises.map((e) => e.exerciseId), [bench, 'push-up']);
  assert.equal(moveExercise(w, 0, -1), w, 'already first');
  const three = addExercises(w, v, [row]);
  assert.deepEqual(moveExercise(three, 0, 2).exercises.map((e) => e.exerciseId), ['push-up', row, bench], 'first to last shifts the rest up');
  assert.deepEqual(moveExercise(three, 2, 0).exercises.map((e) => e.exerciseId), [row, bench, 'push-up'], 'last to first');
  w = addSetTo(w, 0);
  assert.deepEqual(w.exercises[0].sets.at(-1), { w: 62.5, r: 6, done: false }, 'a new set copies the previous as its hint');
  w = delSetFrom(removeExercise(w, 1), 0, 0);
  assert.equal(w.exercises.length, 1);
  assert.equal(w.exercises[0].sets.length, 3);
  const past = addExercises({ ...w, active: undefined }, v, [row], true);
  assert.deepEqual(past.exercises[1].sets[0], { w: 0, r: 0 }, 'editing a past workout adds logged sets');
});

test('stats: Epley 1RM, dumbbell volume counts both hands, bodyweight adds the person', () => {
  const l = sample();
  const v = viewOf(l);
  const ex = getEx(v, bench);
  assert.equal(Math.round(estOneRM(v.entries.filter((e) => e.exerciseId === bench), ex, 0) * 10) / 10, 76);
  const db = getEx(v, 'flat-db-press');
  assert.equal(volumeOf({ sets: [{ w: 20, r: 10 }] }, db, 0), 400);
  const pu = getEx(v, 'push-up');
  assert.equal(volumeOf(v.entries.find((e) => e.exerciseId === 'push-up')!, pu, 70), 1400);
  assert.equal(fmtSet({ w: 0, r: 20 }, pu), 'BW×20');
  assert.equal(fmtSet({ w: 20, r: 10 }, db), '20/DB×10');
  assert.deepEqual(weekStats(v, D2), { sessions: 1, sets: 4, volume: 20 * 10 + 60 * 8 + 62.5 * 6 });
  assert.deepEqual(workoutStats(v, v.workouts[0]), { sets: 4, volume: 20 * 10 + 60 * 8 + 62.5 * 6 });
  const two = did(l, D1, [[bench, [[70, 3]]]], '18:00');
  assert.equal(weekStats(viewOf(two), D2).sessions, 2, 'two workouts on one day are two sessions');
});

test('profiles never mix, and deleting one removes only theirs', () => {
  let l = toggleFav(sample(), bench);
  const asha = l.settings.currentProfileId;
  l = addProfile(l, 'Ravi', 5);
  assert.notEqual(l.settings.currentProfileId, asha);
  assert.equal(viewOf(l).entries.length, 0);
  assert.equal(viewOf(l).favorites.length, 0);
  assert.equal(viewOf(l).active, undefined);
  l = did(l, D1, [[bench, [[40, 10]]]]);
  const ravi = l.settings.currentProfileId;
  l = delProfile(l, asha);
  assert.deepEqual(l.profiles.map((p) => p.id), [ravi]);
  assert.equal(l.workouts.length, 1);
  assert.equal(l.favorites.length, 0);
  assert.equal(delProfile(l, ravi), l, 'the last profile is kept');
});

test('parseBackup: round trip (with a workout in progress), and bad files are refused', () => {
  let l = putExercise(sample(), { id: 'u_x', name: 'Landmine', group: 'Shoulders', equip: 'Landmine', weightType: 'barbell', setup: ['a'], exec: [], avoid: [] });
  l = putTemplate(l, { id: 't1', name: 'Push', exercises: [{ exerciseId: bench, sets: 4 }] });
  l = startWorkout(l, 't1', at(D2));
  l = putWorkout(l, setValue(active(l), 0, 0, 'w', '30'));
  l = { ...l, settings: { ...l.settings, backupChoice: 'file', lastBackupAt: 5 } };
  const imgs = { [`${l.settings.currentProfileId}:${bench}`]: 'data:image/jpeg;base64,AAAA' };
  const back = parseBackup(toBackupJSON(l, imgs));
  assert.deepEqual(back.log, l);
  assert.deepEqual(back.images, imgs);
  assert.deepEqual(parseBackup(serialize(l)).log, l);

  const bad = (mut: (x: any) => void) => { const x = JSON.parse(serialize(l)); mut(x); return () => parseBackup(JSON.stringify(x)); };
  assert.throws(() => parseBackup('nope'), /not valid JSON/);
  assert.throws(() => parseBackup('{"app":"ledger"}'), /not an Uplift backup/);
  assert.equal(parseBackup(serialize(newLog('Asha')).replace('"app":"uplift"', '"app":"ironlog"')).log.profiles[0].name, 'Asha', 'Iron Log backups still restore');
  assert.throws(bad((x) => { x.schemaVersion = 99; }), /newer version/);
  assert.throws(bad((x) => { x.workouts[0].exercises[0].sets[0].w = 'heavy'; }), /workout #1/);
  assert.throws(bad((x) => { x.workouts[0].date = '2026-02-31'; }), /workout #1/);
  assert.throws(bad((x) => { x.workouts[0].profileId = 'someone-else'; }), /workout #1/);
  assert.throws(bad((x) => { x.workouts.push({ ...x.workouts[0] }); }), /workout/);
  assert.throws(bad((x) => { x.profiles = []; }), /no profiles/);
  // Two in progress (can't happen, but a file could say so): the newer one stays live, the older is finished as logged.
  const two = JSON.parse(serialize(l)); two.workouts[0].active = true;
  assert.deepEqual(parseBackup(JSON.stringify(two)).log.workouts.filter((w) => w.active).map((w) => w.startedAt), [at(D2)]);
  // A bad photo is dropped, not fatal; one for an unknown profile too.
  const withImgs = JSON.parse(toBackupJSON(l, imgs));
  withImgs.images.x = 'javascript:alert(1)';
  withImgs.images['nobody:bench'] = 'data:image/jpeg;base64,AAAA';
  assert.deepEqual(parseBackup(JSON.stringify(withImgs)).images, imgs);
});

test('version 1 data (one session per day) becomes one finished workout per day', () => {
  const v1 = { app: 'ironlog', schemaVersion: 1,
    profiles: [{ id: 'p1', name: 'Rohan', bodyweight: 70, createdAt: 1 }], exercises: [], favorites: [],
    templates: [{ id: 't1', profileId: 'p1', name: 'Legs', exerciseIds: ['leg-press', 'squat'], updatedAt: 2 }],
    sessions: [{ profileId: 'p1', date: D1, exerciseIds: ['leg-press', 'calf-raise'], startedAt: at(D1, '18:00'), endedAt: at(D1, '19:00'), feeling: 'Hard', updatedAt: 3 },
      { profileId: 'p1', date: D2, exerciseIds: ['row'], updatedAt: 4 }],
    entries: [{ profileId: 'p1', date: D1, exerciseId: 'leg-press', sets: [{ w: 100, r: 10 }], updatedAt: 5 },
      { profileId: 'p1', date: D1, exerciseId: 'squat', sets: [{ w: 60, r: 5 }], updatedAt: 6 }],
    settings: { theme: 'dark', restSecs: 60, currentProfileId: 'p1' } };
  const { log } = parseBackup(JSON.stringify(v1));
  assert.equal(log.schemaVersion, 4);
  assert.equal(log.workouts.length, 1, 'a planned-only day is dropped');
  const w = log.workouts[0];
  assert.deepEqual([w.date, w.name, w.feeling, w.endedAt! - w.startedAt], [D1, 'Evening Workout', 'Hard', 3600_000]);
  assert.deepEqual(w.exercises.map((e) => e.exerciseId), ['leg-press', 'squat'], 'session order, then the rest; calf raise had no sets');
  assert.deepEqual(log.templates[0].exercises, [{ exerciseId: 'leg-press' }, { exerciseId: 'squat' }]);
  assert.deepEqual(parseBackup(serialize(log)).log, log, 'stable once converted');
});

test('locked backups: encrypt, decrypt, wrong passphrase', async () => {
  const text = toBackupJSON(sample(), {});
  const salt = newSalt();
  const file = await encryptWithKey(await deriveKey('correct horse battery', salt, 100_000), salt, 100_000, text);
  assert.ok(isEnvelope(file));
  assert.ok(!file.includes('Asha'));
  assert.equal(await decryptEnvelope(file, 'correct horse battery'), text);
  await assert.rejects(decryptEnvelope(file, 'wrong'), /does not open/);
});

test('backup nudge: only when something changed and the last backup is over a week old', () => {
  const day = 86400_000;
  let l = did(newLog(), D1, [[bench, [[50, 5]]]]);
  const done = l.workouts[0].updatedAt;
  assert.equal(needsBackupNudge(l, done + 2 * day), false);
  assert.equal(needsBackupNudge(l, done + 8 * day), true);
  l = { ...l, settings: { ...l.settings, lastBackupAt: done + 8 * day } };
  assert.equal(needsBackupNudge(l, done + 30 * day), false, 'nothing changed since');
  assert.equal(needsBackupNudge(startWorkout(l, undefined, done + 9 * day), done + 30 * day), false, 'a workout in progress is not a change yet');
});

test('CSV: one row per logged set, formula injection neutralised', () => {
  assert.equal(csvCell('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
  assert.equal(csvCell(-5), '-5');
  const names = new Map(BUILT_IN.map((e) => [e.id, e.name]));
  const csv = toCSV(sample(), (_p, id) => names.get(id) ?? id).trim().split('\r\n');
  assert.equal(csv.length, 5);
  assert.equal(csv[1], `${D1},Morning Workout,Asha,Barbell Bench Press,1,20,10,Warm-up`);
  assert.equal(csv[2], `${D1},Morning Workout,Asha,Barbell Bench Press,2,60,8,`);
});

test('built-in library: unique ids; strength has cues and drawings; activities have MET values; yoga has how-to steps', () => {
  assert.equal(new Set(BUILT_IN.map((e) => e.id)).size, BUILT_IN.length);
  const frames = (id: string) => [1, 2, 3].every((n) => existsSync(`public/illustrations/${id}/${n}.svg`));
  for (const e of BUILT_IN) {
    if (!e.kind) { assert.ok(e.setup.length && e.exec.length && e.avoid.length, e.id); assert.ok(frames(e.id), `${e.id} frames`); continue; }
    assert.ok((ACTIVITY_GROUPS as readonly string[]).includes(e.group), `${e.id} group`);
    if (e.kind === 'yoga') assert.ok(e.yoga && e.setup.length && e.exec.length && e.avoid.length, `${e.id} how-to`);
    assert.ok(e.met && e.met.length === 3 && e.met[0] <= e.met[1] && e.met[1] <= e.met[2] && e.met[0] >= 1, `${e.id} MET`);
    assert.ok(e.art === false ? !existsSync(`public/illustrations/${e.id}`) : frames(e.id), `${e.id}: its drawing, or marked as having none`);
  }
  assert.ok(BUILT_IN.filter((e) => e.kind).length >= 30);
  assert.ok(existsSync('public/illustrations/LICENSE.md'), 'the CC BY-SA credit ships with the images');
});

test('built app: served from the domain root, no third-party requests', { skip: !process.env.REQUIRE_DIST && !existsSync('dist/index.html') }, () => {
  const html = readFileSync('dist/index.html', 'utf8');
  assert.match(html, /src="\/_expo\/static\/js\/web\/[^"]+\.js"/);
  assert.ok(!/https?:\/\/(?!www\.w3\.org)/.test(html.replace(/<meta[^>]*>/g, '')), 'no external URLs in the shell');
  assert.ok(existsSync('dist/sw.js') && existsSync('dist/fonts/Archivo-latin.woff2') && existsSync('dist/brand/mark.svg'));
  assert.ok(!existsSync('dist/legacy'), 'no leftover Firebase page');
  assert.match(html, /http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self';/, 'CSP meta tag');
  assert.ok(html.includes('id="splash"') && existsSync('dist/splash/dark.svg') && existsSync('dist/splash/light.svg'), 'launch splash');
  for (const tag of html.match(/<script\b[^>]*>/g) ?? []) assert.match(tag, /\ssrc=/, `inline script (blocked by the CSP): ${tag}`);
});

test('Strong import: one workout per Strong workout, warm-up/drop sets, lb, replaces an earlier import', async () => {
  const { importStrong, parseCSV, durationMs } = await import('../src/strong.ts');
  const csv = [
    'Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE',
    '2026-09-01 07:00:00,"Push, heavy",1h 5m,"Bench Press (Barbell)",W,20.0,10.0,0,0.0,"",,',
    '2026-09-01 07:00:00,"Push, heavy",1h 5m,"Bench Press (Barbell)",1,100.0,5.0,0,0.0,"felt ""strong""",,',
    '2026-09-01 07:00:00,"Push, heavy",1h 5m,"Bench Press (Barbell)",Rest Timer,0,0.0,0,120.0,,,',
    '2026-09-01 07:00:00,"Push, heavy",1h 5m,"Bench Press (Barbell)",D,80.0,8.0,0,0.0,,,',
    '2026-09-01 07:00:00,"Push, heavy",1h 5m,"Squat (Smith Machine)",1,60.0,8.0,0,0.0,,,',
    '2026-09-01 07:00:00,"Push, heavy",1h 5m,"Plank",1,0,0.0,0,45.0,,,',
    '2026-09-01 18:00:00,Evening Workout,20m,"Plank",1,0,0.0,0,60.0,,,',
    '2026-09-03 18:00:00,Legs,49m,"Leg Press",1,0,0.0,0,0.0,,,',
  ].join('\r\n');
  assert.deepEqual(parseCSV('a,"b,""c"""\r\n"x\ny",z\n'), [['a', 'b,"c"'], ['x\ny', 'z']]);
  assert.equal(durationMs('1h 5m'), 65 * 60_000);

  const before = did(newLog('Rohan'), D1, [[bench, [[50, 5]]]]); // e.g. the version 1 one-per-day import of this day
  const { log, summary } = importStrong(before, csv, 'lb', 99);
  const v = viewOf(log);
  assert.equal(summary.replaced, 1, 'the day this file covers is replaced, not doubled');
  assert.deepEqual(v.workouts.map((w) => [w.name, w.endedAt! - w.startedAt]).reverse(), [['Push, heavy', 65 * 60_000], ['Evening Workout', 20 * 60_000]]);
  const push = v.workouts.find((w) => w.name === 'Push, heavy')!;
  assert.equal(push.source, 'strong');
  assert.deepEqual(push.exercises[0].sets, [{ w: 9.07, r: 10, kind: 'W' }, { w: 45.36, r: 5 }, { w: 36.29, r: 8, kind: 'D' }], 'lb → kg, W/D kept, rest timer skipped');
  const smith = v.exercises.find((e) => e.name === 'Squat (Smith Machine)')!;
  assert.deepEqual([smith.weightType, smith.group], ['machine', 'Legs']);
  assert.deepEqual(push.exercises.find((e) => e.exerciseId === 'plank')!.sets, [{ w: 0, r: 45 }], 'timed sets are seconds');
  assert.deepEqual([summary.sets, summary.workouts, summary.days], [6, 2, 1], 'the empty Leg Press row is skipped');
  assert.deepEqual(v.templates.filter((t) => !t.starter).map((t) => [t.name, t.exercises.map((e) => e.sets)]), [['Push, heavy', [3, 1, 1]]], 'no template for "Evening Workout"');
  parseBackup(serialize(log)); // the result is a valid log

  const again = importStrong(log, csv, 'lb', 100);
  assert.equal(viewOf(again.log).workouts.length, 2, 're-importing never doubles');
  assert.deepEqual([again.summary.replaced, again.summary.templates, again.summary.newExercises], [2, 0, 0]);
  assert.throws(() => importStrong(before, 'Date,Amount\n2026-01-01,5', 'kg'), /Strong export/);
  assert.equal(planSets(viewOf(log), bench).length, 3, 'imported history feeds the next workout\'s plan');
});

test('pounds: stored in kg, shown, typed and rounded in lb', async () => {
  const f = await import('../src/fun.ts');
  const { withUnits, setValue, fromKg, num, PLATES } = await import('../src/model.ts');
  const lb = (l: Log) => withUnits(l, { weight: 'lb', length: 'cm' });
  assert.equal(viewOf(newLog('A')).unit, 'kg', 'kg unless the person picks pounds');
  let l = lb(did(newLog('A', at('2026-01-01')), '2026-09-25', [[bench, [[90.72, 8], [90.72, 8]]]])); // 200 lb, as Strong stores it
  const v = viewOf(l);
  assert.equal(v.unit, 'lb');
  assert.equal(fmtSet({ w: 90.72, r: 8 }, getEx(v, bench), v.unit), '200×8');
  assert.equal(recordLabel({ exerciseId: bench, kind: 'weight', value: 90.72 }, 'lb'), 'Heaviest: 200 lb');
  assert.equal(fmtSet({ w: 27.22, r: 10 }, getEx(v, 'flat-db-press'), 'lb'), '60/DB×10', 'kg kept to 0.01 reads back as whole pounds');
  assert.equal(fmtSet({ w: 86.18, r: 8 }, getEx(v, bench), 'lb'), '190×8');
  assert.equal(fmtSet({ w: 5, r: 1650 }, getEx(v, 'run'), 'lb'), '5 km · 27m 30s', 'distance is never converted');
  assert.equal(fmtSet({ w: -9.07, r: 8 }, getEx(v, 'pull-up'), 'lb'), 'BW-20×8');
  const sg = f.suggestFor(v, bench, 'x', '2026-09-29')!;
  assert.equal(sg.text, 'Try 205 lb × 8 today: +5 lb on last time.');
  assert.equal(Math.round(fromKg(sg.kg, 'lb') * 1000) / 1000, 205);
  assert.deepEqual(warmupsFor(getEx(v, bench), sg.kg, 'lb').map((s) => Math.round(fromKg(s.w, 'lb'))), [45, 80, 125, 165], 'a 45 lb bar, 5 lb steps');
  assert.deepEqual(platesFor(225, 45, PLATES.lb), { side: [45, 45], left: 0 });
  // Typing 185 in lb saves the kg that shows as 185 again.
  const w = setValue({ exercises: [{ exerciseId: bench, sets: [{ w: 0, r: 5 }] }] } as unknown as Workout, 0, 0, 'w', '185', false, 'lb');
  assert.equal(num(fromKg(w.exercises[0].sets[0].w, 'lb')), '185');
  // A step picked in kg means nothing in lb: switching units puts it back to the default (5 lb).
  l = putProfile(withUnits(l, { weight: 'kg', length: 'cm' }), v.profile.id, { progression: { step: 1.25 } });
  assert.deepEqual(viewOf(lb(l)).profile.progression, {});
  assert.equal(parseBackup(serialize(lb(l))).log.settings.units?.weight, 'lb');
});

test('body: trend smooths, plan is a steady % per week, status and warnings, BMI, units, reminders', async () => {
  const b = await import('../src/body.ts');
  const wi = (date: string, weight: number, at = 0) => ({ id: date, profileId: 'p', date, weight, at });
  // Trend: 10%/day smoothing; a 3-day gap moves it as much as three daily steps would.
  const s = b.trendOf([wi('2026-09-01', 80), wi('2026-09-02', 82), wi('2026-09-05', 78)]);
  assert.deepEqual(s.map((p) => p.trend), [80, 80.2, 79.6]); // 80.2 + (1 − 0.9³)(78 − 80.2)
  assert.equal(b.trendChange(s, '2026-09-05', 4), -0.4);
  assert.equal(b.trendChange(s, '2026-09-05', 30), null);

  const t = { weight: 72, date: '2026-12-29', startWeight: 80, startDate: '2026-09-01' }; // 119 days
  assert.equal(b.planAt(t, '2026-09-01'), 80);
  assert.equal(Math.round(b.planAt(t, '2026-12-29') * 100) / 100, 72);
  const mid = b.planAt(t, addDaysForTest('2026-09-01', 59.5));
  assert.ok(mid < 76 && mid > 75.8, 'geometric: halfway in time is below the straight-line midpoint');
  const r = b.planRate(t);
  assert.ok(r.pctPerWeek > 0.6 && r.pctPerWeek < 0.63, `${r.pctPerWeek}`);
  assert.equal(b.planWarning(t), null);
  assert.match(b.planWarning({ ...t, date: '2026-10-01' })!, /1% a week/);
  assert.match(b.planWarning({ weight: 90, date: '2026-10-01', startWeight: 80, startDate: '2026-09-01' })!, /gaining/);
  assert.equal(b.planStatus(t, 80, '2026-09-01').label, 'On track');
  assert.match(b.planStatus(t, 79, '2026-10-15').label, /behind plan/);
  assert.match(b.planStatus(t, 74, '2026-10-15').label, /ahead of plan/);
  assert.equal(b.planStatus(t, 71.5, '2026-11-01').label, 'Target reached');
  const curve = b.planCurve(t);
  assert.deepEqual([curve[0], curve.at(-1)], [{ date: '2026-09-01', weight: 80 }, { date: '2026-12-29', weight: 72 }]);
  assert.ok(curve.length <= 62);

  assert.equal(Math.round(b.bmi(72, 178) * 10) / 10, 22.7);
  assert.equal(b.bmiLabel(22.7), 'Healthy range');
  assert.equal(Math.round(b.healthyRange(178).hi), 79);
  assert.equal(b.fmtWeight(72, 'lb'), '158.7 lb');
  assert.equal(Math.round(b.toKg(158.7, 'lb') * 10) / 10, 72);
  assert.equal(b.fmtHeight(180.3, 'in'), '5′ 11″');
  assert.equal(b.parseHeight(`5'11"`, 'in'), 180.3);
  assert.equal(b.parseHeight('5 11', 'in'), 180.3);
  assert.equal(b.parseHeight('71', 'in'), 180.3);
  assert.equal(b.parseHeight('178', 'cm'), 178);
  assert.equal(b.parseHeight('17', 'cm'), null);

  assert.equal(b.weighInDue([], '3x', '2026-09-05'), true);
  assert.equal(b.weighInDue([wi('2026-09-04', 80)], '3x', '2026-09-05'), false);
  assert.equal(b.weighInDue([wi('2026-09-03', 80)], '3x', '2026-09-05'), true);
  assert.equal(b.weighInDue([wi('2026-09-01', 80)], 'weekly', '2026-09-05'), false);
  assert.equal(b.weighInDue([], 'off', '2026-09-05'), false);
  const ics = b.reminderICS('3x', new Date(2026, 8, 28));
  assert.match(ics, /RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR/);
  assert.match(ics, /DTSTART:20260928T073000/);
  assert.match(ics, /BEGIN:VALARM/);
  assert.ok(ics.split('\r\n').every((line) => Buffer.byteLength(line) <= 75), 'iCalendar lines stay under 75 bytes');
});

test('weigh-ins: per person, feed bodyweight, and survive a backup; version 2 files load', () => {
  let l = putWeighIn(newLog('Asha'), { id: 'w1', date: D1, weight: 70, at: 1, fat: 18, waist: 80, photo: true });
  l = putWeighIn(l, { id: 'w2', date: D2, weight: 69.5, at: 2 });
  l = putProfile(l, l.settings.currentProfileId, { height: 170, weighEvery: 'daily', target: { weight: 65, date: '2027-01-01', startWeight: 70, startDate: D1 } });
  l = { ...l, settings: { ...l.settings, units: { weight: 'lb', length: 'in' } } };
  assert.equal(viewOf(l).bodyweight, 69.5);
  assert.deepEqual(parseBackup(serialize(l)).log, l);
  l = putWeighIn(l, { id: 'w2', date: D2, weight: 69, at: 3 }); // edit
  assert.deepEqual(viewOf(l).weighIns.map((w) => w.weight), [70, 69]);
  assert.equal(viewOf(delWeighIn(l, 'w2')).bodyweight, 70);
  assert.equal(viewOf(addProfile(l, 'Ravi')).weighIns.length, 0, 'weigh-ins never mix between people');
  assert.equal(delProfile(addProfile(l, 'Ravi'), l.settings.currentProfileId).weighIns.length, 0);
  const bad = JSON.parse(serialize(l)); bad.weighIns[0].weight = 5000;
  assert.throws(() => parseBackup(JSON.stringify(bad)), /weigh-in #1/);
  const oddTarget = JSON.parse(serialize(l)); oddTarget.profiles[0].target.date = D1; // ends before it starts
  assert.equal(parseBackup(JSON.stringify(oddTarget)).log.profiles[0].target, undefined, 'a bad target is dropped, not fatal');
  const v2 = JSON.parse(serialize(newLog())); v2.schemaVersion = 2; delete v2.weighIns;
  assert.deepEqual(parseBackup(JSON.stringify(v2)).log.weighIns, []);
  assert.equal(longDate('2025-05-07', '2026-09-28').includes('2025'), true, 'other years show the year');
  assert.equal(longDate('2026-05-07', '2026-09-28').includes('2026'), false);
});

function addDaysForTest(day: string, n: number) {
  const [y, m, d] = day.split('-').map(Number);
  const x = new Date(y, m - 1, d + Math.round(n));
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

test('activities: time entry, one-row plans, intensity, pace, and what charts and records show', () => {
  assert.equal(parseClock('30'), 1800);
  assert.equal(parseClock('30:15'), 1815);
  assert.equal(parseClock('1:05:00'), 3900);
  assert.equal(parseClock('abc'), null);
  assert.equal(parseClock(''), null);
  assert.equal(clock(3900), '1:05:00');
  assert.equal(pace(5, 1650), '5:30 /km');
  let l = startWorkout(newLog(), undefined, at(D1));
  let w = addExercises(active(l), viewOf(l), ['run', 'yoga-class', bench]);
  assert.deepEqual(w.exercises[0].sets, [{ w: 0, r: 0, done: false }], 'a run: one row');
  assert.deepEqual(w.exercises[1].sets, [{ w: 2, r: 0, done: false }], 'a class: one row, moderate');
  assert.equal(w.exercises[2].sets.length, 3);
  w = setTime(w, 0, 0, '27:30');
  w = setValue(w, 0, 0, 'w', '5');
  w = toggleDone(w, 0, 0).workout;
  w = toggleDone(setValue(setTime(w, 1, 0, '60'), 1, 0, 'w', '3'), 1, 0).workout;
  l = finishWorkout(putWorkout(l, w), w.id, false, at(D1) + 5400_000).log;
  const v = viewOf(l);
  const run = getEx(v, 'run'), yoga = getEx(v, 'yoga-class');
  assert.equal(fmtSet({ w: 5, r: 1650 }, run), '5 km · 27m 30s');
  assert.equal(fmtSet({ w: 3, r: 3600 }, yoga), '60 min · Vigorous');
  const runEntry = v.entries.find((e) => e.exerciseId === 'run')!;
  assert.equal(topLoad(runEntry, run, 70), 5, 'cardio charts distance');
  assert.equal(topLoad(v.entries.find((e) => e.exerciseId === 'yoga-class')!, yoga, 70), 60, 'activities chart minutes');
  assert.equal(prOf(v, 'run'), 0, 'no weight records for cardio');
  assert.equal(volumeOf(runEntry, run, 70), 0);
  assert.equal(estOneRM([runEntry], run, 70), 0);
  const wk = v.workouts[0];
  assert.deepEqual(wk.exercises.map((e) => e.exerciseId), ['run', 'yoga-class'], 'the unticked bench press is dropped');
  // Logged in a minute, but 87.5 minutes of activity: the workout lasted as long as its activities.
  let q = startWorkout(newLog(), undefined, at(D2));
  q = putWorkout(q, toggleDone(setTime(addExercises(active(q), viewOf(q), ['yoga-class']), 0, 0, '45'), 0, 0).workout);
  const y = finishWorkout(q, active(q).id, false, at(D2) + 60_000).workout!;
  assert.equal(y.endedAt! - y.startedAt, 45 * 60_000);
});

test('calories: MET × kg × hours; speed decides running; strength fills the rest of the clock; none without a weight', async () => {
  const { metOf, kcal, workoutCalories, STRENGTH_MET } = await import('../src/calories.ts');
  const v0 = viewOf(newLog());
  const run = getEx(v0, 'run'), yoga = getEx(v0, 'yoga-class'), swim = getEx(v0, 'swim');
  assert.equal(metOf(run, { w: 10, r: 3600 }), 9.8 + (10 - 9.7) / (11.3 - 9.7) * (11 - 9.8), '10 km/h');
  assert.equal(metOf(run, { w: 0, r: 1800 }), 9.8, 'no distance: moderate');
  assert.equal(metOf(yoga, { w: 1, r: 1800 }), 2.5);
  assert.equal(metOf(yoga, { w: 3, r: 1800 }), 4);
  assert.equal(metOf(swim, { w: 1.5, r: 2700 }), 7, 'no speed table: moderate');
  assert.equal(Math.round(kcal(8, 70, 3600)), 560);
  let l = putWeighIn(newLog(), { id: 'b', date: D1, weight: 80, at: 1 });
  assert.equal(workoutCalories(viewOf(newLog()), sample().workouts[0]), null, 'no weight, no estimate');
  l = did(l, D1, [[bench, [[60, 8]]], ['walk', [[4, 3000]]]]); // 1 h clock, 50 min of it walking at 4.8 km/h
  const w = viewOf(l).workouts[0];
  assert.equal(workoutCalories(viewOf(l), w), Math.round(kcal(3.5, 80, 3000) + kcal(STRENGTH_MET, 80, 600)));
});

test('date of birth typed as DD/MM/YYYY: slashes as you type, only real dates in range', async () => {
  const { dobMask, dobParse } = await import('../src/model.ts');
  assert.deepEqual(['1', '12', '120', '1209', '12091', '12091992'].map(dobMask), ['1', '12', '12/0', '12/09', '12/09/1', '12/09/1992']);
  assert.deepEqual(dobParse('12/09/1992', '1900-01-01', '2016-09-29'), { day: '1992-09-12' });
  assert.deepEqual(dobParse('12/09/19', '1900-01-01', '2016-09-29'), {});
  assert.match(dobParse('31/02/1992', '1900-01-01', '2016-09-29').error!, /real date/);
  assert.match(dobParse('12/09/2020', '1900-01-01', '2016-09-29').error!, /1900 to 2016/);
});

test('Strong newer export: semicolons, units in headers, duration in seconds, meters', async () => {
  const { importStrong, strongHeaderUnit } = await import('../src/strong.ts');
  const csv = ['"Workout #";"Date";"Workout Name";"Duration (sec)";"Exercise Name";"Set Order";"Weight (kg)";"Reps";"RPE";"Distance (meters)";"Seconds";"Notes";"Workout Notes"',
    '"1";"2024-09-30 08:02:36";"Back";"1864";"Lat Pulldown - Wide Grip (Cable)";"1";"45.359237";"12";"";"";"";"";"slow; light"',
    '"1";"2024-09-30 08:02:36";"Back";"1864";"Lat Pulldown - Wide Grip (Cable)";"Rest Timer";"";"";"";"";"90";"";""',
    '"1";"2024-09-30 08:02:36";"Back";"1864";"Running (Treadmill)";"1";"";"";"";"5200";"1800";"";""'].join('\n');
  assert.equal(strongHeaderUnit(csv), 'kg');
  const { log, summary } = importStrong(newLog(), csv, 'lb', 5); // header says kg: no conversion
  const w = viewOf(log).workouts[0];
  assert.equal(summary.sets, 2);
  assert.deepEqual(w.exercises.map((e) => e.sets[0]), [{ w: 45.36, r: 12 }, { w: 5.2, r: 1800 }]);
  assert.equal(w.endedAt! - w.startedAt, 1864_000);

  // Decimal commas, and distance in miles (converted to km even with the kg unit).
  const eu = csv.replace('"45.359237"', '"45,359237"').replace('Distance (meters)', 'Distance (miles)').replace('"5200"', '"3,1"');
  assert.deepEqual(viewOf(importStrong(newLog(), eu, 'kg', 5).log).workouts[0].exercises.map((e) => e.sets[0]), [{ w: 45.36, r: 12 }, { w: 4.99, r: 1800 }]);
});

test('Strong cardio: built-in activities with distance, and version 2 custom cardio converts', async () => {
  const { importStrong } = await import('../src/strong.ts');
  const csv = ['Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE',
    '2026-09-01 07:00:00,Cardio,40m,"Running (Treadmill)",1,0,0.0,5.2,1800.0,,,',
    '2026-09-01 07:00:00,Cardio,40m,"Yoga",1,0,0.0,0,600.0,,,'].join('\n');
  const { log } = importStrong(newLog(), csv, 'kg', 5);
  const ex = viewOf(log).workouts[0].exercises;
  assert.deepEqual(ex.map((e) => [e.exerciseId, e.sets]), [['treadmill', [{ w: 5.2, r: 1800 }]], ['yoga-class', [{ w: 2, r: 600 }]]]);
  assert.equal(viewOf(log).exercises.length, 0, 'no custom copies');
  assert.equal(importStrong(newLog(), csv, 'lb', 5).log.workouts[0].exercises[0].sets[0].w, 8.37, 'miles when the export is imperial');

  // What an earlier (version 2) import left behind: custom "Running (Treadmill)" logged as seconds.
  const v2 = JSON.parse(serialize(newLog('Rohan')));
  const pid = v2.profiles[0].id;
  v2.schemaVersion = 2; delete v2.weighIns;
  v2.exercises = [{ id: 'u_strong_running-treadmill', profileId: pid, name: 'Running (Treadmill)', group: 'Other', equip: '', weightType: 'barbell', metric: 'secs', setup: [], exec: [], avoid: [], updatedAt: 1 },
    { id: 'u_strong_kettlebell-raise', profileId: pid, name: 'Kettlebell Raise', group: 'Shoulders', equip: 'Kettlebell', weightType: 'barbell', setup: [], exec: [], avoid: [], updatedAt: 1 }];
  v2.workouts = [{ id: 'w1', profileId: pid, date: D1, name: 'Cardio', startedAt: 1, exercises: [
    { exerciseId: 'u_strong_running-treadmill', sets: [{ w: 0, r: 1800 }] }, { exerciseId: 'u_strong_kettlebell-raise', sets: [{ w: 12, r: 12 }] }], updatedAt: 1 }];
  v2.templates = [{ id: 't1', profileId: pid, name: 'Cardio', exercises: [{ exerciseId: 'u_strong_running-treadmill', sets: 1 }], updatedAt: 1 }];
  const { log: up } = parseBackup(JSON.stringify(v2));
  assert.deepEqual(up.workouts[0].exercises.map((e) => e.exerciseId), ['treadmill', 'u_strong_kettlebell-raise']);
  assert.deepEqual(up.workouts[0].exercises[0].sets, [{ w: 0, r: 1800 }]);
  assert.deepEqual(up.templates[0].exercises, [{ exerciseId: 'treadmill', sets: 1 }]);
  assert.deepEqual(up.exercises.map((e) => e.id), ['u_strong_kettlebell-raise'], 'strength customs stay');
});

test('onboarding details: kept through a backup, junk dropped, age by birthday', () => {
  const l = newLog('Asha');
  const pid = l.profiles[0].id;
  const on = { ...putProfile(l, pid, { dob: '1992-10-05', gender: 'female', goal: 'lose' }), settings: { ...l.settings, setupPending: true as const } };
  const back = parseBackup(serialize(on)).log;
  assert.deepEqual([back.profiles[0].dob, back.profiles[0].gender, back.profiles[0].goal, back.settings.setupPending], ['1992-10-05', 'female', 'lose', true]);
  const junk = JSON.parse(serialize(on)); Object.assign(junk.profiles[0], { dob: '1992-02-31', gender: 'x', goal: 'win' });
  const p = parseBackup(JSON.stringify(junk)).log.profiles[0];
  assert.deepEqual([p.dob, p.gender, p.goal], [undefined, undefined, undefined]);
  assert.equal(putProfile(on, pid, { gender: undefined }).profiles[0].gender, undefined);
  assert.equal(ageOn('1992-10-05', '2026-10-04'), 33);
  assert.equal(ageOn('1992-10-05', '2026-10-05'), 34);
});

test('yoga: rounds × hold, Surya Namaskar by rounds, pranayama by time; charts, calories, and a workout of only yoga', async () => {
  const { workoutCalories, kcal } = await import('../src/calories.ts');
  let l = putWeighIn(newLog(), { id: 'b', date: D1, weight: 60, at: 1 });
  const v0 = viewOf(l);
  const pose = getEx(v0, 'pavanmuktasana'), surya = getEx(v0, 'surya-namaskar'), breath = getEx(v0, 'anulom-vilom');
  assert.equal(fmtSet({ w: 3, r: 30 }, pose), '3×30s');
  assert.equal(fmtSet({ w: 12, r: 0 }, surya), '12 rounds');
  assert.equal(fmtSet({ w: 0, r: 300 }, breath), '5m');
  l = startWorkout(l, undefined, at(D1));
  let w = addExercises(viewOf(l).active!, viewOf(l), ['pavanmuktasana', 'surya-namaskar', 'anulom-vilom']);
  assert.deepEqual(w.exercises[0].sets, [{ w: 1, r: 0, done: false }], 'a pose starts as one round');
  w = setTime(setValue(w, 0, 0, 'w', '3'), 0, 0, '30', true);
  assert.equal(w.exercises[0].sets[0].r, 30, 'a hold: "30" is seconds');
  assert.equal(setTime(w, 2, 0, '5').exercises[2].sets[0].r, 300, 'pranayama: "5" is minutes');
  w = setValue(w, 1, 0, 'w', '12');
  assert.equal(toggleDone(w, 1, 0).ticked, false, 'strength rule: no time, no tick');
  w = toggleDone(w, 1, 0, true).workout; // Surya Namaskar: rounds alone
  w = toggleDone(toggleDone(setTime(w, 2, 0, '5'), 2, 0).workout, 0, 0).workout;
  l = putWorkout(l, w);
  const done = finishWorkout(l, w.id, false, at(D1) + 60_000);
  assert.equal(done.workout!.endedAt! - done.workout!.startedAt, (90 + 300) * 1000, 'only yoga: it lasted as long as the holds and the breathing');
  const v = viewOf(done.log);
  assert.equal(topLoad(v.entries.find((e) => e.exerciseId === 'pavanmuktasana')!, pose, 60), 30, 'chart: longest hold');
  assert.equal(topLoad(v.entries.find((e) => e.exerciseId === 'surya-namaskar')!, surya, 60), 12, 'chart: rounds');
  assert.equal(prOf(v, 'pavanmuktasana'), 0);
  assert.equal(workoutCalories(v, done.workout!), Math.round(kcal(2.5, 60, 90) + kcal(2.0, 60, 300)), 'rounds without time: no calories for those');
});

test('version 3 data: the four yoga styles become one Yoga class, merged in a workout', () => {
  const v3 = JSON.parse(serialize(newLog('Rohan'))); v3.schemaVersion = 3;
  const pid = v3.profiles[0].id;
  v3.workouts = [{ id: 'w1', profileId: pid, date: D1, name: 'Yoga', startedAt: 1, endedAt: 2, updatedAt: 1, planned: [{ exerciseId: 'hatha-yoga', sets: 1 }],
    exercises: [{ exerciseId: 'hatha-yoga', sets: [{ w: 2, r: 1800 }] }, { exerciseId: 'yin-yoga', sets: [{ w: 1, r: 600 }] }] }];
  v3.templates = [{ id: 't1', profileId: pid, name: 'Yoga', exercises: [{ exerciseId: 'power-yoga' }, { exerciseId: 'vinyasa-yoga' }], updatedAt: 1 }];
  v3.favorites = [{ profileId: pid, exerciseId: 'hatha-yoga', at: 1 }, { profileId: pid, exerciseId: 'yin-yoga', at: 2 }];
  const { log } = parseBackup(JSON.stringify(v3));
  assert.deepEqual(log.workouts[0].exercises, [{ exerciseId: 'yoga-class', sets: [{ w: 2, r: 1800 }, { w: 1, r: 600 }] }]);
  assert.deepEqual(log.workouts[0].planned, [{ exerciseId: 'yoga-class', sets: 1 }]);
  assert.deepEqual(log.templates[0].exercises, [{ exerciseId: 'yoga-class' }]);
  assert.deepEqual(log.favorites.map((f) => f.exerciseId), ['yoga-class']);
});

test('height in feet and inches, and calendar reminders for iPhone (hosted file) and Android (Google Calendar)', async () => {
  const b = await import('../src/body.ts');
  assert.equal(b.fromFtIn('5', '11'), 180.3);
  assert.equal(b.fromFtIn('6', ''), 182.9);
  assert.equal(b.fromFtIn('', '71'), 180.3, 'inches alone');
  assert.equal(b.fromFtIn('0', '10'), null, 'too short to be a person');
  assert.equal(b.fromFtIn('x', '2'), null);
  assert.deepEqual(b.ftIn(180.3), [5, 11]);
  for (const e of ['daily', '3x', 'weekly'] as const)
    assert.equal(readFileSync(`public/${b.reminderFile(e)}`, 'utf8'), b.reminderICS(e, b.REMINDER_START, '07:30', b.REMINDER_START), `${e}: the hosted file is current`);
  const g = new URL(b.googleCalendarURL('3x', new Date(2026, 8, 29)));
  assert.equal(g.searchParams.get('recur'), 'RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR');
  assert.equal(g.searchParams.get('dates'), '20260929T073000/20260929T073500');
  assert.equal(g.searchParams.get('action'), 'TEMPLATE');
});

test('durations say their unit, and can be typed with one', () => {
  assert.deepEqual([30, 300, 330, 3600, 3900].map(fmtDur), ['30s', '5m', '5m 30s', '1h', '1h 5m']);
  assert.deepEqual(['90s', '5m', '5m 30s', '1h 15m', '1.5h', '2 min', '45 sec', '30', '1:30'].map(parseClock), [90, 300, 330, 4500, 5400, 120, 45, 1800, 90]);
  assert.equal(parseClock('5 apples'), null);
  assert.equal(parseClock('m'), null);
});

test('finishing with "mark all done" keeps Surya Namaskar logged as rounds only', () => {
  let l = startWorkout(newLog(), undefined, at(D1));
  l = putWorkout(l, setValue(addExercises(viewOf(l).active!, viewOf(l), ['surya-namaskar']), 0, 0, 'w', '12'));
  const { workout } = finishWorkout(l, viewOf(l).active!.id, true, at(D1) + 600_000);
  assert.deepEqual(workout?.exercises[0].sets, [{ w: 12, r: 0 }]);
});

test('the on-phone reminder (service worker) matches the app’s own calendar file', async () => {
  const { runInNewContext } = await import('node:vm');
  const b = await import('../src/body.ts');
  const ctx: { self: { reminderICS?: (every: string, day: string) => string | null } } = { self: {} };
  runInNewContext(readFileSync('public/reminder-ics.js', 'utf8'), ctx);
  const day = new Date(2026, 9, 1);
  for (const e of ['daily', '3x', 'weekly'] as const) assert.equal(ctx.self.reminderICS!(e, '20261001'), b.reminderICS(e, day, '07:30', day), e);
  assert.equal(ctx.self.reminderICS!('hourly', '20261001'), null);
  assert.equal(ctx.self.reminderICS!('3x', 'x'), null);
});

test('reminders start on a day the repeat includes', async () => {
  const b = await import('../src/body.ts');
  const thu = new Date(2026, 9, 1); // Thursday
  assert.equal(b.reminderStart('3x', thu).getDate(), 2, 'Friday');
  assert.equal(b.reminderStart('weekly', thu).getDate(), 5, 'Monday');
  assert.equal(b.reminderStart('daily', thu).getDate(), 1);
  assert.equal(b.reminderStart('3x', new Date(2026, 9, 5)).getDate(), 5, 'already a Monday');
});

test('ready-made templates: real exercises, startable, and editing one saves a plain copy of your own', () => {
  const ids = new Set(BUILT_IN.map((e) => e.id));
  for (const s of STARTERS) for (const e of s.exercises) assert.ok(ids.has(e.exerciseId), `${s.name}: ${e.exerciseId}`);
  let l = newLog('A', at(D1));
  assert.equal(viewOf(l).templates.filter((t) => t.starter).length, STARTERS.length);
  assert.equal(l.templates.length, 0, 'not stored');
  const legs = viewOf(l).templates.find((t) => t.id === 'starter-legs')!;
  const started = viewOf(startWorkout(l, legs.id, at(D1))).active!;
  assert.equal(started.name, 'Legs');
  assert.equal(started.exercises[0].sets.length, 3);
  l = putTemplate(l, { ...legs, name: 'My legs' }, at(D1));
  assert.equal(l.templates[0].starter, undefined);
  const v = viewOf(l).templates.filter((t) => t.id === 'starter-legs');
  assert.deepEqual(v.map((t) => [t.name, t.starter]), [['My legs', undefined]]);
});

test('history trends: weeks start Monday, totals, 12-week bars, streaks, and sets per muscle group', () => {
  assert.equal(weekStart('2026-09-27'), '2026-09-21', 'Sunday belongs to the week before');
  assert.equal(weekStart('2026-09-28'), '2026-09-28');
  let l = newLog('A', at('2026-08-01'));
  const did = (day: string, ex: string, sets: { w: number; r: number; kind?: 'W' }[]) => {
    l = startWorkout(l, undefined, at(day));
    const w = viewOf(l).active!;
    l = putWorkout(l, { ...w, exercises: [{ exerciseId: ex, sets }] }, at(day));
    l = finishWorkout(l, w.id, true, at(day) + 45 * 60_000).log;
  };
  // Weeks of 31 Aug, 7 Sep, 14 Sep trained; 21 Sep skipped; 28 Sep (this week) trained.
  did('2026-08-31', bench, [{ w: 50, r: 5 }, { w: 20, r: 10, kind: 'W' }]);
  did('2026-09-09', 'back-squat', [{ w: 80, r: 5 }]);
  did('2026-09-16', 'back-squat', [{ w: 80, r: 5 }, { w: 80, r: 5 }]);
  did('2026-09-28', 'plank', [{ w: 0, r: 60 }]);
  const v = viewOf(l);
  assert.deepEqual(totals(v, '2026-09-01', '2026-09-30'), { workouts: 3, days: 3, minutes: 135, sets: 4, volume: 1200 });
  const weeks = weekly(v, '2026-09-28', 12);
  assert.equal(weeks.length, 12);
  assert.equal(weeks.at(-1)!.start, '2026-09-28');
  assert.deepEqual(weeks.slice(-5).map((w) => w.workouts), [1, 1, 1, 0, 1]);
  assert.deepEqual(weekStreak(v, '2026-09-28'), { current: 1, best: 3 });
  assert.deepEqual(weekStreak(v, '2026-09-20'), { current: 3, best: 3 }, 'an untrained current week doesn’t break the run');
  const g = Object.fromEntries(groupSets(v, '2026-08-30', '2026-09-28').map((x) => [x.group, x.sets]));
  assert.deepEqual([g.Chest, g.Legs, g.Core, g.Back], [1, 3, 1, 0], 'warm-ups not counted; timed core still counts as a set');
});

test('a negative weight is kept only where it means assistance (bodyweight); anywhere else it becomes 0', () => {
  let l = newLog('A', at(D1));
  l = startWorkout(l, undefined, at(D1));
  const w = addExercises(viewOf(l).active!, viewOf(l), [bench, 'pull-up']);
  assert.equal(setValue(w, 0, 0, 'w', '-5').exercises[0].sets[0].w, 0, 'barbell: no minus');
  assert.equal(setValue(w, 1, 0, 'w', '-20', true).exercises[1].sets[0].w, -20, 'assisted pull-up: minus kg');
  assert.equal(setValue(w, 0, 0, 'r', '-3').exercises[0].sets[0].r, 0, 'reps never go below 0');
});

test('personal bests: one per exercise, the heaviest first, never on a first session or from warm-ups', () => {
  let l = newLog('A', at(D1));
  const did = (day: string, sets: { w: number; r: number; kind?: 'W' }[], ex = bench) => {
    l = startWorkout(l, undefined, at(day));
    const w = viewOf(l).active!;
    l = putWorkout(l, { ...w, exercises: [{ exerciseId: ex, sets }] }, at(day));
    l = finishWorkout(l, w.id, true, at(day) + 3_600_000).log;
    return viewOf(l).workouts.find((x) => x.date === day && !x.active)!;
  };
  assert.deepEqual(recordsOf(viewOf(l), did('2026-09-01', [{ w: 60, r: 5 }])), [], 'first session: nothing to beat');
  assert.deepEqual(recordsOf(viewOf(l), did('2026-09-03', [{ w: 62.5, r: 5 }])).map((r) => [r.kind, r.value]), [['weight', 62.5]]);
  assert.deepEqual(recordsOf(viewOf(l), did('2026-09-05', [{ w: 62.5, r: 8 }])).map((r) => r.kind), ['e1rm'], 'same weight, more reps');
  assert.deepEqual(recordsOf(viewOf(l), did('2026-09-07', [{ w: 100, r: 1, kind: 'W' }, { w: 50, r: 5 }])), [], 'warm-ups don’t count');
  assert.equal(recordLabel({ exerciseId: bench, kind: 'weight', value: 62.5 }), 'Heaviest: 62.5 kg');
});

test('workout tools: notes, supersets, warm-ups, plates, RPE, and they all survive a backup', () => {
  let l = newLog('A', at(D1));
  l = startWorkout(l, undefined, at(D1));
  let w = addExercises(viewOf(l).active!, viewOf(l), [bench, row, 'triceps-pushdown']);
  w = setNote(w, 0, '  grip one finger wider  ');
  assert.equal(w.exercises[0].note, 'grip one finger wider');
  assert.equal(setNote(w, 0, '').exercises[0].note, undefined, 'blank removes it');
  // Supersets: join 1+2, then 2+3 joins the same one; rest only after the last.
  w = supersetWithNext(supersetWithNext(w, 0), 1);
  assert.deepEqual(w.exercises.map((e) => e.group), [1, 1, 1]);
  assert.deepEqual([0, 1, 2].map((i) => restsAfter(w, i)), [false, false, true]);
  const two = leaveSuperset(leaveSuperset(w, 2), 1);
  assert.deepEqual(two.exercises.map((e) => e.group), [undefined, undefined, undefined], 'a superset of one ends');
  // Warm-ups up to 100 kg on a barbell: bar, 40, 60, 80; planned, in front, replacing earlier ones.
  const ws = warmupsFor(getEx(viewOf(l), bench), 100);
  assert.deepEqual(ws.map((s) => [s.w, s.r]), [[20, 10], [40, 5], [60, 3], [80, 2]]);
  w = addWarmups(addWarmups(setValue(w, 0, 0, 'w', '100'), 0, ws), 0, ws);
  assert.equal(w.exercises[0].sets.filter((s) => s.kind === 'W').length, 4);
  assert.equal(w.exercises[0].sets[0].done, false);
  assert.deepEqual(warmupsFor(getEx(viewOf(l), 'pull-up'), 20), [], 'none for bodyweight');
  assert.deepEqual(platesFor(100), { side: [25, 15], left: 0 });
  assert.deepEqual(platesFor(61), { side: [20], left: 1 }, 'an odd kilo can’t be made');
  w = setRpe(setValue(w, 0, 4, 'r', '5'), 0, 4, 8.5);
  assert.equal(w.exercises[0].sets[4].rpe, 8.5);
  // Finish (warm-ups and the 100 kg set ticked) and round-trip through a backup.
  w = setValue(setValue(w, 1, 0, 'r', '8'), 2, 0, 'r', '12');
  l = putWorkout(l, { ...w, note: 'Slept badly' });
  l = finishWorkout(l, w.id, true, at(D1) + 3_600_000).log;
  const back = parseBackup(serialize(l)).log.workouts[0];
  assert.equal(back.note, 'Slept badly');
  assert.equal(back.exercises[0].note, 'grip one finger wider');
  assert.deepEqual(back.exercises.map((e) => e.group), [1, 1, 1]);
  assert.equal(back.exercises[0].sets.find((s) => s.rpe)?.rpe, 8.5);
  assert.equal(lastNote(viewOf(l), bench), 'grip one finger wider');
  assert.deepEqual(templateFrom(back).map((t) => t.group), [1, 1, 1], 'a template keeps the superset');
});

test('forgotten workouts, the Monday recap, what to do today, and when a backup is due', () => {
  const h = 3_600_000;
  const w = { active: true as const, startedAt: 0, updatedAt: 0 } as unknown as Workout;
  assert.equal(isForgotten(w, 4 * h), true);
  assert.equal(isForgotten({ ...w, updatedAt: 3 * h }, 4 * h), false, 'touched an hour ago: still going');
  assert.equal(isForgotten(w, 2 * h), false);
  let l = newLog('A', at('2026-08-01'));
  const v0 = viewOf(l);
  assert.equal(upNext(v0, '2026-09-28').templateId, 'starter-full-body', 'just starting');
  assert.equal(weekRecap(v0, '2026-09-28'), null);
  const did = (day: string, ex: string, n: number, templateId?: string) => {
    l = startWorkout(l, templateId, at(day));
    const a = viewOf(l).active!;
    l = putWorkout(l, { ...a, exercises: [{ exerciseId: ex, sets: Array.from({ length: n }, () => ({ w: 50, r: 5 })) }] }, at(day));
    l = finishWorkout(l, a.id, true, at(day) + h).log;
  };
  // Four weeks of legs and chest, then last week chest only: legs were light.
  for (const d of ['2026-08-24', '2026-08-31', '2026-09-07', '2026-09-14']) { did(d, 'back-squat', 6); did(addDays(d, 2), bench, 6); }
  did('2026-09-21', bench, 6); did('2026-09-23', bench, 6);
  const r = weekRecap(viewOf(l), '2026-09-28')!;
  assert.equal(r.start, '2026-09-21');
  assert.deepEqual([r.last.workouts, r.before.workouts], [2, 2]);
  assert.equal(r.light?.group, 'Legs');
  assert.match(upNext(viewOf(l), '2026-09-28').templateId, /^starter-(back|shoulders|arms|core)$/, 'least trained, never touched groups first');
  // Following a plan: the next one in turn.
  did('2026-09-27', bench, 3, 'starter-push');
  assert.deepEqual(upNext(viewOf(l), '2026-09-28'), { templateId: 'starter-pull', reason: 'Next in Push Pull Legs' });
  assert.equal(backupDue(l, at('2026-09-28')), true, 'never backed up, plenty logged');
  assert.equal(backupDue({ ...l, settings: { ...l.settings, backupChoice: 'local' } }, at('2026-09-28')), true, 'a week of changes still nudges');
});

test('weekly goal ring and streak; milestones cross on the right workout and never twice', async () => {
  const { weekProgress, goalStreak, milestonesOf, newMilestones, progressLabel } = await import('../src/fun.ts');
  let l = newLog('A', at('2026-08-01'));
  const did = (day: string, ex = bench, sets = [{ w: 100, r: 5 }, { w: 100, r: 5 }]) => {
    l = startWorkout(l, undefined, at(day));
    const a = viewOf(l).active!;
    l = putWorkout(l, { ...a, exercises: [{ exerciseId: ex, sets }] }, at(day));
    l = finishWorkout(l, a.id, true, at(day) + 3_600_000).log;
    return viewOf(l).workouts[0];
  };
  // Goal 2: met in weeks of 7 and 14 Sep, missed 21 Sep (1), this week (28 Sep) 1 so far.
  for (const d of ['2026-09-08', '2026-09-10', '2026-09-15', '2026-09-17', '2026-09-22']) did(d);
  did('2026-09-28');
  const v = viewOf(l);
  assert.deepEqual(weekProgress(v, '2026-09-28', 2), { done: 1, goal: 2, left: 1, daysLeft: 6, met: false });
  assert.equal(goalStreak(v, '2026-09-28', 2), 0, 'last week was missed');
  assert.equal(goalStreak(v, '2026-09-20', 2), 2);
  // 6 workouts × 1 tonne (100 × 5 × 2): 1 and 5 workouts, 1 and 5 tonnes, and a streak of 2 weeks met.
  const { earned, upcoming } = milestonesOf(v, 2);
  assert.deepEqual(earned.map((e) => e.id), ['workouts-1', 'tonnes-1', 'goals-1', 'workouts-5', 'tonnes-5']);
  assert.equal(earned.find((e) => e.id === 'workouts-5')!.date, '2026-09-22');
  assert.equal(progressLabel(upcoming.find((u) => u.track === 'workouts')!), '6 of 10 workouts');
  assert.equal(earned.filter((e) => e.id === 'goals-1').length, 1, 'meeting the goal again isn’t a new milestone');
  const last = did('2026-09-30');
  assert.deepEqual(newMilestones(viewOf(l), last, 2).map((e) => e.id), [], 'the 7th: nothing new (goal met again, but not a longer streak)');
  assert.equal(milestonesOf(viewOf(l), 0).upcoming.some((u) => u.track === 'goals'), false, 'no goal: no goal trophies');
  // Surya Namaskar rounds add up to the mala.
  const s = did('2026-10-01', 'surya-namaskar', [{ w: 108, r: 1800 }]);
  assert.ok(newMilestones(viewOf(l), s, 2).some((e) => e.id === 'surya-108'));
});

test('come back: training reminders (app and service worker agree), the year grid, Wrapped, welcome back, past you', async () => {
  const b = await import('../src/body.ts');
  const f = await import('../src/fun.ts');
  const { runInNewContext } = await import('node:vm');
  const ctx: { self: { trainingICS?: (days: string, time: string, day: string) => string | null } } = { self: {} };
  runInNewContext(readFileSync('public/reminder-ics.js', 'utf8'), ctx);
  assert.equal(ctx.self.trainingICS!('MO,WE,FR', '0700', '20260930'), b.trainingICS([4, 0, 2], '0700', '20260930'));
  assert.match(b.trainingICS([0, 2, 4], '1830', '20260930'), /DTEND:20260930T193000\r\nRRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR\r\n/);
  for (const bad of [['XX', '0700'], ['MO,MO', '0700'], ['MO', '2500'], ['MO', '7']]) assert.equal(ctx.self.trainingICS!(bad[0], bad[1], '20260930'), null, bad.join());
  assert.equal(b.trainingStart([0, 2, 4], new Date(2026, 8, 29)).getDate(), 30, 'Tuesday → the Wednesday');
  assert.match(b.trainingFile([4, 0], '0700', new Date(2026, 8, 30)), /days=MO,FR&time=0700&day=20260930$/);

  let l = newLog('A', at('2026-01-01'));
  const did = (day: string, sets = [{ w: 60, r: 5 }], ex = 'back-squat') => {
    l = startWorkout(l, undefined, at(day));
    const a = viewOf(l).active!;
    l = putWorkout(l, { ...a, exercises: [{ exerciseId: ex, sets }] }, at(day));
    l = finishWorkout(l, a.id, true, at(day) + 45 * 60_000).log;
  };
  did('2026-06-13'); did('2026-09-02', [{ w: 80, r: 5 }]); did('2026-09-03', [{ w: 85, r: 3 }]); did('2026-09-15', [{ w: 5.2, r: 1900 }], 'run');
  const v = viewOf(l);
  const g = f.yearGrid(v, '2026-09-29', 52);
  assert.equal(g.length, 52);
  assert.equal(g.at(-1)![0].day, '2026-09-28');
  assert.deepEqual(g.at(-1)!.map((d) => d.n), [0, 0, -1, -1, -1, -1, -1], 'the rest of this week is still to come');
  assert.equal(g.flat().find((d) => d.day === '2026-09-02')!.n, 1);
  const r = f.wrapped(v, '2026-09')!;
  assert.deepEqual([r.workouts, r.days, r.minutes, r.km, r.bests], [3, 3, 135, 5.2, 2]);
  assert.deepEqual(r.heaviest, { exerciseId: 'back-squat', kg: 85 });
  assert.equal(r.bestWeek.start, '2026-08-31');
  assert.equal(f.wrapped(v, '2026-08'), null);
  assert.deepEqual(f.wrappedMonths(v), ['2026-09', '2026-06']);
  assert.equal(f.daysOff(v, '2026-09-29'), 14);
  const planned = { ...v.workouts[0], exercises: [{ exerciseId: 'back-squat', sets: [{ w: 85, r: 5, done: false as const }, { w: 90, r: 5, done: false as const, typed: true as const }] }] };
  assert.deepEqual(f.easeBack(planned).exercises[0].sets.map((s) => s.w), [67.5, 90], 'hints eased, typed kept');
  // Three months after 13 June: 60 kg then, 85 in the last 3 weeks.
  assert.deepEqual(f.pastYou(v, '2026-09-12'), { exerciseId: 'back-squat', label: 'Three months ago', was: 60, now: 85, gain: 25 });
  assert.equal(f.pastYou(v, '2026-10-03'), null, 'a month after 85 kg, still 85 (and nothing lifted in the last 3 weeks): nothing to brag about');
  assert.equal(f.nextMonth('2026-12'), '2027-01');
  assert.equal(f.prevMonth('2026-01'), '2025-12');
});

test('beat last time: a step up when it went well (two if easy), hold on a grind, ease back after a break, a rep for bodyweight', async () => {
  const f = await import('../src/fun.ts');
  const make = (day: string, ex: string, sets: { w: number; r: number; rpe?: number; kind?: 'W' }[]) => {
    let l = newLog('A', at('2026-01-01'));
    l = startWorkout(l, undefined, at(day));
    const a = viewOf(l).active!;
    l = putWorkout(l, { ...a, exercises: [{ exerciseId: ex, sets }] }, at(day));
    return viewOf(finishWorkout(l, a.id, true, at(day) + 3_600_000).log);
  };
  const sq = (sets: { w: number; r: number; rpe?: number; kind?: 'W' }[], day = '2026-09-25') => f.suggestFor(make(day, 'back-squat', sets), 'back-squat', 'x', '2026-09-29');
  assert.deepEqual(sq([{ w: 20, r: 10, kind: 'W' }, { w: 82.5, r: 5 }, { w: 82.5, r: 5 }, { w: 82.5, r: 5 }]), { kind: 'up', kg: 85, reps: 5, text: 'Try 85 kg × 5 today: +2.5 kg on last time.' });
  assert.equal(sq([{ w: 82.5, r: 5, rpe: 7 }, { w: 82.5, r: 5, rpe: 7 }])!.kg, 87.5, 'easy: two steps');
  assert.equal(sq([{ w: 82.5, r: 5 }, { w: 82.5, r: 3 }])!.kind, 'hold', 'reps fell away');
  assert.equal(sq([{ w: 82.5, r: 5, rpe: 10 }])!.kind, 'hold', 'a grind');
  assert.deepEqual(sq([{ w: 100, r: 5 }], '2026-08-20'), { kind: 'back', kg: 90, reps: 5, text: 'It’s been 6 weeks: start around 90 kg and build back up.' });
  const db = f.suggestFor(make('2026-09-25', 'flat-db-press', [{ w: 24, r: 8 }]), 'flat-db-press', 'x', '2026-09-29');
  assert.equal(db!.kg, 26, 'dumbbells: 2 kg a hand');
  const pu = f.suggestFor(make('2026-09-25', 'push-up', [{ w: 0, r: 15 }, { w: 0, r: 15 }]), 'push-up', 'x', '2026-09-29');
  assert.deepEqual([pu!.kind, pu!.reps], ['reps', 16]);
  assert.equal(f.suggestFor(make('2026-09-25', 'run', [{ w: 5, r: 1800 }]), 'run', 'x', '2026-09-29'), null, 'not for cardio');
  // Use: planned working sets take the weight; warm-ups, typed and ticked sets don't.
  const w = { exercises: [{ exerciseId: 'back-squat', sets: [{ w: 20, r: 10, kind: 'W' as const, done: false as const }, { w: 82.5, r: 5, done: false as const }, { w: 90, r: 3, done: false as const, typed: true as const }, { w: 80, r: 5 }] }] } as unknown as Workout;
  const s = { kind: 'up' as const, kg: 85, reps: 5, text: '' };
  assert.deepEqual(f.applySuggestion(w, 0, s).exercises[0].sets.map((x) => x.w), [20, 85, 90, 80]);
  assert.equal(f.usesSuggestion(w, 0, s), false);
});

test('challenges: every kind counts right, links round-trip, bad links are refused, and it all survives a backup', async () => {
  const f = await import('../src/fun.ts');
  let l = newLog('Sam', at('2026-09-01'));
  const did = (day: string, ex: string, sets: { w: number; r: number }[]) => {
    l = startWorkout(l, undefined, at(day));
    const a = viewOf(l).active!;
    l = putWorkout(l, { ...a, exercises: [{ exerciseId: ex, sets }] }, at(day));
    l = finishWorkout(l, a.id, true, at(day) + 1_800_000).log;
  };
  did('2026-09-09', 'push-up', [{ w: 0, r: 60 }]); // before the start: doesn't count
  did('2026-09-10', 'push-up', [{ w: 0, r: 50 }, { w: 0, r: 50 }]);
  did('2026-09-11', 'push-up', [{ w: 0, r: 60 }]);
  did('2026-09-12', 'push-up', [{ w: 0, r: 100 }]);
  did('2026-09-12', 'plank', [{ w: 0, r: 120 }, { w: 0, r: 185 }]);
  did('2026-09-13', 'run', [{ w: 30, r: 9000 }]); did('2026-09-20', 'run', [{ w: 21, r: 6500 }]);
  const v = viewOf(l);
  const p = (id: string) => f.challengeProgress(v, { id, start: '2026-09-10' }, '2026-09-14')!;
  assert.deepEqual([p('pushups-7x100').done, p('pushups-7x100').completedOn], [2, undefined], 'two days of 100');
  assert.deepEqual([p('plank-3min').done, p('plank-3min').completedOn], [185, '2026-09-12']);
  assert.deepEqual([p('workouts-12').done, p('run-50k').done], [6, 51]);
  assert.equal(p('run-50k').completedOn, '2026-09-20', 'the 50th km came on the second run');
  assert.equal(p('pushups-7x100').daysLeft, 2);
  assert.equal(f.challengeProgress(v, { id: 'pushups-7x100', start: '2026-09-10' }, '2026-09-20')!.over, true);
  assert.equal(f.challengeUnit(p('plank-3min').def, v), 'sec');
  // Links: the whole challenge in the URL, checked on the way in.
  const d = { name: 'Match my 85 kg Barbell Back Squat', kind: 'best' as const, exerciseId: 'back-squat', target: 85, days: 30, from: 'Sam' };
  const link = f.challengeLink(d);
  assert.match(link, /^https:\/\/app\.getuplift\.pro\/challenge\?c=[A-Za-z0-9_-]+$/);
  assert.deepEqual(f.readChallenge(link), d);
  assert.deepEqual(f.readChallenge(link.split('c=')[1]), d, 'the code alone works too');
  assert.equal(f.challengeId(d), f.challengeId({ ...d, from: 'Someone else' }), 'same challenge, same id');
  for (const bad of [{ ...d, exerciseId: 'u_custom' }, { ...d, target: -1 }, { ...d, days: 1000 }, { ...d, kind: 'hack' }, { ...d, name: '' }]) {
    assert.equal(f.readChallenge(f.challengeLink(bad as never)), null, JSON.stringify(bad));
  }
  assert.equal(f.readChallenge('https://example.com/?c=%%%'), null);
  assert.equal(f.readChallenge('not a link'), null);
  // Backup keeps the new profile fields, and drops junk.
  l = putProfile(l, l.profiles[0].id, { weeklyGoal: 3, trainDays: [4, 0, 2], trainTime: '07:00', progression: { step: 5 },
    challenges: [{ id: 'plank-3min', start: '2026-09-10' }, { id: f.challengeId(d), start: '2026-09-12', def: d }] });
  const back = parseBackup(serialize(l)).log.profiles[0];
  assert.deepEqual([back.weeklyGoal, back.trainDays, back.trainTime, back.progression], [3, [0, 2, 4], '07:00', { step: 5 }]);
  assert.deepEqual(back.challenges, [{ id: 'plank-3min', start: '2026-09-10' }, { id: f.challengeId(d), start: '2026-09-12', def: d }]);
  const junk = JSON.parse(serialize(l));
  (junk.log ?? junk).profiles[0] = { ...(junk.log ?? junk).profiles[0], weeklyGoal: 99, trainTime: '25:00', challenges: [{ id: 'x', start: 'soon' }, { id: 'y', start: '2026-09-01', def: { kind: 'best' } }] };
  const clean = parseBackup(JSON.stringify(junk)).log.profiles[0];
  assert.deepEqual([clean.weeklyGoal, clean.trainTime, clean.challenges], [undefined, undefined, []]);
});
