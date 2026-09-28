import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import {
  addProfile, addSet, addToWorkout, delProfile, delSet, endWorkout, estOneRM, fmtSet, getEx, needsBackupNudge, newLog, putExercise,
  removeFromWorkout, repeatLast, startWorkout, toggleFav, updateSet, viewOf, volumeOf, weekStats, workoutExIds, type Log,
} from '../src/model.ts';
import { csvCell, fromLegacy, parseBackup, serialize, toBackupJSON, toCSV } from '../src/backup.ts';
import { decryptEnvelope, deriveKey, encryptWithKey, isEnvelope, newSalt } from '../src/crypto.ts';
import { BUILT_IN } from '../src/exercises.ts';

const D1 = '2026-09-01', D2 = '2026-09-03';
const bench = 'bench-press-bb';

function sample(): Log {
  let l = newLog('Asha', 1);
  l = addSet(l, bench, D1, 10, { w: 60, r: 8 });
  l = addSet(l, bench, D1, 11, { w: 62.5, r: 6 });
  l = addSet(l, 'push-up', D1, 12, { w: 0, r: 20 });
  return l;
}

test('addSet pre-fills from the last set, then from the last session', () => {
  let l = sample();
  l = addSet(l, bench, D2, 20);
  const v = viewOf(l);
  assert.deepEqual(v.entries.find((e) => e.date === D2)!.sets, [{ w: 62.5, r: 6 }]);
  assert.deepEqual(workoutExIds(v, D2), [bench]);
  l = addSet(l, bench, D2, 21);
  assert.equal(viewOf(l).entries.find((e) => e.date === D2)!.sets.length, 2);
});

test('updateSet parses, clamps, and treats blank as zero; delSet drops empty days', () => {
  let l = addSet(sample(), bench, D2, 20);
  l = updateSet(l, bench, 0, 'w', '47,5', D2);
  l = updateSet(l, bench, 0, 'r', '99999999', D2);
  assert.deepEqual(viewOf(l).entries.find((e) => e.date === D2)!.sets[0], { w: 47.5, r: 100_000 });
  l = updateSet(l, bench, 0, 'w', '', D2);
  assert.equal(viewOf(l).entries.find((e) => e.date === D2)!.sets[0].w, 0);
  l = delSet(l, bench, 0, D2);
  assert.equal(viewOf(l).entries.some((e) => e.date === D2), false);
});

test('repeatLast copies the previous session; removeFromWorkout clears the day', () => {
  let l = repeatLast(sample(), bench, D2, 30);
  assert.deepEqual(viewOf(l).entries.find((e) => e.date === D2)!.sets, [{ w: 60, r: 8 }, { w: 62.5, r: 6 }]);
  l = removeFromWorkout(l, bench, D2, 31);
  assert.deepEqual(workoutExIds(viewOf(l), D2), []);
});

test('logging the first set starts the workout clock; a finished workout stays finished', () => {
  let l = addSet(newLog(), bench, D1, 5000, { w: 50, r: 5 });
  assert.equal(viewOf(l).sessions.get(D1)!.startedAt, 5000);
  l = addSet(l, bench, D1, 9000);
  assert.equal(viewOf(l).sessions.get(D1)!.startedAt, 5000);
  l = addSet(endWorkout(l, '', D1, 10_000), bench, D1, 11_000);
  assert.equal(viewOf(l).sessions.get(D1)!.endedAt, 10_000);
  assert.equal(getEx(viewOf(l), 'goblet-squat-x').name, 'Goblet squat x');
  assert.equal(getEx(viewOf(l), 'u_mfx2k9').name, 'Deleted exercise');
});

test('workout timer: start, end with feeling, start again clears the end', () => {
  let l = startWorkout(newLog(), D1, 1000);
  l = endWorkout(l, 'Hard', D1, 61_000);
  let s = viewOf(l).sessions.get(D1)!;
  assert.equal(s.endedAt! - s.startedAt!, 60_000);
  assert.equal(s.feeling, 'Hard');
  l = startWorkout(l, D1, 70_000);
  s = viewOf(l).sessions.get(D1)!;
  assert.equal(s.endedAt, undefined);
  assert.equal(s.feeling, undefined);
});

test('stats: Epley 1RM, dumbbell volume counts both hands, bodyweight adds the person', () => {
  const l = sample();
  const v = viewOf(l);
  const ex = getEx(v, bench);
  assert.equal(Math.round(estOneRM(v.entries.filter((e) => e.exerciseId === bench), ex, 0) * 10) / 10, 76);
  const db = getEx(v, 'flat-db-press');
  assert.equal(volumeOf({ profileId: '', date: D1, exerciseId: db.id, sets: [{ w: 20, r: 10 }], updatedAt: 0 }, db, 0), 400);
  const pu = getEx(v, 'push-up');
  assert.equal(volumeOf(v.entries.find((e) => e.exerciseId === 'push-up')!, pu, 70), 1400);
  assert.equal(fmtSet({ w: 0, r: 20 }, pu), 'BW×20');
  assert.equal(fmtSet({ w: 20, r: 10 }, db), '20/DB×10');
  assert.deepEqual(weekStats(v, D2), { sessions: 1, sets: 3, volume: 60 * 8 + 62.5 * 6 });
});

