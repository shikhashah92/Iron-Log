// The rest timer between sets: one countdown shared by every screen.
import { useEffect, useState, useSyncExternalStore } from 'react';

let endsAt = 0; // 0: not running
let doneAt = 0; // when it reached zero (shown briefly as "go")
/** Seconds left; 0 while showing "go"; null when hidden. Computed on each tick, so render never reads the clock. */
let left: number | null = null;
let handle: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function tick() {
  const now = Date.now();
  if (endsAt && now >= endsAt) {
    endsAt = 0;
    doneAt = now;
    try { navigator.vibrate?.([120, 60, 120]); } catch { /* not supported */ }
  }
  left = endsAt ? Math.ceil((endsAt - now) / 1000) : doneAt && now - doneAt < 4000 ? 0 : null;
  if (left === null && handle) { clearInterval(handle); handle = null; }
  listeners.forEach((f) => f());
}

export function startRest(secs: number) {
  if (secs <= 0) return;
  endsAt = Date.now() + secs * 1000;
  doneAt = 0;
  handle ??= setInterval(tick, 250);
  tick();
}
export function adjustRest(secs: number) {
  if (!endsAt) return;
  endsAt = Math.max(Date.now(), endsAt + secs * 1000);
  tick();
}
export function stopRest() {
  endsAt = 0;
  doneAt = 0;
  tick();
}

const subscribe = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };
export const useRest = () => useSyncExternalStore(subscribe, () => left);

/** The current time, updated every second while `on` (the live workout clock). */
export function useNow(on: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [on]);
  return now;
}
