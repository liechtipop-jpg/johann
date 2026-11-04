// Service Worker: speichert die App für offline (Spiele gegen den Computer und lokal laufen ohne Netz).
const CACHE = 'pausenplatz-__VERSION__';
const FILES = __FILES__;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/socket.io') || url.pathname.startsWith('/qr/')) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/')));
    return;
  }
  event.respondWith(caches.match(event.request).then((hit) => hit ?? fetch(event.request).then((res) => {
    if (res.ok) caches.open(CACHE).then((cache) => cache.put(event.request, res.clone()));
    return res;
  })));
});
