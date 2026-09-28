import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { dayKey, imgKey, newLog, today, viewOf, type Images, type Log, type View } from './model';
import { latestSnapshotAt, takeSnapshot } from './safety';
import { parseBackup, parseImages, serialize } from './backup';
import * as storage from './storage';
import { useColors } from './theme';

const LOG_KEY = 'log:v1';
const IMG_KEY = 'images:v1';
/** Where the old app leaves its data when moving over (see legacy/index.html). */
export const HANDOFF_KEY = 'handoff:v1';

/** Stored data that failed validation, kept untouched so it can be downloaded, never silently overwritten. */
export interface Corrupt { raw: string; error: string }

interface Store {
  ready: boolean;
  log: Log | null;
  images: Images;
  corrupt: Corrupt | null;
  saveError: string | null;
  /** First run: start a new log (optionally from a backup or the old app's data). */
  start(from?: { log: Log; images: Images }): Promise<void>;
  update(fn: (l: Log) => Log): void;
  /** Set or clear the current person's photo for an exercise. */
  setImage(exerciseId: string, uri: string | null): void;
  /** Swap in a whole log (restore / undo). The current one goes to undo history first. */
  replace(next: { log: Log; images?: Images }, reason?: string): Promise<void>;
  erase(): Promise<void>;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const snapDay = useRef<string | null>(null); // day of the latest undo snapshot
  const [log, setLog] = useState<Log | null>(null);
  const [images, setImages] = useState<Images>({});
  const [corrupt, setCorrupt] = useState<Corrupt | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const ref = useRef<{ log: Log | null; images: Images }>({ log: null, images: {} });

  // Single serial write queue for every write: one in flight, latest value per key wins, never out of order.
  const q = useRef<{ pending: Map<string, string>; drain: Promise<void> | null; error: Error | null }>({ pending: new Map(), drain: null, error: null });
  const persist = useCallback((key: string, value: string) => {
    q.current.pending.set(key, value);
    q.current.drain ??= (async () => {
      try {
        while (q.current.pending.size) {
          const [k, v] = q.current.pending.entries().next().value!;
          q.current.pending.delete(k);
          await storage.setItem(k, v);
        }
        q.current.error = null;
        setSaveError(null);
        storage.notifyChange();
      } catch (e) {
        q.current.error = e as Error;
        setSaveError(`Couldn't save your latest change (${(e as Error).message}). Export a backup now.`);
      } finally {
        q.current.drain = null;
        // A change that arrived while a failed write was in flight is still waiting: give it its own attempt.
        const left = q.current.pending.entries().next().value;
        if (left) persistRef.current(left[0], left[1]);
      }
    })();
  }, []);
  const persistRef = useRef(persist); // persist never changes (no deps), so the first value is the only one
  const idle = async () => { while (q.current.drain) await q.current.drain; };

  const show = useCallback((l: Log | null, imgs: Images) => {
    ref.current = { log: l, images: imgs };
    setLog(l);
    setImages(imgs);
    setCorrupt(null);
  }, []);

  const load = useCallback(async () => {
    const latest = await latestSnapshotAt();
    snapDay.current = latest ? dayKey(new Date(latest)) : null;
    const raw = await storage.getItem(LOG_KEY);
    if (!raw) return show(null, {});
    let imgs: Images = {};
    try { imgs = parseImages(JSON.parse((await storage.getItem(IMG_KEY)) ?? '{}')); } catch { /* photos are optional */ }
    try {
      show(parseBackup(raw).log, imgs); // own data is validated too
    } catch (e) {
      ref.current = { log: null, images: imgs };
      setLog(null);
      setCorrupt({ raw, error: (e as Error).message });
    }
  }, [show]);

  useEffect(() => {
    (async () => {
      try {
        await load();
      } catch (e) {
        setSaveError(`Couldn't open your data: ${(e as Error).message}`);
      }
      storage.requestPersistence();
      setReady(true);
    })();
    // Another tab wrote → reload, unless we have our own write in flight (ours is newer and will notify them).
    // ponytail: last-writer-wins across tabs; fine for one person, not for simultaneous multi-tab editing.
    return storage.onExternalChange(() => { if (!q.current.drain) load().catch(() => {}); });
  }, [load]);

  const store = useMemo<Store>(() => {
    // Swap in a whole new log (import / erase / undo) through the same queue; throws if it couldn't be saved.
    const swap = async (next: Log, imgs: Images | undefined, reason = 'Before restore') => {
      // The undo point must exist before anything is replaced: if it can't be written, stop (the caller shows why).
      const before = ref.current.log;
      if (before) await takeSnapshot(before, reason);
      // An edit that landed while the snapshot was being written must not be lost either.
      if (ref.current.log && ref.current.log !== before) await takeSnapshot(ref.current.log, reason);
      const nextImgs = imgs ?? ref.current.images;
      show(next, nextImgs);
      persist(LOG_KEY, serialize(next));
      if (imgs) persist(IMG_KEY, JSON.stringify(imgs));
      await idle();
      if (q.current.error) throw q.current.error;
    };
    return {
      ready, log, images, corrupt, saveError,
      async start(from) {
        await swap(from?.log ?? newLog(), from?.images ?? {}, 'Before start');
      },
      update(fn) {
        const cur = ref.current.log;
        if (!cur) return;
        // First change of the day: keep the previous state in undo history.
        if (snapDay.current !== today()) {
          snapDay.current = today();
          takeSnapshot(cur, 'Start of day').catch(() => {}); // best effort; never blocks a save
        }
        const next = fn(cur);
        if (next === cur) return;
        ref.current = { ...ref.current, log: next };
        setLog(next);
        persist(LOG_KEY, serialize(next));
      },
      setImage(exerciseId, uri) {
        const cur = ref.current.log;
        if (!cur) return;
        const key = imgKey(cur.settings.currentProfileId, exerciseId);
        const { [key]: _old, ...rest } = ref.current.images;
        const next = uri ? { ...rest, [key]: uri } : rest;
        ref.current = { ...ref.current, images: next };
        setImages(next);
        persist(IMG_KEY, JSON.stringify(next));
      },
      replace: (next, reason) => swap(next.log, next.images, reason),
      async erase() {
        // If the old data was unreadable, keep a copy under a side key rather than destroying it.
        if (corrupt) await storage.setItem(`${LOG_KEY}:unreadable:${Date.now()}`, corrupt.raw);
        await swap(newLog(), {}, 'Before erase');
      },
    };
  }, [ready, log, images, corrupt, saveError, persist, show]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside StoreProvider');
  return s;
}

/** Inside the app (after Welcome), the log is always there. `v` is the current person's slice of it. */
export function useLog(): Store & { log: Log; v: View; photo: (exerciseId: string) => string | undefined } {
  const s = useStore();
  const log = s.log!;
  const v = useMemo(() => viewOf(log), [log]);
  const pid = log.settings.currentProfileId;
  return { ...s, log, v, photo: (id) => s.images[imgKey(pid, id)] };
}

export function useTheme() {
  const { log } = useStore();
  return useColors(log?.settings.theme ?? 'system');
}
