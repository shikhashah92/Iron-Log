// Uplift service worker: the app opens instantly and works offline. Data itself lives in IndexedDB, not here.
// Everything is relative to the worker's scope, so it works at a domain's root or in a sub-folder.
// ponytail: old hashed bundles are dropped only when CACHE is bumped; fine for a few-MB app.
const CACHE = 'uplift-v3';
importScripts('reminder-ics.js'); // self.reminderICS
const ROOT = new URL(self.registration.scope).pathname; // "/" on the app's own domain
const at = (p) => ROOT + p;
const SHELL = ['', 'manifest.webmanifest', 'icon-192.png', 'apple-touch-icon.png',
  'favicon.svg', 'brand/mark.svg', 'brand/mark-reversed.svg', 'brand/mark-black.svg', 'fonts/Archivo-latin.woff2',
  'splash/dark.svg', 'splash/light.svg'].map(at);

/** Cache whatever of `urls` isn't cached yet (hashed files never change, so what's here is current). */
async function addMissing(cache, urls) {
  const have = await Promise.all(urls.map((u) => cache.match(u)));
  await cache.addAll(urls.filter((_, i) => !have[i]));
}
/** Cache the JS bundle a shell loads, and the icon fonts the bundle loads, so that shell opens offline. */
async function keepCode(cache, html) {
  const scripts = [...html.matchAll(/src="([^"]*\/_expo\/static\/[^"]+)"/g)].map((m) => m[1]);
  await addMissing(cache, scripts);
  const js = (await Promise.all(scripts.map(async (s) => (await cache.match(s)).text()))).join('');
  await addMissing(cache, [...new Set([...js.matchAll(/"(\/[^"]*assets\/[^"]+\.ttf)"/g)].map((m) => m[1]))]);
}

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL);
    await keepCode(cache, await (await cache.match(ROOT)).text());
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
    const q = (k) => url.searchParams.get(k) ?? '';
    const ics = every ? self.reminderICS(every, q('day'))
      : url.pathname.endsWith('/training.ics') ? self.trainingICS(q('days'), q('time'), q('day')) : null;
    if (ics) e.respondWith(new Response(ics, { headers: { 'Content-Type': 'text/calendar; charset=utf-8' } }));
    return;
  }
  if (req.mode === 'navigate') {
    // Network first so deploys show up; the cached shell when offline. Every route uses the same shell
    // (GitHub Pages serves deep links as 404.html, a copy of the shell: use it, but only cache real 200s).
    const net = fetch(req);
    // A new release's shell replaces the cached one only once its bundle is cached too: else, on a weak signal, the
    // next launch would open a shell whose code isn't here and wait on the splash. If it doesn't all arrive, the old
    // shell stays and the next launch tries again. Only ever the app page itself is kept as the shell.
    e.waitUntil(net.then(async (res) => {
      if (!res.ok || !(res.headers.get('content-type') ?? '').includes('text/html')) return;
      const html = await res.clone().text(), c = await caches.open(CACHE);
      await keepCode(c, html);
      await c.put(ROOT, new Response(html, { headers: res.headers }));
    }).catch(() => {}));
    // A weak signal (the gym) can leave the request hanging for a minute with a blank screen: after 3 s, open the
    // cached shell instead; the network copy still lands in the cache for next time. No cached shell yet: keep waiting.
    const slow = new Promise((ok) => setTimeout(ok, 3000)).then(() => caches.match(ROOT));
    e.respondWith(Promise.race([net, slow]).then((res) => res ?? net).catch(() => caches.match(ROOT)));
    return;
  }
  // Hashed static files never change: cache first, fill the cache on first use.
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  })));
});
