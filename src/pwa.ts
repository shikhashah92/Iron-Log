// PWA glue: service worker (offline + instant start) and the "Install app" prompt.
import { useEffect, useState } from 'react';

/** Where the app is served from, e.g. "/Iron-Log/" on GitHub Pages (set by experiments.baseUrl). */
export const BASE = `${process.env.EXPO_BASE_URL ?? ''}/`;

type InstallEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> };
let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => f());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as InstallEvent; emit(); });
  window.addEventListener('appinstalled', () => { deferred = null; emit(); });
  // Dev server rebuilds constantly; caching there would only serve stale bundles.
  if (!__DEV__ && 'serviceWorker' in navigator) {
    // The bundle often runs after `load` has already fired, so register right away in that case.
    const register = () => navigator.serviceWorker.register(`${BASE}sw.js`).catch(() => {});
    if (document.readyState === 'complete') register(); else window.addEventListener('load', register);
  }
}

export const isStandalone = () =>
  typeof window !== 'undefined' && (matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true);
/** The old app kept a copy of its data in this browser's localStorage: a sure sign someone is moving over. */
export const hadOldApp = () => { try { return localStorage.getItem('ironlog.profiles.v1') != null; } catch { return false; } };
export const isIOS = () => typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);

/** canInstall: the browser offered a native install prompt (Chrome/Edge/Android). iOS needs Share → Add to Home Screen. */
export function useInstall() {
  const [, tick] = useState(0);
  useEffect(() => {
    const f = () => tick((n) => n + 1);
    listeners.add(f);
    return () => { listeners.delete(f); };
  }, []);
  return {
    canInstall: !!deferred,
    async install() {
      if (!deferred) return;
      await deferred.prompt();
      await deferred.userChoice;
      deferred = null;
      emit();
    },
  };
}
