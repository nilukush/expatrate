/*
 * ExpatRate service worker: offline fallback plus caching for hashed assets.
 * Bump VERSION whenever caches should be rebuilt (deploys change /_astro hashes,
 * and navigations are network-first, so bumping on every deploy is safest).
 * Rates APIs (open.er-api.com, frankfurter.dev) are cross-origin and never
 * intercepted; the app already falls back to its bundled fx snapshot offline.
 */
const VERSION = 'expatrate-v1';
const OFFLINE_URL = '/offline/';
const PRECACHE = [OFFLINE_URL, '/manifest.webmanifest', '/favicon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    // Network first so new deploys win online; the visited page is cached for
    // offline reloads, and anything never visited falls back to the offline page.
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(VERSION).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then((hit) => hit || caches.match(OFFLINE_URL))),
    );
    return;
  }

  if (url.pathname.startsWith('/_astro/') || url.pathname.startsWith('/fonts/') || url.pathname.startsWith('/icons/')) {
    // Content-hashed or immutable: cache first.
    event.respondWith(
      caches.match(event.request).then(
        (hit) =>
          hit ||
          fetch(event.request).then((response) => {
            const copy = response.clone();
            caches.open(VERSION).then((cache) => cache.put(event.request, copy));
            return response;
          }),
      ),
    );
  }
});
