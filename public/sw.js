// Uplift service worker: the app opens instantly and works offline. Data itself lives in IndexedDB, not here.
// Everything is relative to the worker's scope, so it works at a domain's root or in a sub-folder.
// ponytail: old hashed bundles are dropped only when CACHE is bumped; fine for a few-MB app.
const CACHE = 'uplift-v1';
importScripts('reminder-ics.js'); // self.reminderICS
const ROOT = new URL(self.registration.scope).pathname; // "/" on the app's own domain
const at = (p) => ROOT + p;
const SHELL = ['', 'manifest.webmanifest', 'icon-192.png', 'apple-touch-icon.png',
  'fonts/BarlowCondensed-600.woff2', 'fonts/BarlowCondensed-700.woff2', 'fonts/IBMPlexMono-400.woff2', 'fonts/IBMPlexMono-500.woff2'].map(at);

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL);
    // Precache the current JS bundle referenced by the shell so the very next launch works offline.
    const html = await (await cache.match(ROOT)).text();
    const scripts = [...html.matchAll(/src="([^"]*\/_expo\/static\/[^"]+)"/g)].map((m) => m[1]);
    await cache.addAll(scripts);
    // …and the icon font the bundle loads, so icons render offline too.
    const js = (await Promise.all(scripts.map(async (s) => (await cache.match(s)).text()))).join('');
    await cache.addAll([...new Set([...js.matchAll(/"(\/[^"]*assets\/[^"]+\.ttf)"/g)].map((m) => m[1]))]);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  // "Add to calendar": the event is made right here, starting on the day asked for, so nothing goes over the network.
  // (Without this worker the request reaches the static fallback in reminders/, which starts in January 2026.)
  if (url.pathname.startsWith(at('reminders/'))) {
    const every = /weigh-in-(daily|3x|weekly)\.ics$/.exec(url.pathname)?.[1];
    const ics = every && self.reminderICS(every, url.searchParams.get('day') ?? '');
    if (ics) e.respondWith(new Response(ics, { headers: { 'Content-Type': 'text/calendar; charset=utf-8' } }));
    return;
  }
  if (req.mode === 'navigate') {
    // Network first so deploys show up; the cached shell when offline. Every route uses the same shell
    // (GitHub Pages serves deep links as 404.html, a copy of the shell: use it, but only cache real 200s).
    e.respondWith(fetch(req).then((res) => {
      // Only ever the app page itself is kept as the shell.
      if (res.ok && (res.headers.get('content-type') ?? '').includes('text/html')) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(ROOT, copy)); }
      return res;
    }).catch(() => caches.match(ROOT)));
    return;
  }
  // Hashed static files never change: cache first, fill the cache on first use.
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  })));
});