test('profiles never mix, and deleting one removes only theirs', () => {
  let l = toggleFav(sample(), bench);
  const asha = l.settings.currentProfileId;
  l = addProfile(l, 'Ravi', 5);
  assert.notEqual(l.settings.currentProfileId, asha);
  assert.equal(viewOf(l).entries.length, 0);
  assert.equal(viewOf(l).favorites.length, 0);
  l = addSet(l, bench, D1, 40, { w: 40, r: 10 });
  const ravi = l.settings.currentProfileId;
  l = delProfile(l, asha);
  assert.deepEqual(l.profiles.map((p) => p.id), [ravi]);
  assert.equal(l.entries.length, 1);
  assert.equal(l.favorites.length, 0);
  assert.equal(delProfile(l, ravi), l, 'the last profile is kept');
});

test('parseBackup: round trip, own storage format, and bad files are refused', () => {
  let l = putExercise(addToWorkout(sample(), bench, D2), { id: 'u_x', name: 'Landmine', group: 'Shoulders', equip: 'Landmine', weightType: 'barbell', setup: ['a'], exec: [], avoid: [] });
  l = { ...l, settings: { ...l.settings, backupChoice: 'file', lastBackupAt: 5 } };
  const imgs = { [`${l.settings.currentProfileId}:${bench}`]: 'data:image/jpeg;base64,AAAA' };
  const back = parseBackup(toBackupJSON(l, imgs));
  assert.deepEqual(back.log, l);
  assert.deepEqual(back.images, imgs);
  assert.deepEqual(parseBackup(serialize(l)).log, l);
  assert.deepEqual(parseBackup(serialize(l)).images, {});

  const bad = (mut: (x: any) => void) => { const x = JSON.parse(serialize(l)); mut(x); return () => parseBackup(JSON.stringify(x)); };
  assert.throws(() => parseBackup('nope'), /not valid JSON/);
  assert.throws(() => parseBackup('{"app":"ledger"}'), /not an Iron Log backup/);
  assert.throws(bad((x) => { x.schemaVersion = 99; }), /newer version/);
  assert.throws(bad((x) => { x.entries[0].sets[0].w = 'heavy'; }), /logged exercise #1/);
  assert.throws(bad((x) => { x.entries[0].date = '2026-02-31'; }), /logged exercise #1/);
  assert.throws(bad((x) => { x.entries[0].profileId = 'someone-else'; }), /logged exercise #1/);
  assert.throws(bad((x) => { x.entries.push({ ...x.entries[0] }); }), /logged exercise/);
  assert.throws(bad((x) => { x.profiles = []; }), /no profiles/);
  // A bad photo is dropped, not fatal; one for an unknown profile too.
  const withImgs = JSON.parse(toBackupJSON(l, imgs));
  withImgs.images.x = 'javascript:alert(1)';
  withImgs.images['nobody:bench'] = 'data:image/jpeg;base64,AAAA';
  assert.deepEqual(parseBackup(JSON.stringify(withImgs)).images, imgs);
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
  assert.deepEqual(log.entries.map((e) => [e.profileId, e.exerciseId, e.sets]), [['p_a', bench, [{ w: 60, r: 8 }, { w: 0, r: 5 }]], ['p_b', 'squat', [{ w: 100, r: 5 }]]]);
  assert.equal(log.entries.find((e) => e.profileId === 'p_b')!.updatedAt, 999);
  assert.deepEqual(log.exercises.map((e) => [e.id, e.weightType, e.metric]), [['u_1', 'barbell', 'secs']]);
  assert.deepEqual(log.templates.map((t) => t.name), ['Push']);
  const s = log.sessions[0];
  assert.equal(s.endedAt, undefined, 'an end before the start is dropped');
  assert.equal(s.feeling, 'Easy');
  assert.deepEqual(images, { [`p_a:${bench}`]: 'data:image/jpeg;base64,AAAA' });
  assert.throws(() => fromLegacy('{"app":"ironlog"}'), /not data from the old Iron Log/);
});

test('backup nudge: only when something changed and the last backup is over a week old', () => {
  const day = 86400_000;
  let l = addSet(newLog(), bench, D1, 10 * day, { w: 50, r: 5 });
  assert.equal(needsBackupNudge(l, 12 * day), false);
  assert.equal(needsBackupNudge(l, 18 * day), true);
  l = { ...l, settings: { ...l.settings, lastBackupAt: 18 * day } };
  assert.equal(needsBackupNudge(l, 30 * day), false, 'nothing changed since');
  l = addSet(l, bench, D2, 19 * day, { w: 55, r: 5 });
  assert.equal(needsBackupNudge(l, 24 * day), false);
  assert.equal(needsBackupNudge(l, 26 * day), true);
});

test('CSV: one row per set, formula injection neutralised', () => {
  assert.equal(csvCell('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
  assert.equal(csvCell(-5), '-5');
  const names = new Map(BUILT_IN.map((e) => [e.id, e.name]));
  const csv = toCSV(sample(), (_p, id) => names.get(id) ?? id).trim().split('\r\n');
  assert.equal(csv.length, 4);
  assert.equal(csv[1], `${D1},Asha,Barbell Bench Press,1,60,8`);
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
