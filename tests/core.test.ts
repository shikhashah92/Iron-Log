import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import {
  addExercises, addProfile, addSetTo, delProfile, delSetFrom, differsFromTemplate, estOneRM, finishWorkout, fmtSet, getEx, moveExercise,
  needsBackupNudge, newLog, planSets, prOf, putExercise, putTemplate, putWorkout, removeExercise, replaceExercise, setKind, setLabels,
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
  assert.equal(log.schemaVersion, 2);
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

test('built-in library: unique ids, every exercise has cues and three illustration frames', () => {
  assert.equal(new Set(BUILT_IN.map((e) => e.id)).size, BUILT_IN.length);
  for (const e of BUILT_IN) {
    assert.ok(e.setup.length && e.exec.length && e.avoid.length, e.id);
    for (const n of [1, 2, 3]) assert.ok(existsSync(`public/illustrations/${e.id}/${n}.svg`), `${e.id} frame ${n}`);
  }
  assert.ok(existsSync('public/illustrations/LICENSE.md'), 'the CC BY-SA credit ships with the images');
});

// The release gate (npm run check) builds first; make sure the built app would work from GitHub Pages' sub-folder.
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
