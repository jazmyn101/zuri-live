// Offline cache: the pose model and app files load from the phone after the first visit.
const CACHE = 'zuri-live-v3';
const CORE = ['./', 'index.html', 'js/app.js', 'js/camera.js', 'js/exercises.js', 'js/geom.js', 'js/program.js', 'js/fig.js', 'vendor/vision_bundle.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  const big = /\/vendor\//.test(url.pathname);
  if (big) {   // model + wasm: cache first, they never change for a given version
    e.respondWith(caches.open(CACHE).then(async c => (await c.match(req)) || fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; })));
    return;
  }
  // app files and fonts: use the network when there is one, fall back to the cache
  e.respondWith(fetch(req).then(r => { if (r.ok && (url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com/.test(url.host))) caches.open(CACHE).then(c => c.put(req, r.clone())); return r; }).catch(() => caches.match(req)));
});
