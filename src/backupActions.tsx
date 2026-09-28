// Backups the person saves themselves (Files, iCloud Drive, Google Drive, email): shared by Home, Settings and Welcome.
// Nothing is ever uploaded by Iron Log; the file goes wherever the share sheet sends it.
import { useState } from 'react';
import { parseBackup, toBackupJSON, toCSV } from './backup';
import { decryptEnvelope, deriveKey, encryptWithKey, isEnvelope, ITERATIONS, newSalt } from './crypto';
import { PassphraseModal } from './components';
import { confirm, notify, pickTextFile, saveFile } from './io';
import { BUILT_IN } from './exercises';
import { plural, today, type Images, type Log } from './model';
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
        if (await saveFile(`ironlog-backup-locked-${today()}.json`, file, 'application/json')) saved();
      },
    });
  }
  async function exportPlain() {
    if (!log) return;
    try { if (await saveFile(`ironlog-backup-${today()}.json`, toBackupJSON(log, images), 'application/json')) saved(); }
    catch (e) { notify('Export failed', (e as Error).message); }
  }
  async function exportCSV() {
    if (!log) return;
    const custom = new Map(log.exercises.map((e) => [`${e.profileId}:${e.id}`, e.name]));
    const builtIn = new Map(BUILT_IN.map((e) => [e.id, e.name]));
    try { await saveFile(`ironlog-sets-${today()}.csv`, toCSV(log, (p, id) => custom.get(`${p}:${id}`) ?? builtIn.get(id) ?? id), 'text/csv'); }
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
  async function restoreFrom(text: string) {
    try {
      const next = parseBackup(text);
      await bringIn(next, 'Restore this backup?', 'Backup restored');
    } catch (e) { notify('Could not restore', (e as Error).message); }
  }

  /** Replace what's here (kept in Undo history), or start with it on first run. */
  async function bringIn(next: { log: Log; images: Images }, title: string, done: string, reason?: string) {
    const n = next.log.profiles.length;
    const summary = `${plural(next.log.entries.length, 'logged exercise')} for ${n === 1 ? '1 person' : `${n} people`}`;
    if (!log) {
      if (!(await confirm(title, `This has ${summary}.`, 'Continue'))) return false;
      await start(next);
    } else {
      const msg = `This has ${summary}. It will replace what is on this device now (${plural(log.entries.length, 'logged exercise')}), which is kept in Undo history so you can go back.`;
      if (!(await confirm(title, msg, 'Replace', true))) return false;
      await replace(next, reason);
    }
    notify(done, `${summary} on this device now.`);
    return true;
  }

  async function chooseLocal() {
    const ok = await confirm('Keep data on this device only?',
      'Nothing is saved anywhere else. If this phone is lost, reset, or the browser clears its data, your Iron Log data is gone for good. Iron Log will remind you every week to save a backup. You can save one any time in Settings.',
      'Keep on this device');
    if (ok) update((l) => ({ ...l, settings: { ...l.settings, backupChoice: 'local' } }));
    return ok;
  }

  const modal = pending ? <PassphraseModal visible mode={pending.mode} onSubmit={pending.onSubmit} onClose={() => setPending(null)} /> : null;
  return { exportLocked, exportPlain, exportCSV, restore, bringIn, chooseLocal, modal };
}
