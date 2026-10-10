/* Service worker: оболочка приложения кэшируется, чтобы данные можно было смотреть без сети. */
var CACHE = 'pr-shell-v38';
var SHELL = ['banks/banks.js', 'banks/absolut.png', 'banks/akbars.png', 'banks/alfa.png', 'banks/atb.png', 'banks/bankkazani.png', 'banks/centrinvest.png', 'banks/crediteurope.png', 'banks/domrf.png', 'banks/homecredit.png', 'banks/khlynov.png', 'banks/mkb.png', 'banks/modul.png', 'banks/mts.png', 'banks/otkritie.png', 'banks/otp.png', 'banks/ozon.png', 'banks/raiffeisen.png', 'banks/renaissance.png', 'banks/rosbank.png', 'banks/sber.png', 'banks/sinara.png', 'banks/sovcom.png', 'banks/tbank.png', 'banks/tochka.png', 'banks/ubrr.png', 'banks/veb.png', 'banks/vtb.png', 'banks/wb.png', 'banks/yandex.png', 'banks/yoomoney.png', 'banks/zenit.png', './', 'index.html', 'app.js', 'style.css', 'mock-data.js', 'config.js', 'manifest.webmanifest', 'company-banner.jpg', 'admin.html', 'admin.js', 'admin.css', 'taxi.html', 'taxi.js', 'taxi.css',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'];   // фото демо-режима в кэш при установке не берём (в боевом режиме они не нужны), они попадают в кэш при первом показе

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
  // код приложения (html, js, css): сначала сеть, чтобы обновления видны сразу; кэш только без сети
  var path = new URL(req.url).pathname;
  if (req.mode === 'navigate' || /\.(html|js|css)$/.test(path)) {
    // cache: 'no-cache' — всегда сверяемся с сервером (GitHub Pages отдаёт max-age=600, без этого телефон до 10 минут видел старый код)
    e.respondWith(fetch(req, { cache: 'no-cache' }).catch(function () { return fetch(req); }).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (hit) {
        return hit || (req.mode === 'navigate' ? caches.match((/\/(admin|taxi)\.html$/.exec(path) || [0, 'index'])[1] + '.html') : Response.error());
      });
    }));
    return;
  }
  // остальное (иконки, логотипы банков): stale-while-revalidate
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (hit) {
    var net = fetch(req).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () { return hit || (req.mode === 'navigate' ? caches.match((/\/(admin|taxi)\.html$/.exec(new URL(req.url).pathname) || [0, 'index'])[1] + '.html') : Response.error()); });
    return hit || net;
  }));
});
