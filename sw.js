/* SubTopo-GNSS — Service Worker (PWA + tile cache) */

const APP_CACHE = 'subtopo-app-v1';
const TILE_CACHE = 'subtopo-tiles-v1';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './main.js',
  './manifest.json',
  './assets/logo.svg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable.png',
  './assets/apple-touch-icon.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
];

const TILE_DOMAINS = [
  'a.tile.opentopomap.org', 'b.tile.opentopomap.org', 'c.tile.opentopomap.org',
  'a.tile.openstreetmap.org', 'b.tile.openstreetmap.org', 'c.tile.openstreetmap.org',
  'server.arcgisonline.com',
  'tiles.wmflabs.org',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((name) => name.startsWith('subtopo-') && name !== APP_CACHE && name !== TILE_CACHE)
            .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Cache tiles
  if (TILE_DOMAINS.includes(url.hostname)) {
    event.respondWith(
      caches.open(TILE_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((resp) => {
            if (resp && resp.status === 200) cache.put(event.request, resp.clone());
            return resp;
          }).catch(() => new Response('', { status: 503 }));
        })
      )
    );
    return;
  }

  // App shell: cache-first, fallback network
  if (event.request.method === 'GET' && (url.origin === location.origin || APP_SHELL.some((s) => event.request.url.includes(s)))) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((resp) => {
          if (resp && resp.status === 200) {
            const clone = resp.clone();
            caches.open(APP_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return resp;
        }).catch(() => caches.match('./index.html'));
      })
    );
  }
});
