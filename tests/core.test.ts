import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import {
  addExercises, addProfile, addSetTo, clock, pace, parseClock, setTime, topLoad, delProfile, delSetFrom, differsFromTemplate, estOneRM, finishWorkout, fmtSet, getEx, moveExercise,
  delWeighIn, longDate, needsBackupNudge, newLog, planSets, prOf, putExercise, putProfile, putTemplate, putWeighIn, putWorkout, removeExercise, replaceExercise, setKind, setLabels,
  setValue, startWorkout, templateFrom, toggleDone, toggleFav, viewOf, volumeOf, weekStats, workoutStats, type Log, type Workout,
} from '../src/model.ts';
import { csvCell, fromLegacy, parseBackup, serialize, toBackupJSON, toCSV } from '../src/backup.ts';
import { decryptEnvelope, deriveKey, encryptWithKey, isEnvelope, newSalt } from '../src/crypto.ts';
import { BUILT_IN } from '../src/exercises.ts';

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
  w = moveExercise(w, 1, -1);
  assert.deepEqual(w.exercises.map((e) => e.exerciseId), [bench, 'push-up']);
  assert.equal(moveExercise(w, 0, -1), w);
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
  assert.throws(() => parseBackup('{"app":"ledger"}'), /not an Iron Log backup/);
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
  assert.equal(log.schemaVersion, 3);
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

