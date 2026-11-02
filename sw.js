// Offline support: network-first so updates show up right away; the cached app shell
// is only used when offline (or when the network takes longer than a few seconds).
const CACHE = 'dinaplana-v2.0.5';
const TIMEOUT_MS = 3000;
const SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon.svg', 'favicon.ico'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const fromCache = async () =>
      await cache.match(req, { ignoreSearch: true }) || (req.mode === 'navigate' && await cache.match('index.html'));
    const network = fetch(req, { cache: 'no-cache' }).then(res => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    });
    const timeout = new Promise(res => setTimeout(res, TIMEOUT_MS));
    try {
      return await Promise.race([network, timeout.then(fromCache)]) || await network;
    } catch {
      return (await fromCache()) || Response.error();
    }
  }));
});
