// The rest timer between sets: one countdown shared by every screen.
import { useEffect, useState, useSyncExternalStore } from 'react';

let endsAt = 0; // 0: not running
let doneAt = 0; // when it reached zero (shown briefly as "go")
/** What's counting: "Rest", or a yoga hold's "Hold · round 2 of 4". Then the steps still to come, and what to do after the last. */
let label = 'Rest';
let queue: { secs: number; label: string }[] = [];
let onEnd: (() => void) | null = null;
/** Seconds left; 0 while showing "go"; null when hidden. Computed on each tick, so render never reads the clock. */
let left: number | null = null;
let handle: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function tick() {
  const now = Date.now();
  if (endsAt && now >= endsAt) {
    try { navigator.vibrate?.([120, 60, 120]); } catch { /* not supported */ }
    const next = queue.shift();
    if (next) { endsAt = now + next.secs * 1000; label = next.label; }
    else { endsAt = 0; doneAt = now; const f = onEnd; onEnd = null; f?.(); }
  }
  left = endsAt ? Math.ceil((endsAt - now) / 1000) : doneAt && now - doneAt < 4000 ? 0 : null;
  if (left === null && handle) { clearInterval(handle); handle = null; }
  listeners.forEach((f) => f());
}

export function startRest(secs: number) {
  if (secs > 0) startSteps([{ secs, label: 'Rest' }]);
}
/** Count down steps one after another (a vibration between each), then run `done`. */
export function startSteps(steps: { secs: number; label: string }[], done?: () => void) {
  const [first, ...more] = steps.filter((s) => s.secs > 0);
  if (!first) return;
  endsAt = Date.now() + first.secs * 1000;
  label = first.label;
  queue = more;
  onEnd = done ?? null;
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
  queue = [];
  onEnd = null;
  tick();
}

const subscribe = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };
export const useRest = () => useSyncExternalStore(subscribe, () => left);
export const useRestLabel = () => useSyncExternalStore(subscribe, () => label);

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
