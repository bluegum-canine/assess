// Offline cache. Online: always fetch the latest (3s limit). No signal: serve the saved copy.
const CACHE = 'assess-v6';
const ASSETS = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-512.png', 'logo.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const saved = () => c.match(e.request, { ignoreSearch: true }).then(r => r || c.match('index.html'));
    try {
      const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 3000);
      const r = await fetch(e.request.url, { cache: 'no-cache', signal: ctl.signal });
      clearTimeout(timer);
      if (r.ok) { c.put(e.request, r.clone()); return r; }
      return (await saved()) || r;
    } catch (err) { return saved(); }
  }));
});
