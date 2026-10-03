/* Service worker: оболочка приложения кэшируется, чтобы данные можно было смотреть без сети. */
var CACHE = 'pr-shell-v18';
var SHELL = ['./', 'index.html', 'app.js', 'style.css', 'mock-data.js', 'config.js', 'manifest.webmanifest', 'company-banner.jpg', 'admin.html', 'admin.js', 'admin.css',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
  'demo-photos/promo-weekend-1.jpg', 'demo-photos/promo-weekend-2.jpg', 'demo-photos/promo-weekend-3.jpg', 'demo-photos/promo-weekend-4.jpg', 'demo-photos/promo-nodefect-1.jpg',
  'demo-photos/job-brigadier-1.jpg', 'demo-photos/job-brigadier-2.jpg', 'demo-photos/job-brigadier-3.jpg', 'demo-photos/job-forklift-1.jpg', 'demo-photos/job-forklift-2.jpg'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL.map(function (u) { return new Request(u, { cache: 'reload' }); })); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // stale-while-revalidate для своих статических файлов
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (hit) {
    var net = fetch(req).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () { return hit || (req.mode === 'navigate' ? caches.match(/\/admin\.html$/.test(new URL(req.url).pathname) ? 'admin.html' : 'index.html') : Response.error()); });
    return hit || net;
  }));
});
