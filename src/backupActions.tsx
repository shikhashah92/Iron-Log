// Backups the person saves themselves (Files, iCloud Drive, Google Drive, email): shared by Home, Settings and Welcome.
// Nothing is ever uploaded by Uplift; the file goes wherever the share sheet sends it.
import { useState } from 'react';
import { parseBackup, toBackupJSON, toCSV } from './backup';
import { decryptEnvelope, deriveKey, encryptWithKey, isEnvelope, ITERATIONS, newSalt } from './crypto';
import { PassphraseModal } from './components';
import { choose, confirm, notify, pickTextFile, saveFile } from './io';
import { BUILT_IN } from './exercises';
import { dayKey, fmtKg, longDate, plural, today, viewOf, type Images, type Log } from './model';
import { importStrong, strongHeaderUnit } from './strong';
import { useStore } from './store';

type Pending = { mode: 'set' | 'enter'; onSubmit: (pass: string) => Promise<void> } | null;

export function useBackup() {
  const { log, images, update, replace, start } = useStore();
  const [pending, setPending] = useState<Pending>(null);
  const saved = () => update((l) => ({ ...l, settings: { ...l.settings, lastBackupAt: Date.now(), backupChoice: l.settings.backupChoice ?? 'file' } }));

  /** Locked with a passphrase: safe to keep in any cloud drive or email. */
  function exportLocked() {
    if (!log) return;
    setPending({
      mode: 'set',
      onSubmit: async (pass) => {
        const salt = newSalt();
        const file = await encryptWithKey(await deriveKey(pass, salt), salt, ITERATIONS, toBackupJSON(log, images));
        setPending(null);
        if (await saveFile(`uplift-backup-locked-${today()}.json`, file, 'application/json')) saved();
      },
    });
  }
  async function exportPlain() {
    if (!log) return;
    try { if (await saveFile(`uplift-backup-${today()}.json`, toBackupJSON(log, images), 'application/json')) saved(); }
    catch (e) { notify('Export failed', (e as Error).message); }
  }
  async function exportCSV() {
    if (!log) return;
    const custom = new Map(log.exercises.map((e) => [`${e.profileId}:${e.id}`, e.name]));
    const builtIn = new Map(BUILT_IN.map((e) => [e.id, e.name]));
    try { await saveFile(`uplift-sets-${today()}.csv`, toCSV(log, (p, id) => custom.get(`${p}:${id}`) ?? builtIn.get(id) ?? id), 'text/csv'); }
    catch (e) { notify('Export failed', (e as Error).message); }
  }

  async function restore() {
    try {
      const text = await pickTextFile();
      if (!text) return;
      if (!isEnvelope(text)) return await restoreFrom(text);
      setPending({ mode: 'enter', onSubmit: async (pass) => { const plain = await decryptEnvelope(text, pass); setPending(null); await restoreFrom(plain); } });
    } catch (e) { notify('Could not restore', (e as Error).message); }
  }
  /** Open a backup file and say what's in it, without changing anything here: proof it can be restored. */
  async function verify() {
    const report = (plain: string) => {
      const { log: b } = parseBackup(plain);
      let when = '';
      try { const at = JSON.parse(plain).exportedAt; if (typeof at === 'string' && !Number.isNaN(Date.parse(at))) when = ` It was saved on ${longDate(dayKey(new Date(at)))}.`; } catch { /* no date: fine */ }
      notify('This backup opens fine', `${plural(b.workouts.length, 'workout')}, ${plural(b.weighIns.length, 'weigh-in')} and ${plural(b.templates.length, 'template')} for ${plural(b.profiles.length, 'person').replace('persons', 'people')}.${when} Nothing on this device was changed.`);
    };
    try {
      const text = await pickTextFile();
      if (!text) return;
      if (!isEnvelope(text)) return report(text);
      setPending({ mode: 'enter', onSubmit: async (pass) => { const plain = await decryptEnvelope(text, pass); setPending(null); try { report(plain); } catch (e) { notify('This file can’t be restored', (e as Error).message); } } });
    } catch (e) { notify('This file can’t be restored', (e as Error).message); }
  }
  async function restoreFrom(text: string) {
    try {
      const next = parseBackup(text);
      await bringIn(next, 'Restore this backup?', 'Backup restored');
    } catch (e) { notify('Could not restore', (e as Error).message); }
  }

  /** Replace what's here (kept in Undo history), or start with it on first run. */
  async function bringIn(next: { log: Log; images: Images }, title: string, done: string, reason?: string) {
    const n = next.log.profiles.length;
    const summary = `${plural(next.log.workouts.length, 'workout')} for ${n === 1 ? '1 person' : `${n} people`}`;
    if (!log) {
      if (!(await confirm(title, `This has ${summary}.`, 'Continue'))) return false;
      await start(next);
    } else {
      const msg = `This has ${summary}. It will replace what is on this device now (${plural(log.workouts.length, 'workout')}), which is kept in Undo history so you can go back.`;
      if (!(await confirm(title, msg, 'Replace', true))) return false;
      await replace(next, reason);
    }
    notify(done, `${summary} on this device now.`);
    return true;
  }

  async function chooseLocal() {
    const ok = await confirm('Keep data on this device only?',
      'Nothing is saved anywhere else. If this phone is lost, reset, or the browser clears its data, your Uplift data is gone for good. Uplift will remind you every week to save a backup. You can save one any time in Settings.',
      'Keep on this device');
    if (ok) update((l) => ({ ...l, settings: { ...l.settings, backupChoice: 'local' } }));
    return ok;
  }

  const modal = pending ? <PassphraseModal visible mode={pending.mode} onSubmit={pending.onSubmit} onClose={() => setPending(null)} /> : null;
  /** Strong's CSV export, merged into the current person (nothing already logged is changed). */
  async function importFromStrong() {
    if (!log) return;
    try {
      const text = await pickTextFile('text/csv,.csv');
      if (!text) return;
      // Strong exports in whatever unit you used in the app; only newer files say which.
      const unit = strongHeaderUnit(text)
        ?? (await choose('Which unit did you use in Strong?', 'So the weights come in right.', 'Kilograms', 'Pounds') ? 'kg' : 'lb');
      const { log: next, summary: s } = importStrong(log, text, unit);
      const who = log.profiles.find((p) => p.id === log.settings.currentProfileId)?.name ?? 'you';
      const msg = [
        `${plural(s.workouts, 'workout')} (${plural(s.sets, 'set')}) from ${s.from} to ${s.to}, added to ${who}.`,
        `${s.matched} exercises match Uplift’s library; ${plural(s.newExercises, 'new custom exercise')}.`,
        s.templates ? `${plural(s.templates, 'workout name')} saved as templates.` : '',
        `Heaviest set: ${fmtKg(s.heaviest, viewOf(next).unit)}.`,
        s.replaced ? `${plural(s.replaced, 'workout')} already on those ${plural(s.days, 'day')} (e.g. an earlier import) will be replaced.` : '',
        s.notes ? `Set notes (${s.notes}) aren’t imported.` : '',
        'Your current data is kept in Undo history first.',
      ].filter(Boolean).join(' ');
      if (!(await confirm(s.replaced ? 'Re-import from Strong?' : 'Import from Strong?', msg, 'Import'))) return;
      await replace({ log: next }, 'Before Strong import');
      notify('Imported from Strong', `${plural(s.workouts, 'workout')} are in History now.`);
    } catch (e) { notify('Could not import', (e as Error).message); }
  }

  return { exportLocked, exportPlain, exportCSV, restore, verify, importFromStrong, bringIn, chooseLocal, modal };
}
