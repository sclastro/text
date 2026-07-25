// 中文工具箱 — service worker: cache app shell for offline use
const VERSION = 'v2';
const CACHE = `cjk-toolbox-${VERSION}`;

const PRECACHE = [
  './',
  'index.html',
  'manifest.json',
  'css/style.css',
  'js/main.js',
  'data/cangjie.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'js/tools/base64.js',
  'js/tools/cangjie.js',
  'js/tools/charfreq.js',
  'js/tools/chinesenum.js',
  'js/tools/converter.js',
  'js/tools/csv.js',
  'js/tools/fullwidth.js',
  'js/tools/json.js',
  'js/tools/lunar.js',
  'js/tools/markdown.js',
  'js/tools/mojibake.js',
  'js/tools/punctuation.js',
  'js/tools/qrcode.js',
  'js/tools/romanize.js',
  'js/tools/timezone.js',
  'js/tools/unicode.js',
  'js/tools/units.js',
  'js/tools/unshorten.js',
  'js/tools/urlencode.js',
  'js/tools/whitespace.js',
  'js/tools/wordcount.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const isSameOrigin = new URL(req.url).origin === self.location.origin;

  if (isSameOrigin) {
    // app shell: cache-first, refresh in background
    event.respondWith(
      caches.match(req).then(cached => {
        const network = fetch(req).then(res => {
          if (res && res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
  } else {
    // CDN libraries: network-first so updates are picked up, fall back to cache offline
    event.respondWith(
      fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) caches.open(CACHE).then(c => c.put(req, res.clone()));
        return res;
      }).catch(() => caches.match(req))
    );
  }
});