test('fromLegacy: maps the old Firestore layout, keeps profiles apart, tidies bad docs', () => {
  const dump = {
    app: 'ironlog-legacy', currentProfileId: 'p_b', prefs: { rest: 120, theme: 'dark', bw: 72 },
    profiles: {
      p_a: {
        name: 'Asha', ts: 100,
        logs: {
          [`${D1}_${bench}`]: { exerciseId: bench, date: D1, sets: [{ w: 60, r: 8 }, { w: null, r: 5 }], ts: 200 },
          [`${D2}_u_1`]: { exerciseId: 'u_1', date: D2, sets: [], ts: 300 },
          junk: { date: 'soon' },
        },
        sessions: { [D1]: { date: D1, exerciseIds: [bench], startedAt: 1000, endedAt: 500, feeling: 'Easy', ts: 5 } },
        exercises: { u_1: { name: 'Landmine', group: 'Shoulders', equip: 'Landmine', weightType: 'rope?', metric: 'secs', pattern: 'neutral', setup: [], exec: [], avoid: [], ts: 9 }, u_2: { group: 'Legs' } },
        exImg: { [bench]: { img: 'data:image/jpeg;base64,AAAA', ts: 1 }, x: { img: 'http://evil' } },
        favorites: { [bench]: { ts: 7 } },
        templates: { t_1: { name: 'Push', exerciseIds: [bench, 'push-up'], ts: 8 }, t_2: { exerciseIds: [] } },
      },
      p_b: { name: '  ', ts: 101, logs: { [`${D1}_squat`]: { exerciseId: 'squat', date: D1, sets: [{ w: 100, r: 5 }] } } },
    },
  };
  const { log, images } = fromLegacy(JSON.stringify(dump), 999);
  assert.deepEqual(log.profiles.map((p) => [p.id, p.name, p.bodyweight]), [['p_a', 'Asha', 72], ['p_b', 'Me', 0]]);
  assert.equal(log.settings.currentProfileId, 'p_b');
  assert.equal(log.settings.restSecs, 120);
  assert.equal(log.settings.theme, 'dark');
  assert.deepEqual(log.workouts.map((w) => [w.profileId, w.exercises.map((e) => [e.exerciseId, e.sets])]),
    [['p_a', [[bench, [{ w: 60, r: 8 }, { w: 0, r: 5 }]]]], ['p_b', [['squat', [{ w: 100, r: 5 }]]]]]);
  assert.equal(log.workouts.find((w) => w.profileId === 'p_b')!.updatedAt, 999);
  assert.deepEqual(log.exercises.map((e) => [e.id, e.weightType, e.metric]), [['u_1', 'barbell', 'secs']]);
  assert.deepEqual(log.templates.map((t) => [t.name, t.exercises.length]), [['Push', 2]]);
  const w = log.workouts[0];
  assert.equal(w.endedAt, undefined, 'an end before the start is dropped');
  assert.equal(w.feeling, 'Easy');
  assert.deepEqual(images, { [`p_a:${bench}`]: 'data:image/jpeg;base64,AAAA' });
  assert.throws(() => fromLegacy('{"app":"ironlog"}'), /not data from the old Iron Log/);
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

test('built-in library: unique ids; strength has cues and drawings; activities have MET values and a drawing or an icon', () => {
  assert.equal(new Set(BUILT_IN.map((e) => e.id)).size, BUILT_IN.length);
  const frames = (id: string) => [1, 2, 3].every((n) => existsSync(`public/illustrations/${id}/${n}.svg`));
  for (const e of BUILT_IN) {
    if (!e.kind) { assert.ok(e.setup.length && e.exec.length && e.avoid.length, e.id); assert.ok(frames(e.id), `${e.id} frames`); continue; }
    assert.ok(['Cardio', 'Yoga & mobility', 'Sports', 'Classes'].includes(e.group), `${e.id} group`);
    assert.ok(e.met && e.met.length === 3 && e.met[0] <= e.met[1] && e.met[1] <= e.met[2] && e.met[0] >= 1, `${e.id} MET`);
    assert.ok(e.art === false ? !!e.icon : frames(e.id), `${e.id}: a drawing, or an icon`);
  }
  assert.ok(BUILT_IN.filter((e) => e.kind).length >= 30);
  assert.ok(existsSync('public/illustrations/LICENSE.md'), 'the CC BY-SA credit ships with the images');
});

test('built app: served from /Iron-Log/, no third-party requests', { skip: !process.env.REQUIRE_DIST && !existsSync('dist/index.html') }, () => {
  const html = readFileSync('dist/index.html', 'utf8');
  assert.match(html, /src="\/Iron-Log\/_expo\/static\/js\/web\/[^"]+\.js"/);
  assert.ok(!/https?:\/\/(?!www\.w3\.org)/.test(html.replace(/<meta[^>]*>/g, '')), 'no external URLs in the shell');
  assert.ok(existsSync('dist/sw.js') && existsSync('dist/fonts/IBMPlexMono-400.woff2') && existsSync('dist/legacy/index.html'));
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
  assert.deepEqual(v.templates.map((t) => [t.name, t.exercises.map((e) => e.sets)]), [['Push, heavy', [3, 1, 1]]], 'no template for "Evening Workout"');
  parseBackup(serialize(log)); // the result is a valid log

  const again = importStrong(log, csv, 'lb', 100);
  assert.equal(viewOf(again.log).workouts.length, 2, 're-importing never doubles');
  assert.deepEqual([again.summary.replaced, again.summary.templates, again.summary.newExercises], [2, 0, 0]);
  assert.throws(() => importStrong(before, 'Date,Amount\n2026-01-01,5', 'kg'), /Strong export/);
  assert.equal(planSets(viewOf(log), bench).length, 3, 'imported history feeds the next workout\'s plan');
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
  let w = addExercises(active(l), viewOf(l), ['run', 'vinyasa-yoga', bench]);
  assert.deepEqual(w.exercises[0].sets, [{ w: 0, r: 0, done: false }], 'a run: one row');
  assert.deepEqual(w.exercises[1].sets, [{ w: 2, r: 0, done: false }], 'a class: one row, moderate');
  assert.equal(w.exercises[2].sets.length, 3);
  w = setTime(w, 0, 0, '27:30');
  w = setValue(w, 0, 0, 'w', '5');
  w = toggleDone(w, 0, 0).workout;
  w = toggleDone(setValue(setTime(w, 1, 0, '60'), 1, 0, 'w', '3'), 1, 0).workout;
  l = finishWorkout(putWorkout(l, w), w.id, false, at(D1) + 5400_000).log;
  const v = viewOf(l);
  const run = getEx(v, 'run'), yoga = getEx(v, 'vinyasa-yoga');
  assert.equal(fmtSet({ w: 5, r: 1650 }, run), '5 km · 27:30');
  assert.equal(fmtSet({ w: 3, r: 3600 }, yoga), '60 min · Vigorous');
  const runEntry = v.entries.find((e) => e.exerciseId === 'run')!;
  assert.equal(topLoad(runEntry, run, 70), 5, 'cardio charts distance');
  assert.equal(topLoad(v.entries.find((e) => e.exerciseId === 'vinyasa-yoga')!, yoga, 70), 60, 'activities chart minutes');
  assert.equal(prOf(v, 'run'), 0, 'no weight records for cardio');
  assert.equal(volumeOf(runEntry, run, 70), 0);
  assert.equal(estOneRM([runEntry], run, 70), 0);
  const wk = v.workouts[0];
  assert.deepEqual(wk.exercises.map((e) => e.exerciseId), ['run', 'vinyasa-yoga'], 'the unticked bench press is dropped');
  // Logged in a minute, but 87.5 minutes of activity: the workout lasted as long as its activities.
  let q = startWorkout(newLog(), undefined, at(D2));
  q = putWorkout(q, toggleDone(setTime(addExercises(active(q), viewOf(q), ['hatha-yoga']), 0, 0, '45'), 0, 0).workout);
  const y = finishWorkout(q, active(q).id, false, at(D2) + 60_000).workout!;
  assert.equal(y.endedAt! - y.startedAt, 45 * 60_000);
});

test('calories: MET × kg × hours; speed decides running; strength fills the rest of the clock; none without a weight', async () => {
  const { metOf, kcal, workoutCalories, STRENGTH_MET } = await import('../src/calories.ts');
  const v0 = viewOf(newLog());
  const run = getEx(v0, 'run'), yoga = getEx(v0, 'hatha-yoga'), swim = getEx(v0, 'swim');
  assert.equal(metOf(run, { w: 10, r: 3600 }), 9.8 + (10 - 9.7) / (11.3 - 9.7) * (11 - 9.8), '10 km/h');
  assert.equal(metOf(run, { w: 0, r: 1800 }), 9.8, 'no distance: moderate');
  assert.equal(metOf(yoga, { w: 1, r: 1800 }), 2);
  assert.equal(metOf(yoga, { w: 3, r: 1800 }), 3);
  assert.equal(metOf(swim, { w: 1.5, r: 2700 }), 7, 'no speed table: moderate');
  assert.equal(Math.round(kcal(8, 70, 3600)), 560);
  let l = putWeighIn(newLog(), { id: 'b', date: D1, weight: 80, at: 1 });
  assert.equal(workoutCalories(viewOf(newLog()), sample().workouts[0]), null, 'no weight, no estimate');
  l = did(l, D1, [[bench, [[60, 8]]], ['walk', [[4, 3000]]]]); // 1 h clock, 50 min of it walking at 4.8 km/h
  const w = viewOf(l).workouts[0];
  assert.equal(workoutCalories(viewOf(l), w), Math.round(kcal(3.5, 80, 3000) + kcal(STRENGTH_MET, 80, 600)));
});

test('Strong cardio: built-in activities with distance, and version 2 custom cardio converts', async () => {
  const { importStrong } = await import('../src/strong.ts');
  const csv = ['Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE',
    '2026-09-01 07:00:00,Cardio,40m,"Running (Treadmill)",1,0,0.0,5.2,1800.0,,,',
    '2026-09-01 07:00:00,Cardio,40m,"Yoga",1,0,0.0,0,600.0,,,'].join('\n');
  const { log } = importStrong(newLog(), csv, 'kg', 5);
  const ex = viewOf(log).workouts[0].exercises;
  assert.deepEqual(ex.map((e) => [e.exerciseId, e.sets]), [['treadmill', [{ w: 5.2, r: 1800 }]], ['hatha-yoga', [{ w: 2, r: 600 }]]]);
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
