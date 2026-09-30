// Multi-RP Studio – Service Worker
// Macht die App installierbar und offline startbar.
// KI-Anfragen (POST, fremde APIs) werden NIE zwischengespeichert.
const CACHE = 'mrp-v1';
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = FONT_HOSTS.includes(url.hostname);
  if (!sameOrigin && !isFont) return; // KI-APIs, Avatare usw. gehen direkt ins Netz

  if (sameOrigin) {
    // Netz zuerst: Updates von GitHub kommen sofort an, offline hilft der Cache
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
  } else {
    // Schriften: Cache zuerst
    e.respondWith(
      caches.match(req).then(r => r || fetch(req).then(res => {
        const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
      }))
    );
  }
});
