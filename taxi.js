/* Учёт такси «Мои выплаты». Отдельная страница taxi.html (прямой адрес, ссылки из приложения сотрудников нет). Вход двух видов:
   админ — админ-код из Telegram (общий ключ сессии pr.admin.session с кабинетом админа); сотрудник — код по номеру телефона (codeRequest/codeVerify
   с purpose:'taxi', личное сообщение «Вход в учёт такси»), отдельный ключ сессии pr.taxi.session. Сотрудник видит и правит только свои поездки,
   итогов «по людям» у него нет; админ видит всех. Безопасность вывода: любой текст попадает в DOM только через textContent (функция h());
   inline-скриптов и стилей нет (CSP). Демо (config.js без реального API): вымышленные поездки в localStorage браузера, код входа показан на экране.
   Live: Apps Script, действия taxiList / taxiAdd / taxiUpdate / taxiDelete / taxiFileLink (токен админа или сотрудника; права проверяет сервер). */
(function () {
  'use strict';
  var APPC = window.APP_CONFIG || {}, LIVE = APPC.mode === 'live' && /^https:\/\//.test(APPC.backendUrl || '');
  var qs = new URLSearchParams(location.search), LAT = LIVE ? 0 : qs.has('lat') ? +qs.get('lat') : 150;
  var WHOK = 'pr.admin.who', SESSK = 'pr.admin.session', EMPK = 'pr.taxi.session', DEMOK = 'pr.taxi.demo', THEMEK = 'pr.theme', LASTK = 'pr.taxi.last', NBSP = '\u00a0', DEMO_CODE = '4821', BOT_URL = /^https:\/\/t\.me\/[A-Za-z][A-Za-z0-9_]{4,31}$/.test(String(APPC.loginBotUrl || '')) ? APPC.loginBotUrl : 'https://t.me/tableworks_bot', BOT_NAME = '@' + BOT_URL.replace(/^.*\//, '');

  /* ---------- настройки (правятся здесь; на сервере список маршрутов задаётся в Code.gs: TAXI_ROUTES_ или Script Property TAXI_ROUTES) ---------- */
  var OTHER = 'Другое';
  var ROUTES = ['Общежитие Останкино → склад Северная Звезда', 'Склад Северная Звезда → общежитие Останкино', 'Общежитие Усковский проезд → склад д. Елино, К21', 'Склад д. Елино, К21 → общежитие Усковский проезд'];   // запасной список для демо; в live приходит с сервера (taxiList.routes)
  var LIM = { maxAmount: 100000, maxPeople: 8, note: 200, names: 400, other: 80, reason: 200, reasonMin: 3, periodDays: 400, daysBack: 400,
    imgSrcMB: 25, pdfMB: 5, imgOutBytes: 1572864, dupMs: 120000 };   // как у остальных загрузок: фото до 25 МБ на входе, на сервер уходит JPEG ≤ 1,5 МБ; PDF до 5 МБ
  var MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'], DOW = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

  /* ---------- утилиты ---------- */
  function h(tag, props) {
    var el = document.createElement(tag), i, k, v; props = props || {};
    for (k in props) { v = props[k]; if (v == null || v === false) continue; if (k === 'class') el.className = v; else if (k === 'text') el.textContent = v; else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v); else el.setAttribute(k, v === true ? '' : v); }
    for (i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, c) { if (c == null || c === false) return; if (Array.isArray(c)) { c.forEach(function (x) { add(el, x); }); return; } el.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c))); }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
  function $(s, r) { return (r || document).querySelector(s); }
  function delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function plural(n, f) { var a = Math.abs(n) % 100, b = a % 10; return f[(a > 10 && a < 20) ? 2 : b > 1 && b < 5 ? 1 : b === 1 ? 0 : 2]; }
  function r2(x) { return Math.round(x * 100) / 100; }
  function money(n) {   // 850 → «850 ₽», 1200.5 → «1 200,50 ₽»
    n = r2(+n || 0); var neg = n < 0, s = Math.abs(n).toFixed(2), p = s.split('.'), whole = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
    return (neg ? '−' : '') + whole + (p[1] === '00' ? '' : ',' + p[1]) + NBSP + '₽';
  }
  function dmy(s) { var a = String(s || '').slice(0, 10).split('-'); return a.length === 3 ? a[2] + '.' + a[1] + '.' + a[0] : String(s || ''); }
  function dowOf(s) { var a = String(s).split('-'); return DOW[new Date(Date.UTC(+a[0], +a[1] - 1, +a[2])).getUTCDay()]; }
  function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* квота */ } }
  function load(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }

  /* ---------- данные устройства для сообщения админу о запросе кода (без токенов; постоянный случайный deviceId в localStorage) ---------- */
  var DEVK = 'pr.deviceId', devMem = '';
  function deviceId() {
    var id = ''; try { id = localStorage.getItem(DEVK) || ''; } catch (e) { id = ''; }
    if (/^[a-f0-9]{24}$/.test(id)) return id;
    if (/^[a-f0-9]{24}$/.test(devMem)) return devMem;
    var a = new Uint8Array(12); try { crypto.getRandomValues(a); } catch (e) { for (var i = 0; i < 12; i++) a[i] = Math.floor(Math.random() * 256); }
    id = ''; for (var j = 0; j < 12; j++) id += ('0' + a[j].toString(16)).slice(-2);
    devMem = id; try { localStorage.setItem(DEVK, id); } catch (e2) { /* приватный режим: id живёт до закрытия вкладки */ }
    return id;
  }
  function uaShort(ua) {   // «Android 13 · Pixel 7 · Chrome 120»: ОС, модель (если есть), браузер
    ua = String(ua || ''); var os = '', model = '', br = '', m;
    if ((m = /Android ([\d.]+)/.exec(ua))) { os = 'Android ' + m[1].split('.')[0]; var mm = /Android [\d.]+; ([^;)]+?)(?: Build|\)|;)/.exec(ua); if (mm && mm[1] !== 'K' && !/^Linux/.test(mm[1])) model = mm[1]; }
    else if (/iPhone|iPad|iPod/.test(ua)) { m = /OS (\d+)[_\d]* like Mac/.exec(ua); os = 'iOS' + (m ? ' ' + m[1] : ''); model = /iPad/.test(ua) ? 'iPad' : /iPod/.test(ua) ? 'iPod' : 'iPhone'; }
    else if (/Windows NT/.test(ua)) os = 'Windows'; else if (/Mac OS X/.test(ua)) os = 'macOS'; else if (/CrOS/.test(ua)) os = 'ChromeOS'; else if (/Linux/.test(ua)) os = 'Linux';
    if ((m = /(?:Edg|EdgA|EdgiOS)\/(\d+)/.exec(ua))) br = 'Edge ' + m[1]; else if ((m = /YaBrowser\/(\d+)/.exec(ua))) br = 'Яндекс Браузер ' + m[1]; else if ((m = /OPR\/(\d+)/.exec(ua))) br = 'Opera ' + m[1];
    else if ((m = /SamsungBrowser\/(\d+)/.exec(ua))) br = 'Samsung Internet ' + m[1]; else if ((m = /(?:Firefox|FxiOS)\/(\d+)/.exec(ua))) br = 'Firefox ' + m[1];
    else if ((m = /(?:Chrome|CriOS|HeadlessChrome)\/(\d+)/.exec(ua))) br = 'Chrome ' + m[1]; else if ((m = /Version\/(\d+).*Safari/.exec(ua))) br = 'Safari ' + m[1];
    return [os, model, br].filter(Boolean).join(' · ').replace(/[^\wА-Яа-яЁё .,;:()+\-·\/]/g, '').slice(0, 80);
  }
  function deviceInfo() {
    var tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { tz = ''; }
    return { id: deviceId(), ua: uaShort(navigator.userAgent), lang: String(navigator.language || '').slice(0, 12), tz: String(tz).slice(0, 40), scr: Math.round(screen.width || 0) + 'x' + Math.round(screen.height || 0) };
  }
  function mskNow() { return new Date(Date.now() + 3 * 3600000); }
  function today() { return mskNow().toISOString().slice(0, 10); }
  function isoOf(y, m, d) { return new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10); }
  function validIso(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s) && isoOf(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) === s; }
  function addDays(s, n) { return isoOf(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10) + n); }
  function nowMskStr() { return mskNow().toISOString().slice(0, 19).replace('T', ' '); }

  var IC = {
    car: '<path d="M5 17h14M3 13l2-6a2 2 0 0 1 2-1.4h10a2 2 0 0 1 2 1.4l2 6v4a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1H7.5v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><circle cx="7.5" cy="13.5" r="1"/><circle cx="16.5" cy="13.5" r="1"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
    receipt: '<path d="M4 2v20l3-2 2 2 3-2 3 2 2-2 3 2V2l-3 2-2-2-3 2-3-2-2 2z"/><path d="M8 9h8M8 13h8"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>', edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    trash: '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    refresh: '<path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15"/>',
    check: '<path d="M20 6L9 17l-5-5"/>', x: '<path d="M18 6L6 18M6 6l12 12"/>', send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>', alert: '<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>', logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>', moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    wifioff: '<path d="M1 1l22 22M16.7 11.1A11 11 0 0 1 22.6 9M5 12.6a11 11 0 0 1 5.2-2.6M8.5 16.4a6 6 0 0 1 7 0M12 20h.01"/>'
  };
  function ico(n, cls) { var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'ico' + (cls ? ' ' + cls : '')); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false'); s.innerHTML = IC[n] || ''; return s; }
  function chip(t, tone, ic) { return h('span', { class: 'chip ' + tone }, ic ? ico(ic, 'sm') : null, t); }

  /* ---------- темы (общая настройка с приложением: pr.theme) ---------- */
  function applyTheme() {
    var pref = load(THEMEK, 'auto'), dark = matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', pref === 'auto' ? (dark ? 'dark' : 'light') : pref);
  }
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  function isDark() { return document.documentElement.getAttribute('data-theme') === 'dark'; }
  function toggleTheme(btn) { store(THEMEK, isDark() ? 'light' : 'dark'); applyTheme(); if (btn) { clear(btn); btn.appendChild(ico(isDark() ? 'sun' : 'moon')); } }
  applyTheme();

  /* ---------- проверка ввода: одна и та же в форме и в демо (на сервере повторяется) ---------- */
  function parseAmount(v) {   // «1 200,5» → 1200.5; NaN, если не число
    if (typeof v === 'number') return v;
    var s = String(v == null ? '' : v).replace(/[\s\u00a0]/g, '').replace(',', '.'); return /^\d{1,7}(\.\d{1,2})?$/.test(s) ? +s : NaN;
  }
  function checkTrip(v, routes) {   // → { поле: код ошибки }
    var e = {}, t = today();
    if (!validIso(v.date)) e.date = 'bad_date'; else if (v.date > t) e.date = 'future_date'; else if (v.date < addDays(t, -LIM.daysBack)) e.date = 'old_date';
    var a = parseAmount(v.amount);
    if (!(a > 0) || !isFinite(a) || Math.abs(a * 100 - Math.round(a * 100)) > 1e-6) e.amount = 'bad_amount'; else if (a > LIM.maxAmount) e.amount = 'amount_big';
    var p = +v.people; if (!(p >= 1 && p <= LIM.maxPeople) || p !== Math.floor(p)) e.people = 'bad_people';
    if (routes.indexOf(v.route) < 0) { if (v.route !== OTHER) e.route = 'bad_route'; else { var o = String(v.routeText || '').replace(/\s+/g, ' ').trim(); if (o.length < 2) e.route = 'bad_route'; else if (o.length > LIM.other) e.route = 'route_long'; } }
    if (String(v.note || '').length > LIM.note) e.note = 'note_long';
    if (String(v.names || '').length > LIM.names) e.names = 'names_long';
    return e;
  }
  /* геопозиция для запроса кода админа: короткий запрос (до ~8 с), отказ или недоступность не мешают входу; координаты уходят только вместе с запросом кода */
  function geoGet() {
    return new Promise(function (res) {
      if (!LIVE || !navigator.geolocation) return res(null);
      var done = false, tm = setTimeout(function () { fin(null); }, 8500);
      function fin(v) { if (done) return; done = true; clearTimeout(tm); res(v); }
      try {
        navigator.geolocation.getCurrentPosition(function (p) {
          var c = p && p.coords; if (!c || typeof c.latitude !== 'number' || typeof c.longitude !== 'number' || !isFinite(c.latitude) || !isFinite(c.longitude)) return fin(null);
          fin({ lat: c.latitude, lon: c.longitude, accuracy: typeof c.accuracy === 'number' && isFinite(c.accuracy) ? Math.round(c.accuracy) : undefined });
        }, function () { fin(null); }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 });
      } catch (e) { fin(null); }
    });
  }
  /* вход СОТРУДНИКА: геопозиция обязательна (только live). Без разрешения запрос кода не уходит. Координаты нигде не сохраняются */
  function geoStrict() {
    return new Promise(function (res) {
      if (!navigator.geolocation) return res({ ok: false, reason: 'unsupported' });
      var done = false, tm = setTimeout(function () { fin({ ok: false, reason: 'timeout' }); }, 11000);
      function fin(v) { if (done) return; done = true; clearTimeout(tm); res(v); }
      try {
        navigator.geolocation.getCurrentPosition(function (p) {
          var c = p && p.coords; if (!c || typeof c.latitude !== 'number' || typeof c.longitude !== 'number' || !isFinite(c.latitude) || !isFinite(c.longitude)) return fin({ ok: false, reason: 'unavailable' });
          fin({ ok: true, lat: c.latitude, lon: c.longitude, accuracy: typeof c.accuracy === 'number' && isFinite(c.accuracy) ? Math.round(c.accuracy) : undefined });
        }, function (e) { fin({ ok: false, reason: e && e.code === 1 ? 'denied' : e && e.code === 3 ? 'timeout' : 'unavailable' }); }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
      } catch (e) { fin({ ok: false, reason: 'unavailable' }); }
    });
  }
  var GEO_WHY = {
    denied: 'Доступ к местоположению запрещён для этой страницы.', unavailable: 'Телефон не смог определить местоположение. Включите геолокацию (GPS) в настройках телефона.',
    timeout: 'Местоположение не определилось за 10 секунд. Выйдите на открытое место, включите GPS и повторите.', unsupported: 'Этот браузер не умеет определять местоположение. Откройте страницу в Chrome или Safari.'
  };
  function geoNeed(reason, onRetry) {
    return h('div', { class: 'geoneed', role: 'alert', 'data-testid': 'geo-need' },
      h('b', { text: 'Нужно разрешить определение местоположения' }),
      h('p', { text: (GEO_WHY[reason] || GEO_WHY.denied) + ' Без этого код не запрашивается. Местоположение уходит только вместе с запросом кода и нигде не сохраняется.' }),
      h('ul', null,
        h('li', { text: 'iPhone: Настройки → Конфиденциальность и безопасность → Службы геолокации: включить, затем найти Safari и выбрать «При использовании».' }),
        h('li', { text: 'Android: нажмите на значок замка слева от адреса → Разрешения → Местоположение → Разрешить. Для установленного приложения: Настройки → Приложения → Мои выплаты → Разрешения → Местоположение.' }),
        h('li', { text: 'Компьютер: значок замка слева от адреса → Местоположение → Разрешить.' })),
      h('button', { class: 'btn', type: 'button', 'data-testid': 'geo-retry', onclick: onRetry }, 'Повторить'));
  }
  function withGeo(d) { return geoGet().then(function (g) { if (g) { d.lat = g.lat; d.lon = g.lon; if (g.accuracy !== undefined) d.accuracy = g.accuracy; } return d; }); }
  var ERR = {
    network: 'Нет связи с сервером. Проверьте интернет и повторите.', server: 'Сервер ответил ошибкой. Повторите через минуту.', busy: 'Таблица занята другим действием. Повторите через несколько секунд.',
    disabled: 'Вход по админ-коду выключен на сервере (ADMIN_ENABLED=0).', unknown_action: 'Сервер не знает этого действия: вставьте свежий Code.gs (см. DEPLOY.md, раздел «Учёт такси»).',
    bad_date: 'Проверьте дату поездки.', future_date: 'Дата не может быть в будущем.', old_date: 'Дата слишком старая (больше ' + LIM.daysBack + ' дней назад).',
    bad_amount: 'Сумма: число больше 0, до двух знаков после запятой.', amount_big: 'Сумма не больше ' + LIM.maxAmount + ' ₽.', bad_people: 'Людей в машине: от 1 до ' + LIM.maxPeople + '.',
    bad_route: 'Выберите маршрут. Для «Другое» напишите, куда ехали.', route_long: 'Маршрут слишком длинный (до ' + LIM.other + ' символов).', note_long: 'Примечание слишком длинное (до ' + LIM.note + ' символов).',
    names_long: 'Список ФИО слишком длинный (до ' + LIM.names + ' символов).', receipt_required: 'Приложите фото или PDF чека. Без чека поездку сохранить нельзя.',
    bad_file: 'Файл не подходит: нужны фото (JPG, PNG) или PDF.', too_big: 'Файл слишком большой (фото до 1,5 МБ после сжатия, PDF до ' + LIM.pdfMB + ' МБ).',
    upload_failed: 'Чек не загрузился на Яндекс Диск, поездка не сохранена. Повторите.', not_found: 'Поездка не найдена. Обновите список.', state: 'Поездка уже удалена. Обновите список.',
    bad_reason: 'Причина: от ' + LIM.reasonMin + ' до ' + LIM.reason + ' символов.', bad_period: 'Период указан неверно (не больше ' + LIM.periodDays + ' дней).',
    unavailable: 'Чек сейчас недоступен на Яндекс Диске.', demo: 'В демо чеки не открываются.', closed: 'Вход для сотрудников закрыт: учёт такси работает с 6:00 до 22:00 по Москве.', blocked: 'Доступ закрыт. Обратитесь к бригадиру.', consent: 'Сначала примите согласие в приложении «Мои выплаты», затем вернитесь сюда.', rate: 'Слишком много записей за час. Подождите немного.',
    bad_geo: 'Нужно разрешить определение местоположения: без него код не запрашивается.', bad_phone: 'Введите номер телефона полностью, например +7 900 000-00-01.', auth: 'Сессия закончилась — войдите снова.'
  };
  function mskWhen(ms) {   // время по Москве: «17:10» или «05.10 в 02:40», если это не сегодня
    var d = new Date(ms + 10800000), n = new Date(Date.now() + 10800000), hm = ('0' + d.getUTCHours()).slice(-2) + ':' + ('0' + d.getUTCMinutes()).slice(-2);
    return d.toISOString().slice(0, 10) === n.toISOString().slice(0, 10) ? hm : ('0' + d.getUTCDate()).slice(-2) + '.' + ('0' + (d.getUTCMonth() + 1)).slice(-2) + ' в ' + hm;
  }
  function errText(r) { if (r && r.error === 'req_limit') return 'Лимит запросов кода исчерпан, обратитесь к администратору.' + (r.until ? ' Новый код можно будет запросить после ' + mskWhen(r.until) + ' (МСК).' : ''); if (r && r.error === 'closed' && r.from != null && r.to != null) return 'Вход для сотрудников закрыт: учёт такси работает с ' + (+r.from) + ':00 до ' + (+r.to) + ':00 по Москве.'; return ERR[r && r.error] || 'Не получилось выполнить действие. Повторите.'; }

  /* ---------- демо-«сервер» (вымышленные поездки) ---------- */
  function demoSeed() {
    var t = today(), m0 = t.slice(0, 8) + '01', mk = function (n, off, route, amount, people, names, note) {
      var d = addDays(t, -off); if (d < m0) d = m0;
      return { id: 'TD' + n, date: d, route: route, amount: amount, people: people, perPerson: r2(amount / people), names: names || '', note: note || '', hasFile: true, fileKind: n % 3 === 0 ? 'pdf' : 'image', created: d + ' 08:10:00', status: 'active', reason: '', changed: '', by: demoWho(n)[0], byPhone: demoWho(n)[1] };
    };
    return { trips: [mk(1, 1, ROUTES[0], 850, 3, 'Иванов И. И.; Петров П. П.; Сидоров С. С.', ''), mk(2, 1, ROUTES[1], 920, 3, '', 'вечер, пробки'), mk(3, 2, ROUTES[0], 780, 2, '', ''), mk(4, 3, ROUTES[2], 640, 4, 'Демов О. В.', ''), mk(5, 4, ROUTES[0], 1200.5, 5, '', 'ночная смена')], seq: 5 };
  }
  function demoWho(t) { return t === 3 ? ['Сидоров Сергей Петрович', '79000000003'] : t === 2 || t === 5 ? ['Петрова Анна Ивановна', '79000000002'] : ['админ', '']; }   // вымышленные авторы сидов: часть внёс админ, часть сотрудники
  function demoState() { var s = load(DEMOK, null); if (!s || !s.trips) { s = demoSeed(); store(DEMOK, s); } return s; }
  function demoRes(o) { return Promise.resolve(o); }
  function totalsOf(items) {
    var act = items.filter(function (x) { return x.status === 'active'; }), sum = 0, ppl = 0, days = {};
    act.forEach(function (x) { sum += x.amount; ppl += x.people; var b = days[x.date] || (days[x.date] = { date: x.date, count: 0, sum: 0, people: 0 }); b.count++; b.sum += x.amount; b.people += x.people; });
    return { count: act.length, sum: r2(sum), people: ppl, perPerson: ppl ? r2(sum / ppl) : 0, deleted: items.length - act.length,
      byDay: Object.keys(days).sort().reverse().map(function (k) { var b = days[k]; return { date: b.date, count: b.count, sum: r2(b.sum), people: b.people, perPerson: b.people ? r2(b.sum / b.people) : 0 }; }) };
  }
  var demoCodeAt = 0, demoEmp = { r: [], w: [], b: 0 };
  /* демо «сервера» водителей: те же правила, что в Code.gs (профиль, рейсы, лимит 20 в сутки, дубль, права, отключение) */
  function demoDrv(s) {
    if (!s.drivers) {
      var t = today(), m0 = t.slice(0, 8) + '01', dd = function (off) { var x = addDays(t, -off); return x < m0 ? m0 : x; };
      s.drivers = [
        { id: 'DD1', name: 'Кузнецов Алексей Викторович', phone: '79000000012', car: 'Лада Веста', plate: 'К512ОР77', color: 'серый', created: nowMskStr(), changed: nowMskStr(), status: 'active', owner: '79000000012' },
        { id: 'DD2', name: 'Рашидов Тимур Маратович', phone: '79000000013', car: 'Hyundai Solaris', plate: 'Т088АМ99', color: 'чёрный', created: nowMskStr(), changed: nowMskStr(), status: 'active', owner: '79000000013' }
      ];
      var mk = function (n, drv, off, route, people, km) { return { id: 'DR' + n, driverId: drv, date: dd(off), route: route, people: people, names: '', km: km || 0, amount: 0, note: '', type: 'Личный авто', created: dd(off) + ' 08:00:00', at: 0, status: 'active', reason: '', changed: '' }; };
      s.drives = [mk(1, 'DD1', 1, ROUTES[0], 3, 18), mk(2, 'DD1', 1, ROUTES[1], 4, 18), mk(3, 'DD1', 2, ROUTES[2], 2, 0), mk(4, 'DD2', 2, ROUTES[0], 4, 0), mk(5, 'DD2', 3, ROUTES[3], 5, 22)]; s.dseq = 5; store(DEMOK, s);
    }
  }
  function demoDriver(action, d, s, isEmp, empPhone) {
    demoDrv(s); var ok = function (o) { o.ok = true; return demoRes(o); }, bad = function (e) { return demoRes({ ok: false, error: e }); };
    function item(x, admin) { var o = JSON.parse(JSON.stringify(x)); if (!admin) delete o.owner; return o; }
    function mine() { return s.drivers.filter(function (x) { return x.owner === empPhone; })[0]; }
    function dview(x) { var dv = s.drivers.filter(function (v) { return v.id === x.driverId; })[0] || {}, o = JSON.parse(JSON.stringify(x)); o.driver = dv.name || ''; o.plate = dv.plate || ''; delete o.at; return o; }
    if (action === 'taxiDriverStatus') {
      if (isEmp) return bad('forbidden'); var dv = s.drivers.filter(function (v) { return v.id === d.id; })[0]; if (!dv) return bad('not_found');
      var to = d.status === 'off' ? 'off' : d.status === 'active' ? 'active' : ''; if (!to) return bad('bad_status');
      var why = String(d.reason || '').replace(/\s+/g, ' ').trim(); if (to === 'off' && (why.length < LIM.reasonMin || why.length > LIM.reason)) return bad('bad_reason');
      if (dv.status === to) return ok({ same: true }); dv.status = to; dv.changed = nowMskStr(); store(DEMOK, s); return ok({ id: dv.id, status: to });
    }
    if (!isEmp && action !== 'taxiDriveList' && action !== 'taxiDriveDelete') return bad('forbidden');
    if (action === 'taxiDriverGet') { var m = mine(); return ok({ driver: m ? item(m, false) : null, phone: empPhone, crmName: 'Демо Сотрудник', routes: ROUTES.slice() }); }
    if (action === 'taxiDriverSave') {
      var fio = fioNorm(d.name); if (!fio) return bad('bad_fio'); var ph = String(d.phone || empPhone).replace(/\D/g, '').replace(/^[78](?=\d{10})/, '7'); if (!/^7\d{10}$/.test(ph)) return bad('bad_phone');
      var car = String(d.car || '').replace(/\s+/g, ' ').trim(); if (car.length < 2 || car.length > DLIM.car || !/[A-Za-zА-Яа-яЁё]/.test(car) || !/^[A-Za-zА-Яа-яЁё0-9][A-Za-zА-Яа-яЁё0-9 .\-\/+()]*$/.test(car)) return bad('bad_car');
      var pl = plateNorm(d.plate); if (!pl) return bad('bad_plate'); var col = String(d.color || '').replace(/\s+/g, ' ').trim(); if (col.length > DLIM.color || (col && !/^[A-Za-zА-Яа-яЁё0-9 \-]+$/.test(col))) return bad('bad_color');
      var cur = mine(); if (cur && cur.status === 'off') return bad('driver_off');
      if (s.drivers.some(function (v) { return v.owner !== empPhone && v.plate === pl && v.status !== 'off'; })) return bad('plate_taken');
      if (cur) { if (cur.name === fio && cur.phone === ph && cur.car === car && cur.plate === pl && cur.color === col) return ok({ same: true, driver: item(cur, false) }); cur.name = fio; cur.phone = ph; cur.car = car; cur.plate = pl; cur.color = col; cur.changed = nowMskStr(); store(DEMOK, s); return ok({ created: false, driver: item(cur, false) }); }
      s.dseq = (s.dseq || 0) + 1; var nd = { id: 'DD' + (s.dseq + 100), name: fio, phone: ph, car: car, plate: pl, color: col, created: nowMskStr(), changed: nowMskStr(), status: 'active', owner: empPhone }; s.drivers.push(nd); store(DEMOK, s); return ok({ created: true, driver: item(nd, false) });
    }
    function parse(d2) {
      var e = checkDrive({ date: d2.date, route: d2.route, routeText: d2.routeText, people: +d2.people, km: d2.km == null ? '' : d2.km, amount: d2.amount == null ? '' : d2.amount, names: d2.names || '', note: d2.note || '' }, ROUTES), k = Object.keys(e)[0]; if (k) return { error: e[k] };
      return { v: { date: d2.date, route: ROUTES.indexOf(d2.route) >= 0 ? d2.route : OTHER + ': ' + String(d2.routeText).replace(/\s+/g, ' ').trim(), people: +d2.people, km: d2.km == null || d2.km === '' ? 0 : r2(parseAmount(String(d2.km))), amount: d2.amount == null || d2.amount === '' ? 0 : r2(parseAmount(String(d2.amount))), names: String(d2.names || '').replace(/\s*[\r\n]+\s*/g, '; ').trim(), note: String(d2.note || '').replace(/\s+/g, ' ').trim() } };
    }
    function check(v, drvId, except, confirmed) {
      var same = s.drives.filter(function (x) { return x.driverId === drvId && x.status === 'active' && x.date === v.date && x.id !== except; });
      if (same.length >= DLIM.perDay) return 'day_limit';
      if (!confirmed && same.some(function (x) { return x.route === v.route && x.people === v.people && Date.now() - (x.at || 0) <= LIM.dupMs; })) return 'duplicate';
      return '';
    }
    if (action === 'taxiDriveAdd') {
      var me = mine(); if (!me) return bad('no_driver'); if (me.status === 'off') return bad('driver_off'); var p = parse(d); if (p.error) return bad(p.error);
      var er = check(p.v, me.id, '', d.confirmDup === true); if (er) return bad(er);
      s.dseq = (s.dseq || 0) + 1; var nx = p.v; nx.id = 'DR' + (s.dseq + 100); nx.driverId = me.id; nx.type = 'Личный авто'; nx.created = nowMskStr(); nx.at = Date.now(); nx.status = 'active'; nx.reason = ''; nx.changed = ''; s.drives.push(nx); store(DEMOK, s); return ok({ id: nx.id });
    }
    function own(x) { var m = mine(); return !isEmp || (m && x.driverId === m.id); }
    if (action === 'taxiDriveUpdate') {
      var u = s.drives.filter(function (x) { return x.id === d.id && own(x); })[0]; if (!u) return bad('not_found'); var m2 = mine(); if (m2 && m2.status === 'off') return bad('driver_off');
      var p2 = parse(d); if (p2.error) return bad(p2.error); if (u.status !== 'active') return bad('state'); if (check(p2.v, u.driverId, u.id, true) === 'day_limit') return bad('day_limit');
      Object.keys(p2.v).forEach(function (k) { u[k] = p2.v[k]; }); u.changed = nowMskStr(); store(DEMOK, s); return ok({ id: u.id });
    }
    if (action === 'taxiDriveDelete') {
      var x = s.drives.filter(function (v) { return v.id === d.id && own(v); })[0]; if (!x) return bad('not_found');
      var why2 = String(d.reason || '').replace(/\s+/g, ' ').trim(); if (why2.length < LIM.reasonMin || why2.length > LIM.reason) return bad('bad_reason'); if (x.status !== 'active') return bad('state');
      x.status = 'deleted'; x.reason = why2; x.changed = nowMskStr(); store(DEMOK, s); return ok({ id: x.id });
    }
    if (action === 'taxiDriveList') {
      var t2 = today(), from = d.from || t2.slice(0, 8) + '01', to = d.to || t2; if (!validIso(from) || !validIso(to) || from > to || addDays(from, LIM.periodDays) < to) return bad('bad_period');
      var fid = !isEmp ? d.driverId || '' : '', m3 = mine(), all = s.drives.filter(function (v) { return v.date >= from && v.date <= to && (isEmp ? (m3 && v.driverId === m3.id) : (!fid || v.driverId === fid)); }).sort(function (a, b) { return a.date !== b.date ? (a.date < b.date ? 1 : -1) : (a.created < b.created ? 1 : -1); });
      var act = all.filter(function (v) { return v.status === 'active'; }), days = {}, per = {}, ppl = 0, km = 0, sum = 0;
      act.forEach(function (v) { ppl += v.people; km += v.km; sum += v.amount; var b = days[v.date] || (days[v.date] = { date: v.date, count: 0, people: 0 }); b.count++; b.people += v.people; var q = per[v.driverId] || (per[v.driverId] = { count: 0, people: 0, km: 0, sum: 0, days: {} }); q.count++; q.people += v.people; q.km += v.km; q.sum += v.amount; var z = q.days[v.date] || (q.days[v.date] = { date: v.date, count: 0, people: 0 }); z.count++; z.people += v.people; });
      var out = { ok: true, role: isEmp ? 'employee' : 'admin', from: from, to: to, routes: ROUTES.slice(), truncated: false, items: all.map(dview), totals: { count: act.length, people: ppl, km: r2(km), sum: r2(sum), deleted: all.length - act.length, daysCount: Object.keys(days).length, byDay: Object.keys(days).sort().reverse().map(function (k) { return days[k]; }) } };
      if (!isEmp) out.drivers = s.drivers.map(function (v) { var o = item(v, true), q = per[v.id] || { count: 0, people: 0, km: 0, sum: 0, days: {} }; o.count = q.count; o.people = q.people; o.km = r2(q.km); o.sum = r2(q.sum); o.daysCount = Object.keys(q.days).length; o.days = Object.keys(q.days).sort().reverse().map(function (k) { return q.days[k]; }); return o; }).sort(function (a, b) { return a.name < b.name ? -1 : 1; });
      else out.driver = m3 ? item(m3, false) : null;
      return demoRes(out);
    }
    return bad('unknown_action');
  }
  function demoCall(action, d) {
    var s = demoState(), tok = (load(SESSK, null) || {}).token || (load(EMPK, null) || {}).token, empPhone = /^demo-emp-\d+$/.test(tok || '') ? tok.slice(9) : '', isEmp = !!empPhone, me = isEmp ? ['Демо Сотрудник', empPhone] : ['админ', ''];
    if (action === 'adminCodeRequest') { if (String(d.phone || '').replace(/\D/g, '').length < 10) return demoRes({ ok: false, error: 'bad_phone' }); if (Date.now() - demoCodeAt < 30000 && demoCodeAt) return demoRes({ ok: true, throttled: true, wait: 30 }); demoCodeAt = Date.now(); return demoRes({ ok: true }); }
    if (action === 'adminCodeVerify') return demoRes(String(d.code) === DEMO_CODE ? { ok: true, token: 'demo-admin', expiresAt: Date.now() + 12 * 3600000 } : { ok: false, error: 'wrong', left: 4 });
    if (action === 'codeRequest') { var dg = String(d.phone || '').replace(/\D/g, ''); if (dg.length < 10) return demoRes({ ok: false, error: 'bad_phone' }); if (demoEmp.b > Date.now()) return demoRes({ ok: false, error: 'locked', until: demoEmp.b }); demoEmp.r = demoEmp.r.filter(function (t) { return t > Date.now() - 10800000; }); if (demoEmp.r.length >= 3) return demoRes({ ok: false, error: 'req_limit', until: demoEmp.r[0] + 10800000 }); if (Date.now() - demoCodeAt < 30000 && demoCodeAt) return demoRes({ ok: true, throttled: true, wait: 30 }); demoCodeAt = Date.now(); demoEmp.r.push(demoCodeAt); return demoRes({ ok: true }); }
    if (action === 'codeVerify') {   // демо повторяет лимит входа сотрудника: 2 неверных кода за 3 часа
      if (demoEmp.b > Date.now()) return demoRes({ ok: false, error: 'locked', until: demoEmp.b });
      if (String(d.code) === DEMO_CODE) return demoRes({ ok: true, token: 'demo-emp-' + String(d.phone || '').replace(/\D/g, ''), expiresAt: Date.now() + 12 * 3600000 });
      demoEmp.w = demoEmp.w.filter(function (t) { return t > Date.now() - 10800000; }); demoEmp.w.push(Date.now());
      if (demoEmp.w.length >= 2) { demoEmp.b = demoEmp.w[0] + 10800000; demoEmp.w = []; return demoRes({ ok: false, error: 'locked', until: demoEmp.b }); }
      return demoRes({ ok: false, error: 'wrong', left: 2 - demoEmp.w.length });
    }
    if (tok !== 'demo-admin' && !isEmp) return demoRes({ ok: false, error: 'auth' });
    if (/^taxiDriv/.test(action)) return demoDriver(action, d, s, isEmp, empPhone);
    function own(x) { return !isEmp || (x.byPhone || '') === empPhone; }   // сотрудник работает только со своими поездками (в демо, как на сервере)
    function find(id) { return s.trips.filter(function (x) { return x.id === id && own(x); })[0]; }
    function norm(d2) {
      var e = checkTrip(d2, ROUTES), k = Object.keys(e)[0]; if (k) return { error: e[k] };
      var route = ROUTES.indexOf(d2.route) >= 0 ? d2.route : OTHER + ': ' + String(d2.routeText).replace(/\s+/g, ' ').trim(), a = r2(parseAmount(d2.amount)), p = +d2.people;
      return { v: { date: d2.date, route: route, amount: a, people: p, perPerson: r2(a / p), names: String(d2.names || '').replace(/\s*[\r\n]+\s*/g, '; ').trim(), note: String(d2.note || '').replace(/\s+/g, ' ').trim() } };
    }
    if (action === 'taxiList') {
      var t = today(), from = d.from || t.slice(0, 8) + '01', to = d.to || t;
      if (!validIso(from) || !validIso(to) || from > to || addDays(from, LIM.periodDays) < to) return demoRes({ ok: false, error: 'bad_period' });
      var items = s.trips.filter(function (x) { return own(x) && x.date >= from && x.date <= to; }).sort(function (a, b) { return a.date !== b.date ? (a.date < b.date ? 1 : -1) : (a.created < b.created ? 1 : -1); });
      var out = JSON.parse(JSON.stringify(items)), bp = null;
      if (isEmp) out.forEach(function (x) { delete x.byPhone; delete x.by; });
      else { var pm = {}; out.forEach(function (x) { x.by = x.by || 'админ'; if (x.status !== 'active') return; var k = x.byPhone || 'admin', b = pm[k] || (pm[k] = { name: x.by, phone: x.byPhone || '', count: 0, sum: 0, people: 0 }); b.count++; b.sum += x.amount; b.people += x.people; });
        bp = Object.keys(pm).map(function (k) { var b = pm[k]; return { name: b.name, phone: b.phone, count: b.count, sum: r2(b.sum), people: b.people, perPerson: b.people ? r2(b.sum / b.people) : 0 }; }).sort(function (a, b) { return b.sum - a.sum; }); }
      return demoRes({ ok: true, role: isEmp ? 'employee' : 'admin', who: isEmp ? me[0] : 'админ', from: from, to: to, routes: ROUTES.slice(), truncated: false, items: out, byPerson: bp, totals: totalsOf(items) });
    }
    if (action === 'taxiAdd') {
      var n = norm(d); if (n.error) return demoRes({ ok: false, error: n.error });
      if (!d.file || !d.file.b64) return demoRes({ ok: false, error: 'receipt_required' });
      if (d.confirmDup !== true) {
        var dup = s.trips.filter(function (x) { return x.status === 'active' && (x.byPhone || '') === me[1] && x.date === n.v.date && Math.abs(x.amount - n.v.amount) < 0.005 && x.people === n.v.people && Date.now() - (x.at || 0) <= LIM.dupMs; })[0];
        if (dup) return demoRes({ ok: false, error: 'duplicate', id: dup.id, created: dup.created });
      }
      var tr = n.v; s.seq++; tr.id = 'TD' + s.seq; tr.hasFile = true; tr.fileKind = d.file.pdf ? 'pdf' : 'image'; tr.created = nowMskStr(); tr.at = Date.now(); tr.status = 'active'; tr.reason = ''; tr.changed = ''; tr.by = me[0]; tr.byPhone = me[1];
      s.trips.push(tr); store(DEMOK, s); return demoRes({ ok: true, id: tr.id, perPerson: tr.perPerson });
    }
    if (action === 'taxiUpdate') {
      var u = find(d.id); if (!u) return demoRes({ ok: false, error: 'not_found' });
      var n2 = norm(d); if (n2.error) return demoRes({ ok: false, error: n2.error });
      if (u.status !== 'active') return demoRes({ ok: false, error: 'state' });
      Object.keys(n2.v).forEach(function (k) { u[k] = n2.v[k]; }); if (d.file && d.file.b64) { u.hasFile = true; u.fileKind = d.file.pdf ? 'pdf' : 'image'; } u.changed = nowMskStr(); store(DEMOK, s); return demoRes({ ok: true, id: u.id, perPerson: u.perPerson });
    }
    if (action === 'taxiDelete') {
      var x = find(d.id); if (!x) return demoRes({ ok: false, error: 'not_found' });
      var why = String(d.reason || '').replace(/\s+/g, ' ').trim(); if (why.length < LIM.reasonMin || why.length > LIM.reason) return demoRes({ ok: false, error: 'bad_reason' });
      if (x.status !== 'active') return demoRes({ ok: false, error: 'state' });
      x.status = 'deleted'; x.reason = why; x.changed = nowMskStr(); store(DEMOK, s); return demoRes({ ok: true, id: x.id });
    }
    if (action === 'taxiFileLink') return demoRes({ ok: false, error: 'demo' });
    return demoRes({ ok: false, error: 'unknown_action' });
  }

  /* ---------- связь с бэкендом ---------- */
  function reqTimeout() { var t = +APPC.requestTimeoutMs; return t >= 1000 && t <= 300000 ? t : 60000; }
  function post(body) {
    var ctl = typeof AbortController === 'function' ? new AbortController() : null, tm = ctl ? setTimeout(function () { ctl.abort(); }, reqTimeout()) : null;
    return fetch(APPC.backendUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', redirect: 'follow', signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.json(); }).then(function (r) { return r && typeof r === 'object' ? r : { ok: false, error: 'server' }; }).catch(function () { return { ok: false, error: 'network' }; })
      .then(function (r) { if (tm) clearTimeout(tm); return r; });
  }
  var sessionOf = function (k) { var s = load(k, null); return s && s.token && (!s.exp || s.exp > Date.now()) ? s : null; };
  var session = function () { return sessionOf(SESSK) || sessionOf(EMPK); };
  function isAdmin() { var se = session(); return !(se && se.role === 'employee'); }
  function isLoginAction(a) { return /^(adminCode|code)(Request|Verify)$/.test(a); }
  function call(action, body) {
    var b = {}, k, se = session(); for (k in (body || {})) b[k] = body[k]; b.action = action; if (se && !isLoginAction(action)) b.token = se.token; if (action === 'adminCodeRequest' || action === 'adminCodeVerify') b.dev = deviceInfo();
    var p = LIVE ? post(b) : delay(LAT).then(function () { return demoCall(action, b); });
    return p.then(function (r) {
      if (r && r.error === 'auth' && session()) { endSession(); toast('Сессия закончилась — войдите снова', 'warn'); }
      if (r && r.error === 'blocked' && session()) { endSession(); toast(ERR.blocked, 'bad'); }
      if (r && r.error === 'disabled') { endSession(); S.disabled = true; renderLogin(); }
      return r;
    });
  }
  function endSession() { localStorage.removeItem(SESSK); localStorage.removeItem(EMPK); S.role = ''; S.who = ''; S.data = null; S.last = null; S.mounted = false; L = newL(); renderLogin(); }

  /* ---------- состояние ---------- */
  var S = { role: '', who: '', tab: 'add', period: 'month', from: '', to: '', data: null, err: '', loading: false, showDeleted: false, last: null, mounted: false, disabled: false, routes: ROUTES.slice() };
  function newL(mode, phone) { return { step: 'start', readyAt: 0, lockUntil: 0, timer: null, mode: mode || 'admin', phone: phone || '', name: '' }; }
  var L = newL();
  var root = $('#view-root'), tabbar = $('#tabbar'), overlayRoot = $('#overlay-root'), toasts = $('#toasts'), uid = 0;

  function toast(msg, tone) {
    var t = h('div', { class: 'toast ' + (tone || 'ok'), role: tone === 'bad' ? 'alert' : null, 'data-testid': 'toast' }, ico(tone === 'bad' ? 'alert' : tone === 'warn' ? 'info' : 'check'), h('span', { text: msg }));
    toasts.appendChild(t); setTimeout(function () { t.remove(); }, 4200);
  }

  /* ---------- диалоги ---------- */
  var openStack = [];
  function openDialog(o) {
    var opener = document.activeElement, id = 'dl' + Math.random().toString(36).slice(2), title = h('h2', { id: id, tabindex: '-1', text: o.title });
    var sheet = h('div', { class: 'sheet', role: o.alert ? 'alertdialog' : 'dialog', 'aria-modal': 'true', 'aria-labelledby': id, 'data-testid': 'dialog' },
      h('div', { class: 'grab' }), h('div', { class: 'sh' }, title, o.dialog ? null : h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Закрыть', 'data-testid': 'sheet-close', onclick: function () { ctl.close(); } }, ico('x'))),
      h('div', { class: 'sb' }, o.body), o.footer ? h('div', { class: 'sf' }, o.footer) : null);
    var ov = h('div', { class: 'ov' + (o.dialog ? ' dlg' : '') }, h('div', { class: 'bd', onclick: function () { ctl.close(); } }), sheet);
    function onKey(e) {
      if (openStack[openStack.length - 1] !== ctl) return;
      if (e.key === 'Escape') { e.preventDefault(); ctl.close(); }
      if (e.key === 'Tab') {
        var f = [].filter.call(sheet.querySelectorAll('button, [href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])'), function (x) { return !x.disabled && x.offsetParent !== null; });
        if (!f.length) return; var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === title)) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    var ctl = { el: sheet, close: function (silent) {
      if (!ov.parentNode) return; ov.remove(); document.removeEventListener('keydown', onKey); openStack.splice(openStack.indexOf(ctl), 1);
      if (!openStack.length) { $('#app').removeAttribute('inert'); document.body.classList.remove('has-ov'); }
      if (o.onClose && !silent) o.onClose(); if (opener && opener.isConnected) opener.focus(); } };
    openStack.push(ctl); document.body.classList.add('has-ov'); overlayRoot.appendChild(ov); $('#app').setAttribute('inert', ''); document.addEventListener('keydown', onKey);
    setTimeout(function () { (o.focus ? o.focus() : title.focus()); }, 30);
    return ctl;
  }
  function confirmAct(o) {   // подтверждение; с reason — ещё и ввод причины. Результат: { reason } или null
    return new Promise(function (res) {
      var done = false, ctl, ta = null, yes, cnt = null;
      function fin(v) { if (done) return; done = true; ctl.close(true); res(v); }
      function upd() { if (!ta) return; var n = ta.value.trim().length; yes.disabled = n < LIM.reasonMin; cnt.textContent = ta.value.length + ' / ' + LIM.reason; }
      var body = h('div', { class: 'gap12' }, o.who ? h('p', { class: 'nm', 'data-testid': 'dlg-who', text: o.who }) : null, o.text ? h('p', { class: 'cap', 'data-testid': 'dlg-note', text: o.text }) : null);
      if (o.reason) {
        ta = h('textarea', { class: 'inp', maxlength: String(LIM.reason), 'data-testid': 'dlg-reason', 'aria-label': 'Причина', placeholder: o.reasonHint || 'Причина', oninput: upd });
        cnt = h('div', { class: 'cnt2', 'aria-hidden': 'true' });
        body.appendChild(h('div', { class: 'reasonbox' }, h('label', { class: 'l', text: 'Причина' }), ta, cnt));
      }
      yes = h('button', { class: 'btn' + (o.danger ? ' danger' : ''), type: 'button', 'data-testid': 'dlg-yes', onclick: function () { if (yes.disabled) return; fin({ reason: ta ? ta.value.trim() : '' }); } }, o.yes || 'Да');
      ctl = openDialog({ title: o.title, dialog: true, alert: true, focus: function () { (ta || yes).focus(); }, onClose: function () { fin(null); }, body: body,
        footer: h('div', { class: 'btnrow' }, h('button', { class: 'btn ghost', type: 'button', 'data-testid': 'dlg-no', onclick: function () { fin(null); } }, 'Отмена'), yes) });
      upd();
    });
  }
  function requireOnline() { if (navigator.onLine === false) { toast('Нет сети. Действие доступно только онлайн.', 'warn'); return false; } return true; }

  /* ---------- вход (тот же админ-код из Telegram, те же действия adminCodeRequest / adminCodeVerify) ---------- */
  function renderLogin() {
    tabbar.hidden = true; $('#offline').hidden = true; clear(root); clearInterval(L.timer); document.title = 'Вход · Учёт такси';
    var v = h('main', { class: 'login adm-login', id: 'main' }); root.appendChild(v);
    if (S.disabled) {
      v.appendChild(h('h1', { text: 'Вход выключен' })); v.appendChild(h('p', { class: 'lead', text: 'Админ-вход отключён на сервере (ADMIN_ENABLED=0). Включите его в Script Properties.' }));
      v.appendChild(h('button', { class: 'btn ghost', type: 'button', 'data-testid': 'retry', onclick: function () { S.disabled = false; renderLogin(); } }, 'Проверить ещё раз')); return;
    }
    if (L.step === 'code' && L.lockUntil > Date.now()) return loginLocked(v);
    v.appendChild(h('h1', null, 'Учёт такси', LIVE ? null : h('span', { class: 'demobadge', 'data-testid': 'demo-badge', text: 'ДЕМО' })));
    v.appendChild(h('p', { class: 'lead', text: L.mode === 'emp' ? 'Поездки на работу: дата, сумма, сколько человек и чек. Вход по номеру телефона: код придёт вам в Telegram. Вы видите только свои поездки.' : 'Поездки сотрудников на работу: дата, сумма, сколько человек и чек. Вход администратора — по тому же коду из Telegram, что и в кабинете админа.' }));
    if (L.step === 'start') loginStart(v); else loginCode(v);
    v.appendChild(h('p', { class: 'foot', text: LIVE ? (L.mode === 'emp' ? 'Вход для сотрудников открыт с 6:00 до 22:00 по Москве. Бот входа: ' + BOT_NAME + '. Если вы его ещё не подключали, код получит администратор и передаст вам лично.' : 'Код приходит в админский чат Telegram. Если вы уже входили в кабинет админа на этом устройстве, повторный вход не нужен.') : 'Демо-режим · все данные вымышлены' }));
  }
  function loginStart(v) {
    var emp = L.mode === 'emp', label = emp ? 'Получить код' : 'Получить код в Telegram', saved = load(WHOK, {});
    var btn = h('button', { class: 'btn', type: 'button', 'data-testid': emp ? 'req-code-emp' : 'req-code' }, ico('send', 'sm'), label), err = h('div', { class: 'err', role: 'alert', hidden: true, 'data-testid': 'login-err' });
    var ph = h('input', { class: 'inp', type: 'tel', inputmode: 'tel', autocomplete: 'tel', maxlength: '24', placeholder: '+7 900 000-00-01', 'aria-label': emp ? 'Номер телефона' : 'Ваш номер телефона', 'data-testid': emp ? 'emp-phone' : 'adm-phone', value: L.phone || (emp ? '' : saved.phone) || '' });
    var nm = emp ? null : h('input', { class: 'inp', type: 'text', autocomplete: 'name', maxlength: '80', placeholder: 'Например: Иванов Пётр', 'aria-label': 'Ваше ФИО (по желанию)', 'data-testid': 'adm-name', value: L.name || saved.name || '' });
    var geoHint = h('p', { class: 'help', role: 'status', hidden: true, 'data-testid': 'geo-hint', text: 'Разрешите определение местоположения: оно уйдёт админу вместе с запросом кода. Если откажете, код всё равно придёт.' });
    function fail(t) { clear(btn); btn.appendChild(ico('send', 'sm')); btn.appendChild(document.createTextNode(label)); btn.disabled = false; err.textContent = t; err.hidden = false; geoHint.hidden = true; }
    btn.addEventListener('click', function () {
      if (navigator.onLine === false) { err.textContent = ERR.network; err.hidden = false; return; }
      var d = ph.value.replace(/\D/g, ''); if (d.length < 10 || d.length > 12) { err.textContent = ERR.bad_phone; err.hidden = false; ph.focus(); return; } L.phone = ph.value.trim();
      if (!emp) { L.name = nm.value.trim(); store(WHOK, { phone: L.phone, name: L.name }); }
      btn.disabled = true; clear(btn); btn.appendChild(h('span', { class: 'spinner' })); err.hidden = true;
      if (LIVE) { btn.appendChild(document.createTextNode(' Определяем местоположение…')); if (!emp) geoHint.hidden = false; } else btn.appendChild(document.createTextNode(' Отправляем…'));
      (emp ? (LIVE ? geoStrict() : Promise.resolve({ ok: true })).then(function (g) {
        if (!g.ok) return { ok: false, error: 'geo', reason: g.reason };
        clear(btn); btn.appendChild(h('span', { class: 'spinner' })); btn.appendChild(document.createTextNode(' Отправляем…'));
        var q = { phone: L.phone, purpose: 'taxi' }; if (LIVE) { q.lat = g.lat; q.lon = g.lon; if (g.accuracy !== undefined) q.accuracy = g.accuracy; } return call('codeRequest', q);
      }) : withGeo({ purpose: 'taxi', phone: L.phone, name: L.name }).then(function (d) { clear(btn); btn.appendChild(h('span', { class: 'spinner' })); btn.appendChild(document.createTextNode(' Отправляем…')); geoHint.hidden = true; return call('adminCodeRequest', d); })).then(function (r) {
        if (emp && (r.error === 'geo' || r.error === 'bad_geo')) { L.geoErr = r.reason || 'unavailable'; fail(''); err.hidden = true; showGeoNeed(L.geoErr); return; }
        if (emp) { L.geoErr = ''; showGeoNeed(''); }
        if (r.error === 'locked') { L.step = 'code'; L.lockUntil = r.until; return renderLogin(); }
        if (emp && r.ok && r.closed) return fail(errText({ error: 'closed', from: r.from, to: r.to }));
        if (!r.ok) return fail(errText(r));
        L.step = 'code'; L.readyAt = Date.now() + (r.throttled ? (r.wait || 30) : 30) * 1000; renderLogin();
      });
    });
    if (ph) ph.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); btn.click(); } });
    var geoBox = h('div', { class: 'geoslot' });
    function showGeoNeed(reason) { clear(geoBox); if (reason) geoBox.appendChild(geoNeed(reason, function () { btn.click(); })); }
    if (emp && L.geoErr) showGeoNeed(L.geoErr);
    v.appendChild(h('div', { class: 'gap12' }, h('div', { class: 'field' }, h('label', { class: 'l', text: emp ? 'Телефон' : 'Ваш телефон' }), ph), nm ? h('div', { class: 'field' }, h('label', { class: 'l' }, 'Ваше ФИО ', h('span', { text: 'по желанию' })), nm) : null, geoBox, btn, geoHint, err));
    v.appendChild(h('div', { class: 'steps' }, h('div', { class: 'stepi' }, h('i', { text: '1' }), h('span', { text: emp ? 'Введите свой номер телефона, нажмите «Получить код» и разрешите определение местоположения (без него код не выдаётся): 4 цифры придут вам в Telegram.' : 'Введите свой номер телефона и нажмите «Получить код в Telegram»: админ увидит, кто просит доступ, и 4 цифры придут в админский чат.' })), h('div', { class: 'stepi' }, h('i', { text: '2' }), h('span', { text: emp ? 'Введите код. Сессия держится до конца рабочего дня (до 22:00), потом код запросите снова.' : 'Введите код. Сессия держится 12 часов, потом код запросите снова.' }))));
    v.appendChild(h('button', { class: 'link tx-mode', type: 'button', 'data-testid': emp ? 'mode-admin' : 'mode-emp', onclick: function () { L = newL(emp ? 'admin' : 'emp', L.phone); renderLogin(); } }, emp ? 'Я администратор' : 'Я сотрудник: войти по номеру телефона'));
  }
  function loginCode(v) {
    var boxes = [], busy = false, otp = h('div', { class: 'otp', role: 'group', 'aria-label': 'Код из 4 цифр', 'data-testid': 'otp' }), err = h('div', { class: 'err', role: 'alert', hidden: true, 'data-testid': 'code-err' });
    var resend = h('button', { class: 'link', type: 'button', 'data-testid': 'resend' }), go = h('button', { class: 'btn', type: 'button', 'data-testid': 'login-btn', disabled: true }, 'Войти');
    function val() { return boxes.map(function (b) { return b.value; }).join(''); }
    function showErr(t) { err.hidden = false; clear(err); err.appendChild(ico('alert', 'sm')); err.appendChild(document.createTextNode(t)); }
    function submit() {
      var c = val(); if (c.length !== 4 || busy) return; busy = true;
      if (navigator.onLine === false) { busy = false; showErr(ERR.network); return; }
      go.disabled = true; clear(go); go.appendChild(h('span', { class: 'spinner' })); go.appendChild(document.createTextNode(' Проверяем…'));
      (L.mode === 'emp' ? call('codeVerify', { phone: L.phone, code: c, purpose: 'taxi' }) : call('adminCodeVerify', { code: c })).then(function (r) {
        busy = false;
        if (r.ok && r.token) { if (L.mode === 'emp') store(EMPK, { token: r.token, exp: r.expiresAt, at: Date.now(), role: 'employee' }); else store(SESSK, { token: r.token, exp: r.expiresAt, at: Date.now() }); clearInterval(L.timer); L = newL(); boot(); return; }
        if (r.error === 'locked') { L.lockUntil = r.until; return renderLogin(); }
        clear(go); go.appendChild(document.createTextNode('Войти')); go.disabled = true;
        if (r.error === 'wrong') { boxes.forEach(function (b) { b.value = ''; b.setAttribute('aria-invalid', 'true'); }); otp.classList.remove('bad'); void otp.offsetWidth; otp.classList.add('bad'); showErr('Неверный код. Осталось ' + r.left + ' ' + plural(r.left, ['попытка', 'попытки', 'попыток']) + '.'); boxes[0].focus(); }
        else { showErr(errText(r)); go.disabled = val().length !== 4; }
      });
    }
    for (var i = 0; i < 4; i++) (function (i) {
      var b = h('input', { type: 'text', inputmode: 'numeric', pattern: '[0-9]*', maxlength: '1', autocomplete: i === 0 ? 'one-time-code' : 'off', 'aria-label': 'Цифра ' + (i + 1) + ' из 4', 'data-testid': 'otp-' + i,
        oninput: function () { b.value = b.value.replace(/\D/g, '').slice(-1); err.hidden = true; boxes.forEach(function (x) { x.removeAttribute('aria-invalid'); }); if (b.value && i < 3) boxes[i + 1].focus(); go.disabled = val().length !== 4; if (val().length === 4) submit(); },
        onkeydown: function (e) { if (e.key === 'Backspace' && !b.value && i > 0) { boxes[i - 1].focus(); boxes[i - 1].value = ''; } },
        onpaste: function (e) { var t = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 4); if (!t) return; e.preventDefault(); t.split('').forEach(function (ch, k) { boxes[k].value = ch; }); go.disabled = val().length !== 4; if (t.length === 4) submit(); } });
      boxes.push(b); otp.appendChild(b);
    })(i);
    go.addEventListener('click', submit);
    function tick() { var left = Math.ceil((L.readyAt - Date.now()) / 1000); resend.disabled = left > 0; resend.textContent = left > 0 ? 'Запросить код ещё раз (' + left + ' с)' : 'Запросить код ещё раз'; }
    resend.addEventListener('click', function () {
      (L.mode === 'emp' ? (LIVE ? geoStrict() : Promise.resolve({ ok: true })).then(function (g) {
        if (!g.ok) return { ok: false, error: 'geo', reason: g.reason };
        var q = { phone: L.phone, purpose: 'taxi' }; if (LIVE) { q.lat = g.lat; q.lon = g.lon; if (g.accuracy !== undefined) q.accuracy = g.accuracy; } return call('codeRequest', q);
      }) : withGeo({ purpose: 'taxi', phone: L.phone, name: L.name }).then(function (d) { return call('adminCodeRequest', d); })).then(function (r) {
        if (r.error === 'geo' || r.error === 'bad_geo') { clearInterval(L.timer); L.step = 'start'; L.geoErr = r.reason || 'unavailable'; return renderLogin(); }
        if (r.error === 'locked') { L.lockUntil = r.until; return renderLogin(); }
        if (!r.ok) { toast(errText(r), 'bad'); return; }
        if (r.closed) { toast(errText({ error: 'closed', from: r.from, to: r.to }), 'bad'); return; }
        L.readyAt = Date.now() + (r.throttled ? (r.wait || 30) : 30) * 1000; tick(); toast('Код запрошен повторно: проверьте Telegram'); boxes.forEach(function (b) { b.value = ''; }); boxes[0].focus();
      });
    });
    tick(); L.timer = setInterval(function () { if (!resend.isConnected) return clearInterval(L.timer); tick(); }, 1000);
    v.appendChild(h('div', { class: 'waitbox', role: 'status', 'data-testid': L.mode === 'emp' ? 'wait-emp' : 'wait-admin' }, ico('send'), h('div', null, h('b', { text: 'Проверьте Telegram' }), h('span', { text: L.mode === 'emp' ? 'Код придёт вам личным сообщением «Вход в учёт такси» от бота ' + BOT_NAME + '. Введите 4 цифры.' : 'Код пришёл в админский чат. Введите 4 цифры.' }))));
    if (L.mode === 'emp') v.appendChild(h('div', { class: 'tghint', 'data-testid': 'tg-hint' }, h('span', { text: 'Сообщения нет? Вы ещё не подключали бота: откройте ' + BOT_NAME + ' (ссылка ' + BOT_URL + '), нажмите «Старт» и «Поделиться номером», затем запросите код снова. Пока бот не подключён, код получит администратор и передаст его вам лично.' }), h('a', { class: 'btn ghost', href: BOT_URL, target: '_blank', rel: 'noopener noreferrer', 'data-testid': 'tg-bot-link' }, 'Открыть ' + BOT_NAME + ' в Telegram')));
    if (!LIVE) v.appendChild(h('div', { class: 'demohint', 'data-testid': 'demo-code', text: 'Демо: код входа — ' + DEMO_CODE }));
    v.appendChild(h('div', { class: 'gap16' }, h('div', { class: 'gap12' }, otp, err), go, h('div', { class: 'row between' }, resend, h('button', { class: 'link', type: 'button', 'data-testid': 'change', onclick: function () { L.step = 'start'; renderLogin(); } }, 'Назад'))));
    if (L.mode === 'emp') v.appendChild(h('p', { class: 'foot', 'data-testid': 'limits-note', text: 'За 3 часа можно запросить код не более 3 раз и ошибиться не более 2 раз. После двух ошибок вход закрывается на 3 часа.' }));
    setTimeout(function () { boxes[0].focus(); }, 50);
  }
  function loginLocked(v) {
    var t = h('div', { class: 't num', 'data-testid': 'lock-timer' });
    function tick() { var s = Math.max(0, Math.ceil((L.lockUntil - Date.now()) / 1000)); t.textContent = (s >= 3600 ? ('0' + Math.floor(s / 3600)).slice(-2) + ':' : '') + ('0' + Math.floor(s % 3600 / 60)).slice(-2) + ':' + ('0' + s % 60).slice(-2); if (s <= 0) { clearInterval(L.timer); L.step = 'start'; L.lockUntil = 0; renderLogin(); } }
    v.appendChild(h('h1', { text: 'Вход временно закрыт' }));
    v.appendChild(h('div', { class: 'lockbox', role: 'alert', 'data-testid': 'lockbox' }, ico('lock', 'lg'), h('p', { 'data-testid': 'lock-until', text: 'Слишком много неверных кодов. Вход закрыт до ' + mskWhen(L.lockUntil) + ' по Москве. Повторить можно через' }), t, L.mode === 'emp' ? h('p', { text: 'Нужен доступ раньше? Обратитесь к администратору: он может снять ограничение.' }) : null));
    tick(); L.timer = setInterval(tick, 1000);
  }

  /* ---------- файл чека: сжатие фото на клиенте, PDF как есть ---------- */
  function safeName(n) { return String(n || 'чек').replace(/[\u0000-\u001f<>]/g, '').slice(0, 60); }
  function isPdf(f) { return f.type === 'application/pdf' || /\.pdf$/i.test(f.name || ''); }
  function sizeText(b) { return b >= 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' МБ' : Math.max(1, Math.round(b / 1024)) + ' КБ'; }
  function blobB64(blob) { return new Promise(function (res, rej) { var fr = new FileReader(); fr.onload = function () { res(String(fr.result).replace(/^data:[^,]*,/, '')); }; fr.onerror = function () { rej(new Error('read')); }; fr.readAsDataURL(blob); }); }
  function toJpeg(src, w, h0, maxEdge, q) {
    return new Promise(function (resolve, reject) {
      var sc = Math.min(1, maxEdge / Math.max(w, h0)), cw = Math.max(1, Math.round(w * sc)), ch = Math.max(1, Math.round(h0 * sc)), cv = document.createElement('canvas');
      cv.width = cw; cv.height = ch; var cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cw, ch); cx.drawImage(src, 0, 0, cw, ch);
      cv.toBlob(function (b) { b ? resolve(b) : reject(new Error('fail')); }, 'image/jpeg', q);
    });
  }
  function processImage(file) {
    return new Promise(function (resolve, reject) {
      if (!file.size) return reject(new Error('empty'));
      if (file.size > LIM.imgSrcMB * 1048576) return reject(new Error('toobig'));
      function fromSrc(src, w, h0, rel) {
        var steps = [[1600, 0.82], [1400, 0.7], [1100, 0.6], [900, 0.5]], i = 0;
        (function next() {
          toJpeg(src, w, h0, steps[i][0], steps[i][1]).then(function (b) {
            if (b.size > LIM.imgOutBytes && i < steps.length - 1) { i++; return next(); }
            if (rel) rel(); if (b.size > LIM.imgOutBytes) return reject(new Error('toobig'));
            resolve({ kind: 'image', name: safeName(file.name), blob: b, url: URL.createObjectURL(b), size: b.size });
          }, function (e) { if (rel) rel(); reject(e); });
        })();
      }
      function viaImg() { var u = URL.createObjectURL(file), im = new Image(); im.onload = function () { fromSrc(im, im.naturalWidth, im.naturalHeight, function () { URL.revokeObjectURL(u); }); }; im.onerror = function () { URL.revokeObjectURL(u); reject(new Error('fail')); }; im.src = u; }
      if (window.createImageBitmap) createImageBitmap(file, { imageOrientation: 'from-image' }).then(function (b) { fromSrc(b, b.width, b.height, function () { if (b.close) b.close(); }); }, viaImg); else viaImg();
    });
  }
  function processPdf(file) {
    return new Promise(function (resolve, reject) {
      if (!file.size) return reject(new Error('empty'));
      if (file.size > LIM.pdfMB * 1048576) return reject(new Error('toobig'));
      file.slice(0, 5).arrayBuffer().then(function (b) {
        if (String.fromCharCode.apply(null, new Uint8Array(b)) !== '%PDF-') return reject(new Error('badtype'));
        resolve({ kind: 'pdf', name: safeName(file.name), blob: file, size: file.size });
      }, function () { reject(new Error('fail')); });
    });
  }
  function processAny(file) { if (isPdf(file)) return processPdf(file); if (/^image\//.test(file.type)) return processImage(file); return Promise.reject(new Error('badtype')); }
  var FERR = { badtype: 'Допустимы только фото и PDF.', empty: 'Файл пустой.', toobig: 'Файл слишком большой (PDF до ' + LIM.pdfMB + ' МБ, фото до ' + LIM.imgSrcMB + ' МБ).', fail: 'Не удалось обработать файл. Снимите чек ещё раз.' };

  /* ---------- форма поездки (быстрая: дата, сумма, людей, чек; маршрут запоминается; примечание и ФИО — в «Дополнительно») ---------- */
  function routeOptions(sel, value) { clear(sel); S.routes.concat([OTHER]).forEach(function (r) { sel.appendChild(h('option', { value: r, text: r })); }); sel.value = value; if (sel.value !== value) sel.value = S.routes[0]; }
  function tripForm(o) {   // o: { p: префикс testid, init: {...}, editing: bool }; → { el, collect(), reset(), setBusy(b), focus(), serverErr(code) }
    var n = ++uid, init = o.init || {}, file = null, busyFile = false, el;
    var fDate = h('input', { class: 'inp', type: 'date', id: 'fd' + n, max: today(), 'data-testid': 'f-date', required: true });
    var fRoute = h('select', { class: 'inp', id: 'fr' + n, 'data-testid': 'f-route' });
    var fOther = h('input', { class: 'inp', type: 'text', id: 'fo' + n, maxlength: String(LIM.other), placeholder: 'Откуда → куда', 'aria-label': 'Свой маршрут', 'data-testid': 'f-route-text', autocomplete: 'off' });
    var otherBox = h('div', { class: 'tx-other', hidden: true }, fOther);
    var fAmount = h('input', { class: 'inp tx-amount', type: 'text', inputmode: 'decimal', id: 'fa' + n, placeholder: '0', autocomplete: 'off', 'data-testid': 'f-amount' });
    var fPeople = h('input', { class: 'inp tx-people', type: 'text', inputmode: 'numeric', id: 'fp' + n, maxlength: '1', autocomplete: 'off', 'data-testid': 'f-people' });
    var per = h('div', { class: 'tx-per', 'data-testid': 'f-per', role: 'status', 'aria-live': 'polite' });
    var fNames = h('textarea', { class: 'inp', id: 'fn' + n, maxlength: String(LIM.names), rows: '3', placeholder: 'По одному ФИО в строке', 'data-testid': 'f-names' });
    var fNote = h('textarea', { class: 'inp tx-note', id: 'fm' + n, maxlength: String(LIM.note), rows: '2', placeholder: 'Например: ночная смена, ждали 15 минут', 'data-testid': 'f-note' });
    var cnt = h('span', { class: 'cnt2' });
    var errs = {}; function errEl(k) { return (errs[k] = h('div', { class: 'err', role: 'alert', hidden: true, 'data-testid': 'e-' + k })); }
    function setErr(k, t) { var e = errs[k]; if (!e) return; clear(e); if (t) { e.appendChild(ico('alert', 'sm')); e.appendChild(document.createTextNode(t)); } e.hidden = !t; }
    var inCam = h('input', { type: 'file', accept: 'image/*', capture: 'environment', hidden: true, 'data-testid': 'f-cam-input', 'aria-label': 'Снять чек на камеру' });
    var inFile = h('input', { type: 'file', accept: 'image/*,application/pdf,.pdf', hidden: true, 'data-testid': 'f-file-input', 'aria-label': 'Выбрать фото или PDF чека' });
    var tile = h('div', { class: 'tx-tile', 'data-testid': 'f-tile', tabindex: '-1' });
    var btnCam = h('button', { class: 'btn', type: 'button', 'data-testid': 'f-cam', onclick: function () { inCam.click(); } }, ico('camera', 'sm'), 'Снять чек');
    var btnGal = h('button', { class: 'btn secondary', type: 'button', 'data-testid': 'f-gal', onclick: function () { inFile.click(); } }, ico('image', 'sm'), 'Фото / PDF');
    function fieldOf(k) { return { date: fDate, route: fRoute, amount: fAmount, people: fPeople, file: tile }[k]; }
    function drawTile() {
      clear(tile); tile.classList.toggle('has', !!file || busyFile); tile.classList.toggle('keep', !file && !!o.editing);
      if (busyFile) { tile.appendChild(h('span', { class: 'spinner' })); tile.appendChild(h('span', { class: 'tn', text: 'Обрабатываем фото…' })); return; }
      if (file) {
        tile.appendChild(file.kind === 'pdf' ? h('span', { class: 'th pdf' }, ico('file')) : h('img', { class: 'th', src: file.url, alt: 'Чек', width: '56', height: '56', 'data-testid': 'f-thumb' }));
        tile.appendChild(h('span', { class: 'tn' }, h('b', { text: file.kind === 'pdf' ? 'PDF' : 'Фото чека' }), h('span', { text: file.name + ' · ' + sizeText(file.size) })));
        tile.appendChild(h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Убрать чек', 'data-testid': 'f-file-x', onclick: function () { setFile(null); } }, ico('x')));
      } else if (o.editing) tile.appendChild(h('span', { class: 'tn' }, h('b', { text: 'Прежний чек сохранён' }), h('span', { text: 'Выберите новый файл, только если нужно заменить.' })));
      else tile.appendChild(h('span', { class: 'tn muted', text: 'Чек не приложен' }));
    }
    function setFile(f) { if (file && file.url) URL.revokeObjectURL(file.url); file = f; drawTile(); if (f) setErr('file', ''); }
    function pick(inp) {
      var f = inp.files && inp.files[0]; inp.value = ''; if (!f) return;
      busyFile = true; drawTile(); btnCam.disabled = btnGal.disabled = true; setErr('file', '');
      processAny(f).then(function (r) { busyFile = false; btnCam.disabled = btnGal.disabled = false; setFile(r); },
        function (e) { busyFile = false; btnCam.disabled = btnGal.disabled = false; drawTile(); setErr('file', FERR[e && e.message] || FERR.fail); });
    }
    inCam.addEventListener('change', function () { pick(inCam); }); inFile.addEventListener('change', function () { pick(inFile); });
    function people() { return +fPeople.value; }
    function updPer() { var a = parseAmount(fAmount.value), p = people(); per.textContent = a > 0 && isFinite(a) && p >= 1 && p <= LIM.maxPeople ? 'На человека: ' + money(a / p) : 'На человека: —'; }
    function setPeople(v) { v = Math.max(1, Math.min(LIM.maxPeople, v)); fPeople.value = String(v); updPer(); setErr('people', ''); }
    var minus = h('button', { class: 'iconbtn big', type: 'button', 'aria-label': 'Меньше людей', 'data-testid': 'f-people-minus', onclick: function () { setPeople((people() || 1) - 1); } }, ico('minus'));
    var plus = h('button', { class: 'iconbtn big', type: 'button', 'aria-label': 'Больше людей', 'data-testid': 'f-people-plus', onclick: function () { setPeople((people() || 0) + 1); } }, ico('plus'));
    fAmount.addEventListener('input', function () { updPer(); setErr('amount', ''); });
    fPeople.addEventListener('input', function () { fPeople.value = fPeople.value.replace(/\D/g, '').slice(0, 1); updPer(); setErr('people', ''); });
    fDate.addEventListener('input', function () { setErr('date', ''); });
    fRoute.addEventListener('change', function () { otherBox.hidden = fRoute.value !== OTHER; setErr('route', ''); if (!otherBox.hidden) fOther.focus(); });
    fOther.addEventListener('input', function () { setErr('route', ''); });
    fNote.addEventListener('input', function () { cnt.textContent = fNote.value.length + ' / ' + LIM.note; });
    function fill(v) {
      fDate.value = v.date || today(); routeOptions(fRoute, v.route || S.routes[0]); otherBox.hidden = fRoute.value !== OTHER; fOther.value = v.routeText || '';
      fAmount.value = v.amount ? String(v.amount).replace('.', ',') : ''; fPeople.value = String(v.people || 1); fNames.value = v.names || ''; fNote.value = v.note || ''; cnt.textContent = fNote.value.length + ' / ' + LIM.note; updPer();
      ['date', 'route', 'amount', 'people', 'file'].forEach(function (k) { setErr(k, ''); });
    }
    var more = h('details', { class: 'tx-more', 'data-testid': 'f-more' }, h('summary', { text: 'Дополнительно: примечание и ФИО пассажиров' }),
      h('div', { class: 'gap12 tx-morebody' },
        h('div', { class: 'field' }, h('label', { class: 'l', for: 'fn' + n }, 'ФИО пассажиров ', h('span', { text: 'необязательно' })), fNames),
        h('div', { class: 'field' }, h('label', { class: 'l', for: 'fm' + n }, 'Примечание ', cnt), fNote)));
    el = h('div', { class: 'tx-form gap16', 'data-testid': o.p + '-form' },
      h('div', { class: 'field' }, h('label', { class: 'l', for: 'fd' + n }, 'Дата поездки'), fDate, errEl('date')),
      h('div', { class: 'field' }, h('label', { class: 'l', for: 'fr' + n }, 'Маршрут'), fRoute, otherBox, errEl('route')),
      h('div', { class: 'tx-row2' },
        h('div', { class: 'field' }, h('label', { class: 'l', for: 'fa' + n }, 'Сумма, ₽'), fAmount, errEl('amount')),
        h('div', { class: 'field' }, h('label', { class: 'l', for: 'fp' + n }, 'Людей в машине'), h('div', { class: 'tx-step' }, minus, fPeople, plus), errEl('people'))),
      per,
      h('div', { class: 'field' }, h('div', { class: 'l' }, 'Чек ', h('span', { text: 'обязательно' })), tile, h('div', { class: 'tx-addrow' }, btnCam, btnGal), inCam, inFile, errEl('file'), h('p', { class: 'help', text: 'Фото уменьшается автоматически. PDF — до ' + LIM.pdfMB + ' МБ.' })),
      more);
    fill(init); drawTile();
    return {
      el: el, focus: function () { fAmount.focus(); },
      setBusy: function (b) { [fDate, fRoute, fOther, fAmount, fPeople, fNames, fNote, btnCam, btnGal, minus, plus].forEach(function (x) { x.disabled = b; }); },
      reset: function (keep) { setFile(null); fill({ route: keep.route, routeText: keep.routeText, people: keep.people }); },
      collect: function () {   // → Promise<payload | null>; ошибки показывает у полей
        var v = { date: fDate.value, route: fRoute.value, routeText: fOther.value, amount: String(fAmount.value).trim(), people: people(), names: fNames.value, note: fNote.value }, e = checkTrip(v, S.routes), first = null;
        ['date', 'route', 'amount', 'people'].forEach(function (k) { setErr(k, e[k] ? ERR[e[k]] : ''); if (e[k] && !first) first = k; });
        if (e.note || e.names) { more.open = true; toast(ERR[e.note || e.names], 'bad'); if (!first) first = 'note'; }
        if (!file && !o.editing) { setErr('file', ERR.receipt_required); if (!first) first = 'file'; }
        if (first) { var f = fieldOf(first) || fNote; try { f.focus(); } catch (x) { /* ignore */ } if (f.scrollIntoView) f.scrollIntoView({ block: 'center' }); return Promise.resolve(null); }
        var body = { date: v.date, route: v.route, amount: parseAmount(v.amount), people: v.people, names: v.names.trim(), note: v.note.trim() };
        if (v.route === OTHER) body.routeText = v.routeText.trim();
        if (!file) return Promise.resolve(body);
        return blobB64(file.blob).then(function (b64) { body.file = { b64: b64 }; body.pdfFlag = file.kind === 'pdf'; return body; });
      },
      serverErr: function (code) {
        var k = { bad_date: 'date', future_date: 'date', old_date: 'date', bad_amount: 'amount', amount_big: 'amount', bad_people: 'people', bad_route: 'route', route_long: 'route', receipt_required: 'file', bad_file: 'file', too_big: 'file' }[code];
        if (!k) return false; setErr(k, ERR[code]); var f = fieldOf(k); if (f && f.focus) { try { f.focus(); } catch (x) { /* ignore */ } } return true;
      }
    };
  }
  function sendBody(b) { var c = {}, k; for (k in b) if (k !== 'pdfFlag') c[k] = b[k]; if (c.file && b.pdfFlag) c.file = { b64: c.file.b64, pdf: true }; return c; }   // pdf — подсказка для демо; сервер определяет тип по сигнатуре файла

  /* ---------- экран ---------- */
  var addSec, listSec, form, savedBox, listBody, whoEl;
  function lastPrefs() { return load(LASTK, {}); }
  function mount() {
    clear(root); S.mounted = true; document.title = 'Учёт такси'; tabbar.hidden = false;
    var lp = lastPrefs();
    form = tripForm({ p: 'add', init: { route: lp.route, routeText: lp.routeText, people: lp.people } });
    var saveBtn = h('button', { class: 'btn big tx-save', type: 'button', 'data-testid': 'f-save' }, ico('check'), 'Сохранить поездку');
    savedBox = h('div', { class: 'tx-saved', role: 'status', 'data-testid': 'saved', hidden: true });
    saveBtn.addEventListener('click', function () { submitAdd(saveBtn, false); });
    addSec = h('section', { class: 'tx-sec tx-add', 'aria-label': 'Новая поездка' }, h('div', { class: 'card' }, h('h2', { text: 'Новая поездка' }), form.el, h('div', { class: 'tx-savebar' }, saveBtn)), savedBox);
    listBody = h('div', { class: 'stack', 'data-testid': 'list-body' });
    listSec = h('section', { class: 'tx-sec tx-listsec', 'aria-label': 'Журнал поездок' }, listBody);
    carBody = h('div', { class: 'stack', 'data-testid': 'car-body' });
    carSec = h('section', { class: 'tx-sec tx-carsec', 'aria-label': isAdmin() ? 'Водители на своих авто' : 'Я вожу людей на своём авто', 'data-testid': isAdmin() ? 'drv-sec' : 'car-sec' }, carBody);
    var themeBtn = h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Сменить тему', 'data-testid': 'theme', onclick: function () { toggleTheme(themeBtn); } }, ico(isDark() ? 'sun' : 'moon'));
    var refBtn = h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Обновить список', title: 'Обновить', 'data-testid': 'refresh', onclick: function () { loadList(); if (isAdmin()) drvLoad(); else carLoad(); } }, ico('refresh'));
    var head = h('div', { class: 'adm-title' }, h('div', { class: 'grow' }, h('h1', { text: 'Такси', 'data-testid': 'page-title' }), h('div', { class: 'sub' }, 'Учёт поездок · склад «Елино»', whoEl = h('span', { class: 'tx-who', 'data-testid': 'who' }), LIVE ? null : h('span', { class: 'demobadge', 'data-testid': 'demo-badge', text: 'ДЕМО' }))),
      h('div', { class: 'adm-tools' }, refBtn, themeBtn, h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Выйти', 'data-testid': 'logout', onclick: function () {
        confirmAct({ title: 'Выйти из учёта такси?', text: isAdmin() ? 'Вход в кабинет админа на этом устройстве тоже закроется. Чтобы войти снова, понадобится новый код из Telegram.' : 'Чтобы войти снова, понадобится новый код из Telegram.', yes: 'Выйти' }).then(function (r) { if (r) endSession(); }); } }, ico('logout'))));
    var wrap = h('main', { class: 'view tx-wrap', id: 'main', 'data-tab': S.tab === 'drv' ? 'car' : S.tab, 'data-testid': 'tx-wrap' }, head, h('div', { class: 'tx-cols' }, addSec, listSec, carSec));
    root.appendChild(wrap); renderTabs(); offlineBanner();
    if (isAdmin()) drvRender(); else carRender();
  }
  function renderTabs() {
    clear(tabbar); tabbar.classList.add('t3');
    [['add', 'Поездка', 'car'], ['list', 'Журнал', 'list'], isAdmin() ? ['drv', 'Водители', 'list'] : ['car', 'Мой авто', 'car']].forEach(function (t) {
      tabbar.appendChild(h('a', { class: 'tab', href: '#/' + t[0], 'data-tab': t[0], 'aria-current': S.tab === t[0] ? 'page' : null }, ico(t[2]), h('span', { text: t[1] })));
    });
  }
  function offlineBanner() { var o = $('#offline'); o.hidden = navigator.onLine !== false; if (!o.hidden) { clear(o); o.appendChild(ico('wifioff', 'sm')); o.appendChild(document.createTextNode(' Нет сети — сохранить поездку нельзя, данные могли устареть')); } }
  function tabOk(t) { return t === 'list' ? 'list' : (t === 'car' && !isAdmin()) ? 'car' : (t === 'drv' && isAdmin()) ? 'drv' : 'add'; }
  function setTab(t) {
    S.tab = tabOk(t); var w = $('.tx-wrap'); if (w) w.setAttribute('data-tab', S.tab === 'drv' ? 'car' : S.tab); renderTabs();
    document.title = ({ list: 'Журнал поездок', add: 'Новая поездка', car: 'Я вожу людей на своём авто', drv: 'Водители на своих авто' }[S.tab]) + ' · Такси'; window.scrollTo(0, 0);
  }

  function submitAdd(btn, confirmed) {
    if (!requireOnline()) return;
    form.collect().then(function (body) {
      if (!body) return;
      if (confirmed) body.confirmDup = true;
      btn.disabled = true; form.setBusy(true); clear(btn); btn.appendChild(h('span', { class: 'spinner' })); btn.appendChild(document.createTextNode(' Сохраняем…'));
      function idle() { btn.disabled = false; form.setBusy(false); clear(btn); btn.appendChild(ico('check')); btn.appendChild(document.createTextNode('Сохранить поездку')); }
      call('taxiAdd', sendBody(body)).then(function (r) {
        idle();
        if (r.ok) {
          store(LASTK, { route: body.route, routeText: body.routeText || '', people: body.people });
          S.last = { id: r.id, date: body.date, amount: body.amount, people: body.people, perPerson: r.perPerson };
          form.reset(lastPrefs()); showSaved(); toast('Поездка сохранена'); if (S.data) loadList(true);
          return;
        }
        if (r.error === 'duplicate') {
          confirmAct({ title: 'Похоже на дубль', text: 'Поездка с той же датой, суммой и числом людей уже внесена только что. Возможно, предыдущее нажатие сработало. Добавить ещё одну такую же?', yes: 'Всё равно добавить' }).then(function (c) { if (c) submitAdd(btn, true); });
          return;
        }
        if (form.serverErr(r.error)) return;
        toast(errText(r), 'bad');
      });
    });
  }
  function showSaved() {
    var s = S.last; clear(savedBox); if (!s) { savedBox.hidden = true; return; }
    savedBox.hidden = false;
    savedBox.appendChild(h('div', { class: 'ok-ic' }, ico('check')));
    savedBox.appendChild(h('div', { class: 'grow' }, h('b', { text: 'Сохранено: ' + dmy(s.date) + ' · ' + money(s.amount) }), h('span', { text: s.people + ' ' + plural(s.people, ['человек', 'человека', 'человек']) + ' · на человека ' + money(s.perPerson) })));
    savedBox.appendChild(h('button', { class: 'btn ghost sm', type: 'button', 'data-testid': 'to-list', onclick: function () { location.hash = '#/list'; } }, 'Журнал'));
  }

  /* ---------- журнал: период, итоги, список ---------- */
  function monthBounds(off) { var d = mskNow(), y = d.getUTCFullYear(), m = d.getUTCMonth() + off; return { from: isoOf(y, m, 1), to: isoOf(y, m + 1, 0), label: MONTHS[((m % 12) + 12) % 12] + ' ' + new Date(Date.UTC(y, m, 1)).getUTCFullYear() }; }
  function periodBounds() {
    if (S.period === 'month') return monthBounds(0);
    if (S.period === 'prev') return monthBounds(-1);
    var f = S.from || monthBounds(0).from, t = S.to || today(); return { from: f, to: t, label: dmy(f) + ' — ' + dmy(t) };
  }
  function loadList(quiet) {
    if (!session()) return Promise.resolve();
    var pb = periodBounds(); S.loading = true; S.err = ''; if (!quiet) renderList();
    return call('taxiList', { from: pb.from, to: pb.to }).then(function (r) {
      S.loading = false; if (!session()) return;
      if (r.ok) { S.data = r; S.err = ''; S.role = r.role || S.role; S.who = r.who || S.who; if (r.routes && r.routes.length) S.routes = r.routes; } else if (r.error !== 'auth') S.err = errText(r);
      renderList();
    });
  }
  function seg(label, key) { return h('button', { type: 'button', 'aria-pressed': S.period === key ? 'true' : 'false', 'data-testid': 'per-' + key, onclick: function () { S.period = key; S.data = null; loadList(); } }, label); }
  function renderList() {
    if (!listBody || !S.mounted) return; clear(listBody);
    if (whoEl) whoEl.textContent = S.who ? ' · ' + (isAdmin() ? 'админ' : S.who) : '';
    var pb = periodBounds(), d = S.data;
    var picker = h('div', { class: 'segrow tx-seg', role: 'group', 'aria-label': 'Период' }, seg('Этот месяц', 'month'), seg('Прошлый', 'prev'), seg('Период', 'custom'));
    var head = h('div', { class: 'card' }, h('div', { class: 'row between' }, h('h2', { text: 'Журнал поездок' }), h('span', { class: 'cap', 'data-testid': 'period-label', text: pb.label })), picker);
    listBody.appendChild(head);
    if (S.period === 'custom') {
      var fi = h('input', { class: 'inp', type: 'date', value: pb.from, max: today(), 'aria-label': 'С даты', 'data-testid': 'p-from' }), ti = h('input', { class: 'inp', type: 'date', value: pb.to, max: today(), 'aria-label': 'По дату', 'data-testid': 'p-to' }), pe = h('div', { class: 'err', role: 'alert', hidden: true, 'data-testid': 'p-err' });
      head.appendChild(h('div', { class: 'tx-custom' }, h('label', { class: 'field' }, h('span', { class: 'l', text: 'С' }), fi), h('label', { class: 'field' }, h('span', { class: 'l', text: 'По' }), ti),
        h('button', { class: 'btn', type: 'button', 'data-testid': 'p-apply', onclick: function () {
          if (!validIso(fi.value) || !validIso(ti.value) || fi.value > ti.value || addDays(fi.value, LIM.periodDays) < ti.value) { pe.textContent = ERR.bad_period; pe.hidden = false; return; }
          S.from = fi.value; S.to = ti.value; S.data = null; loadList(); } }, 'Показать'), pe));
    }
    if (S.err) { listBody.appendChild(h('div', { class: 'errbox', role: 'alert', 'data-testid': 'list-err' }, ico('alert'), h('div', null, h('b', { text: 'Не удалось загрузить журнал' }), h('span', { text: S.err }), h('div', null, h('button', { class: 'btn ghost', type: 'button', 'data-testid': 'list-retry', onclick: function () { loadList(); } }, 'Повторить'))))); return; }
    if (!d) { listBody.appendChild(h('div', { class: 'stack', 'aria-busy': 'true', 'data-testid': 'list-skel' }, h('div', { class: 'sk c' }), h('div', { class: 'sk c' }))); return; }
    var tt = d.totals, items = d.items || [];
    listBody.appendChild(h('div', { class: 'sumgrid tx-sum', 'data-testid': 'totals' },
      sumCard('Поездок', String(tt.count), '', 't-count'), sumCard('Общая сумма', money(tt.sum), '', 't-sum'),
      sumCard('Пассажиров', String(tt.people), 'человек всего', 't-people'), sumCard('На человека', tt.people ? money(tt.perPerson) : '—', 'в среднем', 't-per')));
    if (isAdmin() && d.byPerson && d.byPerson.length) {   // итоги по людям: только админу (сервер сотруднику их не отдаёт)
      var pp = h('div', { class: 'tx-days tx-persons', 'data-testid': 'by-person' });
      d.byPerson.forEach(function (b) { pp.appendChild(h('div', { class: 'tx-day pr', 'data-testid': 'person-row' }, h('span', { class: 'dd', text: b.name }), h('span', { class: 'dn', text: b.count + ' ' + plural(b.count, ['поездка', 'поездки', 'поездок']) + ' · ' + b.people + ' чел.' }), h('b', { class: 'num', text: money(b.sum) }))); });
      listBody.appendChild(h('div', { class: 'card' }, h('h2', { text: 'По людям' }), pp));
    }
    var csvBtn = h('button', { class: 'btn secondary', type: 'button', 'data-testid': 'csv', disabled: !tt.count, onclick: function () { exportCsv(d); } }, ico('download', 'sm'), 'Скачать CSV');
    listBody.appendChild(h('div', { class: 'tx-actions' }, csvBtn, tt.deleted ? h('label', { class: 'tx-chk' }, h('input', { type: 'checkbox', checked: S.showDeleted, 'data-testid': 'show-del', onchange: function (e) { S.showDeleted = e.target.checked; renderList(); } }), h('span', { text: 'Показывать удалённые (' + tt.deleted + ')' })) : null));
    if (tt.byDay.length) {
      var days = h('div', { class: 'tx-days', 'data-testid': 'by-day' });
      tt.byDay.forEach(function (b) { days.appendChild(h('div', { class: 'tx-day', 'data-testid': 'day-row' }, h('span', { class: 'dd', text: dmy(b.date).slice(0, 5) + ' ' + dowOf(b.date) }), h('span', { class: 'dn', text: b.count + ' ' + plural(b.count, ['поездка', 'поездки', 'поездок']) + ' · ' + b.people + ' чел.' }), h('b', { class: 'num', text: money(b.sum) }))); });
      listBody.appendChild(h('div', { class: 'card' }, h('h2', { text: 'По дням' }), days));
    }
    var shown = items.filter(function (x) { return x.status === 'active' || S.showDeleted; });
    if (!shown.length) listBody.appendChild(h('div', { class: 'card empty', 'data-testid': 'empty' }, h('div', { class: 'eic' }, ico('car', 'lg')), h('b', { text: items.length ? 'Только удалённые поездки' : 'Поездок за период нет' }), h('span', { text: items.length ? 'Включите «Показывать удалённые», чтобы увидеть их.' : 'Добавьте поездку на вкладке «Поездка».' })));
    else { var lst = h('div', { class: 'alist tx-trips', 'data-testid': 'trip-list' }); shown.forEach(function (x) { lst.appendChild(tripCard(x)); }); listBody.appendChild(lst); }
    if (d.truncated) listBody.appendChild(h('p', { class: 'help', text: 'Показаны не все поездки периода. Сузьте период.' }));
  }
  function sumCard(l, n, s, tid) { return h('div', { class: 'card sumcard' }, h('div', { class: 'n num', 'data-testid': tid, text: n }), h('div', { class: 'l', text: l }), s ? h('div', { class: 's', text: s }) : null); }
  function tripCard(x) {
    var del = x.status === 'deleted', acts = h('div', { class: 'acts tx-acts' });
    if (x.hasFile) acts.appendChild(h('button', { class: 'btn ghost fbtn', type: 'button', 'data-testid': 'open-receipt', onclick: function () { openReceipt(x); } }, ico(x.fileKind === 'pdf' ? 'file' : 'receipt', 'sm'), 'Чек'));
    if (!del) {
      acts.appendChild(h('button', { class: 'btn secondary', type: 'button', 'data-testid': 'edit', onclick: function () { editTrip(x); } }, ico('edit', 'sm'), 'Исправить'));
      acts.appendChild(h('button', { class: 'btn danger', type: 'button', 'data-testid': 'del', onclick: function () { deleteTrip(x); } }, ico('trash', 'sm'), 'Удалить'));
    }
    return h('article', { class: 'card acard tx-trip' + (del ? ' deleted' : ''), 'data-testid': 'trip', 'data-id': x.id, 'data-status': x.status },
      h('div', { class: 'hd' }, h('div', { class: 'grow' }, h('div', { class: 'nm', text: dmy(x.date) + ' · ' + dowOf(x.date) }), h('div', { class: 'meta', text: x.route })), h('div', { class: 'amt num', text: money(x.amount) })),
      h('div', { class: 'tx-meta' }, chip(x.people + ' ' + plural(x.people, ['человек', 'человека', 'человек']), 'info', 'car'), chip('на человека ' + money(x.perPerson), 'gray'), del ? chip('Удалено', 'bad', 'trash') : null, x.changed && !del ? chip('Исправлено', 'warn') : null, isAdmin() && x.by ? h('span', { class: 'chip gray', 'data-testid': 'trip-by', text: 'внёс: ' + x.by }) : null),
      x.names ? h('div', { class: 'txt' }, h('b', { text: 'Пассажиры' }), x.names) : null, x.note ? h('div', { class: 'txt' }, h('b', { text: 'Примечание' }), x.note) : null,
      del ? h('div', { class: 'txt add', 'data-testid': 'del-reason' }, h('b', { text: 'Причина удаления' }), x.reason) : null, acts);
  }
  function openReceipt(x) {
    if (!requireOnline()) return;
    call('taxiFileLink', { id: x.id }).then(function (r) {
      if (!r.ok) { toast(errText(r), 'bad'); return; }
      var w = null; try { w = window.open(r.href, '_blank'); if (w) w.opener = null; } catch (e) { w = null; }   // ссылка уже проверена сервером (только адреса Яндекса); opener обнуляем вручную: с noopener window.open всегда возвращает null и мы не узнали бы о блокировщике окон
      if (!w) { var ctl = openDialog({ title: 'Чек готов', body: h('div', { class: 'gap12' }, h('p', { class: 'cap', text: 'Ссылка временная. Нажмите, чтобы открыть.' }), h('a', { class: 'btn', href: r.href, target: '_blank', rel: 'noopener noreferrer', 'data-testid': 'file-link', onclick: function () { setTimeout(function () { ctl.close(); }, 200); } }, ico('receipt', 'sm'), 'Открыть чек')) }); }
    });
  }
  function editTrip(x) {
    var other = x.route.indexOf(OTHER + ': ') === 0, ef = tripForm({ p: 'edit', editing: true, init: { date: x.date, route: other ? OTHER : x.route, routeText: other ? x.route.slice(OTHER.length + 2) : '', amount: x.amount, people: x.people, names: x.names, note: x.note } });
    var save = h('button', { class: 'btn', type: 'button', 'data-testid': 'edit-save' }, 'Сохранить'), ctl;
    if (x.names || x.note) $('details', ef.el).open = true;
    save.addEventListener('click', function () {
      if (!requireOnline()) return;
      ef.collect().then(function (body) {
        if (!body) return; body.id = x.id; save.disabled = true; ef.setBusy(true); clear(save); save.appendChild(h('span', { class: 'spinner' })); save.appendChild(document.createTextNode(' Сохраняем…'));
        call('taxiUpdate', sendBody(body)).then(function (r) {
          save.disabled = false; ef.setBusy(false); clear(save); save.appendChild(document.createTextNode('Сохранить'));
          if (r.ok) { ctl.close(true); toast('Поездка исправлена'); loadList(true); return; }
          if (r.error === 'state' || r.error === 'not_found') { ctl.close(true); toast(errText(r), 'warn'); loadList(true); return; }
          if (ef.serverErr(r.error)) return;
          toast(errText(r), 'bad');
        });
      });
    });
    ctl = openDialog({ title: 'Исправить поездку', body: ef.el, footer: h('div', { class: 'btnrow' }, h('button', { class: 'btn ghost', type: 'button', 'data-testid': 'edit-cancel', onclick: function () { ctl.close(); } }, 'Отмена'), save), focus: function () { ef.focus(); } });
  }
  function deleteTrip(x) {
    confirmAct({ title: 'Удалить поездку?', who: dmy(x.date) + ' · ' + money(x.amount) + ' · ' + x.people + ' ' + plural(x.people, ['человек', 'человека', 'человек']), text: 'Поездка исчезнет из итогов, но строка останется в таблице со статусом «Удалено» и вашей причиной, чек сохранится на Диске.',
      reason: true, reasonHint: 'Например: поездка отменена, внесено по ошибке', danger: true, yes: 'Удалить' }).then(function (c) {
      if (!c) return; if (!requireOnline()) return;
      call('taxiDelete', { id: x.id, reason: c.reason }).then(function (r) {
        if (r.ok) { toast('Поездка удалена'); loadList(true); return; }
        var soft = r.error === 'state' || r.error === 'not_found'; toast(errText(r), soft ? 'warn' : 'bad'); if (soft) loadList(true);
      });
    });
  }

  /* ---------- CSV (за период, только активные поездки; «;» и запятая в числах — для Excel с русскими настройками) ---------- */
  function csvCell(v) {
    var s = String(v == null ? '' : v).replace(/\r?\n/g, ' ');
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;   // защита от формул при открытии в Excel
    return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function num(n) { return (Math.round(n * 100) / 100).toFixed(2).replace('.', ','); }
  function csvText(d) {
    var rows = [['Дата', 'Маршрут', 'Сумма, ₽', 'Людей', 'На человека, ₽', 'ФИО пассажиров', 'Примечание', 'ID', 'Создано (МСК)'].concat(isAdmin() ? ['Внёс'] : [])];
    d.items.filter(function (x) { return x.status === 'active'; }).slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.created < b.created ? -1 : 1); })
      .forEach(function (x) { rows.push([dmy(x.date), x.route, num(x.amount), x.people, num(x.perPerson), x.names, x.note, x.id, x.created].concat(isAdmin() ? [x.by || 'админ'] : [])); });
    var t = d.totals; rows.push(['Итого', 'поездок: ' + t.count, num(t.sum), t.people, t.people ? num(t.perPerson) : '', '', '', '', ''].concat(isAdmin() ? [''] : []));
    return '\ufeff' + rows.map(function (r) { return r.map(csvCell).join(';'); }).join('\r\n') + '\r\n';
  }
  function exportCsv(d) {
    var blob = new Blob([csvText(d)], { type: 'text/csv;charset=utf-8' }), url = URL.createObjectURL(blob), a = h('a', { href: url, download: 'taxi_' + d.from + '_' + d.to + '.csv', hidden: true });
    document.body.appendChild(a); a.click(); setTimeout(function () { a.remove(); URL.revokeObjectURL(url); }, 1500); toast('Файл CSV сформирован');
  }

  /* ---------- «Я вожу людей на своём авто»: профиль водителя и рейсы без чека (сотрудник), водители и рейсы за период (админ) ---------- */
  var PLATE_LAT = { A: 'А', B: 'В', E: 'Е', K: 'К', M: 'М', H: 'Н', O: 'О', P: 'Р', C: 'С', T: 'Т', Y: 'У', X: 'Х' };
  function plateNorm(v) {   // как на сервере: 'a123bc77', 'А 123 ВС 777', 'A123BC77RUS' → 'А123ВС77'; '' если формат не российский
    var t = String(v == null ? '' : v).toUpperCase().replace(/[\s\-_.]+/g, '').replace(/RUS$/, '').replace(/РУС$/, '');
    t = t.split('').map(function (c) { return PLATE_LAT[c] || c; }).join('');
    var m = /^[АВЕКМНОРСТУХ]\d{3}[АВЕКМНОРСТУХ]{2}(\d{2,3})$/.exec(t);
    return !m || /^0+$/.test(m[1]) || t.slice(1, 4) === '000' ? '' : t;
  }
  function fioNorm(v) {
    var t = String(v == null ? '' : v).replace(/[\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim(), w = t.split(' '), i;
    if (w.length < 3 || w.length > 4) return '';
    for (i = 0; i < w.length; i++) if (w[i].length < 2 || w[i].length > 40 || !/^[A-Za-zА-Яа-яЁё]+(?:[-'’][A-Za-zА-Яа-яЁё]+)*$/.test(w[i])) return '';
    return w.map(function (x) { return x.toLowerCase().replace(/(^|[-'’])([a-zа-яё])/g, function (m0, a, b) { return a + b.toUpperCase(); }); }).join(' ');
  }
  var DLIM = { perDay: 20, maxKm: 3000, car: 60, color: 30 };
  (function () {
    var add = {
      bad_fio: 'Введите ФИО полностью: фамилия, имя и отчество.', bad_car: 'Укажите марку и модель, например: Лада Гранта.',
      bad_plate: 'Госномер не распознан. Пример: А123ВС77 (буквы А В Е К М Н О Р С Т У Х, три цифры, две буквы, регион).', bad_color: 'Цвет: только буквы, до ' + DLIM.color + ' знаков.',
      plate_taken: 'Этот госномер уже закреплён за другим водителем. Обратитесь к администратору.', no_driver: 'Сначала заполните профиль водителя.', driver_off: 'Профиль водителя отключён администратором.',
      day_limit: 'Не больше ' + DLIM.perDay + ' рейсов в сутки на водителя.', bad_km: 'Километраж: число больше 0, не больше ' + DLIM.maxKm + '.', forbidden: 'Это действие недоступно для вашей роли.', rate: 'Слишком часто. Подождите немного и повторите.',
      bad_status: 'Неверный статус.'
    };
    Object.keys(add).forEach(function (k) { if (!ERR[k]) ERR[k] = add[k]; });
  })();
  function checkDrive(v, routes) {   // → { поле: код ошибки }
    var e = {}, tdy = today();
    if (!validIso(v.date)) e.date = 'bad_date'; else if (v.date > tdy) e.date = 'future_date'; else if (v.date < addDays(tdy, -LIM.daysBack)) e.date = 'old_date';
    if (routes.indexOf(v.route) < 0) { if (v.route !== OTHER) e.route = 'bad_route'; else { var o = String(v.routeText || '').replace(/\s+/g, ' ').trim(); if (o.length < 2) e.route = 'bad_route'; else if (o.length > LIM.other) e.route = 'route_long'; } }
    if (!(v.people >= 1 && v.people <= LIM.maxPeople && v.people === Math.floor(v.people))) e.people = 'bad_people';
    if (String(v.km).trim() !== '') { var k = parseAmount(String(v.km)); if (!isFinite(k) || !(k > 0) || k > DLIM.maxKm || Math.abs(k * 10 - Math.round(k * 10)) > 1e-6) e.km = 'bad_km'; }
    if (String(v.amount).trim() !== '') { var a = parseAmount(String(v.amount)); if (!isFinite(a) || !(a > 0) || Math.abs(a * 100 - Math.round(a * 100)) > 1e-6) e.amount = 'bad_amount'; else if (a > LIM.maxAmount) e.amount = 'amount_big'; }
    if (String(v.note || '').trim().length > LIM.note) e.note = 'note_long';
    if (String(v.names || '').length > LIM.names) e.names = 'names_long';
    return e;
  }
  function phoneFmt(d) { d = String(d || ''); return /^7\d{10}$/.test(d) ? '+7 ' + d.slice(1, 4) + ' ' + d.slice(4, 7) + '-' + d.slice(7, 9) + '-' + d.slice(9) : d; }
  function fieldBox(label, input, errs, key, hint) {
    var e = h('div', { class: 'err', role: 'alert', hidden: true, 'data-testid': 'e-' + key }); errs[key] = e;
    return h('div', { class: 'field' }, h('label', { class: 'l' }, label), input, hint ? h('p', { class: 'help', text: hint }) : null, e);
  }
  function setFieldErr(errs, k, t) { var e = errs[k]; if (!e) return; clear(e); if (t) { e.appendChild(ico('alert', 'sm')); e.appendChild(document.createTextNode(t)); } e.hidden = !t; }
  function profileForm(init) {   // → { el, collect(), setBusy(b), serverErr(code) }
    var errs = {}, n = ++uid;
    var fName = h('input', { class: 'inp', type: 'text', id: 'pn' + n, maxlength: '120', autocomplete: 'name', placeholder: 'Иванов Пётр Сергеевич', 'data-testid': 'drv-name', value: init.name || '' });
    var fPhone = h('input', { class: 'inp', type: 'tel', id: 'pp' + n, inputmode: 'tel', maxlength: '24', autocomplete: 'tel', placeholder: '+7 900 000-00-01', 'data-testid': 'drv-phone', value: init.phone ? phoneFmt(init.phone) : '' });
    var fCar = h('input', { class: 'inp', type: 'text', id: 'pc' + n, maxlength: String(DLIM.car), placeholder: 'Лада Гранта', 'data-testid': 'drv-car', value: init.car || '' });
    var fPlate = h('input', { class: 'inp', type: 'text', id: 'pl' + n, maxlength: '20', autocapitalize: 'characters', autocomplete: 'off', placeholder: 'А123ВС77', 'data-testid': 'drv-plate', value: init.plate || '' });
    var fColor = h('input', { class: 'inp', type: 'text', id: 'pk' + n, maxlength: String(DLIM.color), placeholder: 'Например: белый', 'data-testid': 'drv-color', value: init.color || '' });
    var prev = h('p', { class: 'help', 'data-testid': 'drv-plate-prev', 'aria-live': 'polite' });
    function updPlate() { var p = plateNorm(fPlate.value); prev.textContent = fPlate.value.trim() ? (p ? 'Номер будет записан так: ' + p : 'Номер пока не похож на российский: А123ВС77') : ''; setFieldErr(errs, 'plate', ''); }
    fPlate.addEventListener('input', updPlate); updPlate();
    [['name', fName], ['phone', fPhone], ['car', fCar], ['color', fColor]].forEach(function (p) { p[1].addEventListener('input', function () { setFieldErr(errs, p[0], ''); }); });
    var map = { name: fName, phone: fPhone, car: fCar, plate: fPlate, color: fColor }, sErr = { bad_fio: 'name', bad_phone: 'phone', bad_car: 'car', bad_plate: 'plate', plate_taken: 'plate', bad_color: 'color' };
    var el = h('div', { class: 'tx-form gap16', 'data-testid': 'drv-form' },
      fieldBox('ФИО полностью', fName, errs, 'name', 'Фамилия, имя и отчество.'), fieldBox('Телефон', fPhone, errs, 'phone', 'По умолчанию номер, с которого вы вошли.'),
      fieldBox('Марка и модель автомобиля', fCar, errs, 'car'), h('div', null, fieldBox('Госномер', fPlate, errs, 'plate'), prev), fieldBox(h('span', null, 'Цвет ', h('span', { text: 'необязательно' })), fColor, errs, 'color'));
    return {
      el: el,
      setBusy: function (b) { [fName, fPhone, fCar, fPlate, fColor].forEach(function (x) { x.disabled = b; }); },
      collect: function () {
        var v = { name: fioNorm(fName.value), phone: fPhone.value.replace(/\D/g, ''), car: fCar.value.replace(/\s+/g, ' ').trim(), plate: plateNorm(fPlate.value), color: fColor.value.replace(/\s+/g, ' ').trim() }, first = null, bad = {};
        if (!v.name) bad.name = 'bad_fio';
        if (v.phone.length < 10 || v.phone.length > 12) bad.phone = 'bad_phone';
        if (v.car.length < 2 || v.car.length > DLIM.car || !/[A-Za-zА-Яа-яЁё]/.test(v.car) || !/^[A-Za-zА-Яа-яЁё0-9][A-Za-zА-Яа-яЁё0-9 .\-\/+()]*$/.test(v.car)) bad.car = 'bad_car';
        if (!v.plate) bad.plate = 'bad_plate';
        if (v.color && (v.color.length > DLIM.color || !/^[A-Za-zА-Яа-яЁё0-9 \-]+$/.test(v.color))) bad.color = 'bad_color';
        ['name', 'phone', 'car', 'plate', 'color'].forEach(function (k) { setFieldErr(errs, k, bad[k] ? ERR[bad[k]] : ''); if (bad[k] && !first) first = k; });
        if (first) { try { map[first].focus(); } catch (x) { /* ignore */ } return null; }
        return { name: v.name, phone: v.phone, car: v.car, plate: v.plate, color: v.color };
      },
      serverErr: function (code) { var k = sErr[code]; if (!k) return false; setFieldErr(errs, k, ERR[code]); try { map[k].focus(); } catch (x) { /* ignore */ } return true; }
    };
  }
  function driveForm(o) {   // o: { p, init }; → { el, collect(), reset(keep), setBusy(b), serverErr(code) }
    var n = ++uid, init = o.init || {}, errs = {};
    var fDate = h('input', { class: 'inp', type: 'date', id: 'dd' + n, max: today(), 'data-testid': o.p + '-date', required: true });
    var fRoute = h('select', { class: 'inp', id: 'dr' + n, 'data-testid': o.p + '-route' });
    var fOther = h('input', { class: 'inp', type: 'text', maxlength: String(LIM.other), placeholder: 'Откуда → куда', 'aria-label': 'Свой маршрут', 'data-testid': o.p + '-route-text', autocomplete: 'off' });
    var otherBox = h('div', { class: 'tx-other', hidden: true }, fOther);
    var fPeople = h('input', { class: 'inp tx-people', type: 'text', inputmode: 'numeric', id: 'dp' + n, maxlength: '1', autocomplete: 'off', 'data-testid': o.p + '-people' });
    var fKm = h('input', { class: 'inp', type: 'text', inputmode: 'decimal', id: 'dk' + n, placeholder: 'необязательно', autocomplete: 'off', 'data-testid': o.p + '-km' });
    var fAmount = h('input', { class: 'inp', type: 'text', inputmode: 'decimal', id: 'da' + n, placeholder: 'необязательно', autocomplete: 'off', 'data-testid': o.p + '-amount' });
    var fNames = h('textarea', { class: 'inp', maxlength: String(LIM.names), rows: '3', placeholder: 'По одному ФИО в строке', 'data-testid': o.p + '-names', 'aria-label': 'Имена пассажиров' });
    var fNote = h('textarea', { class: 'inp tx-note', maxlength: String(LIM.note), rows: '2', placeholder: 'Например: возил в ночную смену', 'data-testid': o.p + '-note', 'aria-label': 'Примечание' });
    function people() { return +fPeople.value; }
    function setPeople(v) { v = Math.max(1, Math.min(LIM.maxPeople, v)); fPeople.value = String(v); setFieldErr(errs, 'people', ''); }
    var minus = h('button', { class: 'iconbtn big', type: 'button', 'aria-label': 'Меньше пассажиров', 'data-testid': o.p + '-minus', onclick: function () { setPeople((people() || 1) - 1); } }, ico('minus'));
    var plus = h('button', { class: 'iconbtn big', type: 'button', 'aria-label': 'Больше пассажиров', 'data-testid': o.p + '-plus', onclick: function () { setPeople((people() || 0) + 1); } }, ico('plus'));
    fPeople.addEventListener('input', function () { fPeople.value = fPeople.value.replace(/\D/g, '').slice(0, 1); setFieldErr(errs, 'people', ''); });
    fDate.addEventListener('input', function () { setFieldErr(errs, 'date', ''); }); fKm.addEventListener('input', function () { setFieldErr(errs, 'km', ''); }); fAmount.addEventListener('input', function () { setFieldErr(errs, 'amount', ''); });
    fRoute.addEventListener('change', function () { otherBox.hidden = fRoute.value !== OTHER; setFieldErr(errs, 'route', ''); if (!otherBox.hidden) fOther.focus(); }); fOther.addEventListener('input', function () { setFieldErr(errs, 'route', ''); });
    function fill(v) {
      fDate.value = v.date || today(); routeOptions(fRoute, v.route || S.routes[0]); otherBox.hidden = fRoute.value !== OTHER; fOther.value = v.routeText || '';
      fPeople.value = String(v.people || 1); fKm.value = v.km ? String(v.km).replace('.', ',') : ''; fAmount.value = v.amount ? String(v.amount).replace('.', ',') : ''; fNames.value = v.names || ''; fNote.value = v.note || '';
      ['date', 'route', 'people', 'km', 'amount'].forEach(function (k) { setFieldErr(errs, k, ''); });
    }
    var more = h('details', { class: 'tx-more', 'data-testid': o.p + '-more' }, h('summary', { text: 'Дополнительно: имена пассажиров и примечание' }),
      h('div', { class: 'gap12 tx-morebody' }, fieldBox(h('span', null, 'Имена пассажиров ', h('span', { text: 'необязательно' })), fNames, errs, 'names'), fieldBox('Примечание', fNote, errs, 'note')));
    var el = h('div', { class: 'tx-form gap16', 'data-testid': o.p + '-form' },
      fieldBox('Дата рейса', fDate, errs, 'date'), h('div', null, fieldBox('Маршрут', fRoute, errs, 'route'), otherBox),
      fieldBox('Пассажиров в машине', h('div', { class: 'tx-step' }, minus, fPeople, plus), errs, 'people'),
      h('div', { class: 'tx-row2' }, fieldBox(h('span', null, 'Км ', h('span', { text: 'по желанию' })), fKm, errs, 'km'), fieldBox(h('span', null, 'Сумма, ₽ ', h('span', { text: 'по желанию' })), fAmount, errs, 'amount')),
      more, h('p', { class: 'help', text: 'Чек не нужен. Километраж и сумма необязательны.' }));
    fill(init);
    var sErr = { bad_date: 'date', future_date: 'date', old_date: 'date', bad_people: 'people', bad_route: 'route', route_long: 'route', bad_km: 'km', bad_amount: 'amount', amount_big: 'amount', note_long: 'note', names_long: 'names' };
    return {
      el: el, focus: function () { fPeople.focus(); },
      setBusy: function (b) { [fDate, fRoute, fOther, fPeople, fKm, fAmount, fNames, fNote, minus, plus].forEach(function (x) { x.disabled = b; }); },
      reset: function (keep) { fill({ route: keep.route, routeText: keep.routeText, people: keep.people }); },
      collect: function () {
        var v = { date: fDate.value, route: fRoute.value, routeText: fOther.value, people: people(), km: fKm.value, amount: fAmount.value, names: fNames.value, note: fNote.value }, e = checkDrive(v, S.routes), first = null;
        ['date', 'route', 'people', 'km', 'amount', 'note', 'names'].forEach(function (k) { setFieldErr(errs, k, e[k] ? ERR[e[k]] : ''); if (e[k] && !first) first = k; });
        if (e.note || e.names) more.open = true;
        if (first) { var f = { date: fDate, route: fRoute, people: fPeople, km: fKm, amount: fAmount, note: fNote, names: fNames }[first]; try { f.focus(); } catch (x) { /* ignore */ } return null; }
        var body = { date: v.date, route: v.route, people: v.people, names: v.names.trim(), note: v.note.trim() };
        if (String(v.km).trim() !== '') body.km = parseAmount(v.km); if (String(v.amount).trim() !== '') body.amount = parseAmount(v.amount);
        if (v.route === OTHER) body.routeText = v.routeText.trim();
        return body;
      },
      serverErr: function (code) { var k = sErr[code]; if (!k) return false; setFieldErr(errs, k, ERR[code]); if (k === 'note' || k === 'names') more.open = true; return true; }
    };
  }
  function pnum(n) { return String(Math.round(n * 10) / 10).replace('.', ','); }
  function periodOf(st) {   // st: { period, from, to } → { from, to, label }
    if (st.period === 'month') return monthBounds(0); if (st.period === 'prev') return monthBounds(-1);
    var f = st.from || monthBounds(0).from, t = st.to || today(); return { from: f, to: t, label: dmy(f) + ' \u2192 ' + dmy(t) };
  }
  function periodPicker(st, reload, p) {   // сегменты «Этот месяц / Прошлый / Период» и поля дат
    var box = h('div', { class: 'gap12' });
    var segs = h('div', { class: 'segrow tx-seg', role: 'group', 'aria-label': 'Период' });
    [['month', 'Этот месяц'], ['prev', 'Прошлый'], ['custom', 'Период']].forEach(function (k) {
      segs.appendChild(h('button', { type: 'button', 'aria-pressed': st.period === k[0] ? 'true' : 'false', 'data-testid': p + '-per-' + k[0], onclick: function () { st.period = k[0]; st.data = null; reload(); } }, k[1]));
    });
    box.appendChild(segs);
    if (st.period === 'custom') {
      var pb = periodOf(st), fi = h('input', { class: 'inp', type: 'date', value: pb.from, max: today(), 'aria-label': 'С даты', 'data-testid': p + '-from' }), ti = h('input', { class: 'inp', type: 'date', value: pb.to, max: today(), 'aria-label': 'По дату', 'data-testid': p + '-to' });
      var pe = h('div', { class: 'err', role: 'alert', hidden: true, 'data-testid': p + '-per-err' });
      box.appendChild(h('div', { class: 'tx-custom' }, h('label', { class: 'field' }, h('span', { class: 'l', text: 'С' }), fi), h('label', { class: 'field' }, h('span', { class: 'l', text: 'По' }), ti),
        h('button', { class: 'btn', type: 'button', 'data-testid': p + '-apply', onclick: function () {
          if (!validIso(fi.value) || !validIso(ti.value) || fi.value > ti.value || addDays(fi.value, LIM.periodDays) < ti.value) { pe.textContent = ERR.bad_period; pe.hidden = false; return; }
          st.from = fi.value; st.to = ti.value; st.data = null; reload(); } }, 'Показать'), pe));
    }
    return box;
  }
  var carSec, carBody;
  var C = { driver: undefined, data: null, err: '', editing: false, period: 'month', from: '', to: '', last: null, loading: false };   // сотрудник
  var D = { data: null, err: '', period: 'month', from: '', to: '', driverId: '', loading: false };   // админ
  function carLoad(quiet) {
    if (!session() || isAdmin()) return Promise.resolve();
    var pb = periodOf(C); C.loading = true; C.err = ''; if (!quiet) carRender();
    return Promise.all([call('taxiDriverGet', {}), call('taxiDriveList', { from: pb.from, to: pb.to })]).then(function (rs) {
      C.loading = false; if (!session()) return;
      var g = rs[0], l = rs[1];
      if (g.ok) { C.driver = g.driver; if (g.routes && g.routes.length) S.routes = g.routes; if (g.crmName) C.crmName = g.crmName; if (g.phone) C.phone = g.phone; }
      if (l.ok) C.data = l;
      if (!g.ok && g.error !== 'auth') C.err = errText(g); else if (!l.ok && l.error !== 'auth') C.err = errText(l); else C.err = '';
      carRender();
    });
  }
  function carRender() {
    if (!carBody || !S.mounted || isAdmin()) return; clear(carBody);
    var drv = C.driver;
    carBody.appendChild(h('div', { class: 'card' }, h('h2', { 'data-testid': 'car-title', text: 'Я вожу людей на своём авто' }),
      h('p', { class: 'cap', text: 'Один раз заполните данные водителя, потом отмечайте дни, когда возили людей. Чек не нужен.' })));
    if (C.err) carBody.appendChild(h('div', { class: 'errbox', role: 'alert', 'data-testid': 'car-err' }, ico('alert'), h('div', null, h('b', { text: 'Не удалось загрузить' }), h('span', { text: C.err }), h('div', null, h('button', { class: 'btn secondary', type: 'button', 'data-testid': 'car-retry', onclick: function () { carLoad(); } }, 'Повторить')))));
    if (drv === undefined) { if (!C.err) carBody.appendChild(h('div', { class: 'stack', 'aria-busy': 'true', 'data-testid': 'car-skel' }, h('div', { class: 'sk c' }), h('div', { class: 'sk c' }))); return; }
    carBody.appendChild(carProfileCard(drv));
    if (!drv) return;
    if (drv.status === 'off') { carBody.appendChild(h('div', { class: 'errbox', role: 'alert', 'data-testid': 'drv-off' }, ico('lock'), h('div', null, h('b', { text: 'Профиль отключён' }), h('span', { text: 'Администратор отключил ваш профиль водителя. Новые рейсы вносить нельзя, история ниже сохранена.' })))); }
    else carBody.appendChild(carTripCard());
    carBody.appendChild(carHistory());
  }
  function carProfileCard(drv) {
    var card = h('div', { class: 'card', 'data-testid': 'drv-profile' });
    if (drv && !C.editing) {
      card.appendChild(h('div', { class: 'row between' }, h('h2', { text: 'Мой автомобиль' }), drv.status === 'off' ? chip('Отключён', 'bad', 'lock') : chip('Активен', 'ok', 'check')));
      card.appendChild(h('div', { class: 'tx-profile', 'data-testid': 'drv-summary' },
        h('div', { class: 'nm', 'data-testid': 'drv-s-name', text: drv.name }), h('div', { class: 'meta', 'data-testid': 'drv-s-phone', text: phoneFmt(drv.phone) }),
        h('div', { class: 'meta', 'data-testid': 'drv-s-car', text: drv.car + (drv.color ? ', ' + drv.color : '') }), h('div', { class: 'plate', 'data-testid': 'drv-s-plate', text: drv.plate })));
      if (drv.status !== 'off') card.appendChild(h('button', { class: 'btn secondary', type: 'button', 'data-testid': 'drv-edit', onclick: function () { C.editing = true; carRender(); } }, ico('edit', 'sm'), 'Изменить'));
      return card;
    }
    card.appendChild(h('h2', { text: drv ? 'Изменить данные водителя' : 'Профиль водителя' }));
    var pf = profileForm(drv ? drv : { name: C.crmName && fioNorm(C.crmName) ? fioNorm(C.crmName) : '', phone: C.phone || '' });
    var save = h('button', { class: 'btn big', type: 'button', 'data-testid': 'drv-save' }, ico('check'), 'Сохранить профиль');
    save.addEventListener('click', function () {
      if (!requireOnline()) return;
      var body = pf.collect(); if (!body) return;
      save.disabled = true; pf.setBusy(true); clear(save); save.appendChild(h('span', { class: 'spinner' })); save.appendChild(document.createTextNode(' Сохраняем…'));
      call('taxiDriverSave', body).then(function (r) {
        save.disabled = false; pf.setBusy(false); clear(save); save.appendChild(ico('check')); save.appendChild(document.createTextNode('Сохранить профиль'));
        if (r.ok) { C.driver = r.driver; C.editing = false; toast(r.same ? 'Данные не изменились' : (r.created ? 'Профиль водителя сохранён' : 'Профиль обновлён')); carLoad(true); return; }
        if (pf.serverErr(r.error)) return;
        if (r.error === 'driver_off') { C.editing = false; carLoad(); }
        toast(errText(r), 'bad');
      });
    });
    card.appendChild(pf.el); card.appendChild(h('div', { class: 'tx-savebar' }, save));
    if (drv) card.appendChild(h('button', { class: 'btn ghost', type: 'button', 'data-testid': 'drv-cancel', onclick: function () { C.editing = false; carRender(); } }, 'Отмена'));
    return card;
  }
  function carTripCard() {
    var lp = load(LASTK + '.drive', {}), df = driveForm({ p: 'dr', init: { route: lp.route, routeText: lp.routeText, people: lp.people } });
    var save = h('button', { class: 'btn big tx-save', type: 'button', 'data-testid': 'dr-save' }, ico('check'), 'Сохранить рейс'), saved = h('div', { class: 'tx-saved', role: 'status', 'data-testid': 'dr-saved', hidden: !C.last });
    function showSaved() { clear(saved); if (!C.last) { saved.hidden = true; return; } saved.hidden = false; saved.appendChild(h('div', { class: 'ok-ic' }, ico('check'))); saved.appendChild(h('div', { class: 'grow' }, h('b', { text: 'Рейс сохранён: ' + dmy(C.last.date) }), h('span', { text: C.last.people + ' ' + plural(C.last.people, ['пассажир', 'пассажира', 'пассажиров']) }))); }
    showSaved();
    function submit(confirmed) {
      if (!requireOnline()) return;
      var body = df.collect(); if (!body) return; if (confirmed) body.confirmDup = true;
      save.disabled = true; df.setBusy(true); clear(save); save.appendChild(h('span', { class: 'spinner' })); save.appendChild(document.createTextNode(' Сохраняем…'));
      call('taxiDriveAdd', body).then(function (r) {
        save.disabled = false; df.setBusy(false); clear(save); save.appendChild(ico('check')); save.appendChild(document.createTextNode('Сохранить рейс'));
        if (r.ok) { store(LASTK + '.drive', { route: body.route, routeText: body.routeText || '', people: body.people }); C.last = { date: body.date, people: body.people }; df.reset(load(LASTK + '.drive', {})); showSaved(); toast('Рейс сохранён'); carLoad(true); return; }
        if (r.error === 'duplicate') { confirmAct({ title: 'Похоже на дубль', text: 'Такой же рейс (дата, маршрут, число пассажиров) только что внесён. Возможно, прошлое нажатие сработало. Добавить ещё один?', yes: 'Добавить' }).then(function (c) { if (c) submit(true); }); return; }
        if (r.error === 'driver_off' || r.error === 'no_driver') { toast(errText(r), 'bad'); carLoad(); return; }
        if (df.serverErr(r.error)) return;
        toast(errText(r), 'bad');
      });
    }
    save.addEventListener('click', function () { submit(false); });
    return h('div', { class: 'card', 'data-testid': 'dr-card' }, h('h2', { text: 'Рейс на моём авто' }), df.el, h('div', { class: 'tx-savebar' }, save), saved);
  }
  function driveCard(x, mine) {
    var del = x.status === 'deleted', acts = h('div', { class: 'acts tx-acts' });
    if (!del) {
      if (mine && C.driver && C.driver.status !== 'off') acts.appendChild(h('button', { class: 'btn secondary', type: 'button', 'data-testid': 'dr-edit', onclick: function () { editDrive(x); } }, ico('edit', 'sm'), 'Исправить'));
      acts.appendChild(h('button', { class: 'btn danger', type: 'button', 'data-testid': 'dr-del', onclick: function () { deleteDrive(x, mine); } }, ico('trash', 'sm'), 'Удалить'));
    }
    return h('article', { class: 'card acard tx-drv' + (del ? ' deleted' : ''), 'data-testid': 'drive', 'data-id': x.id, 'data-status': x.status },
      h('div', { class: 'hd' }, h('div', { class: 'grow' }, h('div', { class: 'nm', text: dmy(x.date) + ' · ' + dowOf(x.date) }), h('div', { class: 'meta', text: x.route }), mine ? null : h('div', { class: 'meta', 'data-testid': 'drive-driver', text: x.driver + ' · ' + x.plate }))),
      h('div', { class: 'tx-meta' }, chip(x.people + ' ' + plural(x.people, ['пассажир', 'пассажира', 'пассажиров']), 'info', 'car'), chip('Личный авто', 'gray'), x.km ? chip(pnum(x.km) + ' км', 'gray') : null, x.amount ? chip(money(x.amount), 'gray') : null, del ? chip('Удалено', 'bad', 'trash') : null, x.changed && !del ? chip('Исправлено', 'warn') : null),
      x.names ? h('div', { class: 'txt' }, h('b', { text: 'Пассажиры' }), x.names) : null, x.note ? h('div', { class: 'txt' }, h('b', { text: 'Примечание' }), x.note) : null,
      del ? h('div', { class: 'txt add', 'data-testid': 'del-reason' }, h('b', { text: 'Причина удаления' }), x.reason) : null, acts);
  }
  function carHistory() {
    var d = C.data, box = h('div', { class: 'gap12', 'data-testid': 'car-history' }), pb = periodOf(C);
    box.appendChild(h('div', { class: 'card' }, h('div', { class: 'row between' }, h('h2', { text: 'Мои рейсы' }), h('span', { class: 'cap', 'data-testid': 'car-period', text: pb.label })), periodPicker(C, function () { carLoad(); }, 'car')));
    if (!d) return box;
    var t = d.totals;
    box.appendChild(h('div', { class: 'sumgrid tx-sum', 'data-testid': 'car-totals' }, sumCard('Рейсов', String(t.count), '', 'ct-count'), sumCard('Пассажиров', String(t.people), 'человек всего', 'ct-people'), sumCard('Дней', String(t.daysCount), 'когда возили', 'ct-days'), sumCard('Км', t.km ? pnum(t.km) : '—', 'по желанию', 'ct-km')));
    if (t.byDay.length) { var days = h('div', { class: 'tx-days', 'data-testid': 'car-days' }); t.byDay.forEach(function (b) { days.appendChild(h('div', { class: 'tx-day', 'data-testid': 'car-day' }, h('span', { class: 'dd', text: dmy(b.date).slice(0, 5) + ' ' + dowOf(b.date) }), h('span', { class: 'dn', text: b.count + ' ' + plural(b.count, ['рейс', 'рейса', 'рейсов']) }), h('span', { class: 'ds', text: b.people + ' ' + plural(b.people, ['пассажир', 'пассажира', 'пассажиров']) }))); }); box.appendChild(h('div', { class: 'card' }, h('h2', { text: 'Дни, когда я возил людей' }), days)); }
    if (!d.items.length) box.appendChild(h('div', { class: 'card empty', 'data-testid': 'car-empty' }, h('div', { class: 'eic' }, ico('car', 'lg')), h('b', { text: 'Рейсов за период нет' }), h('span', { text: 'Отметьте первый рейс формой выше.' })));
    else { var lst = h('div', { class: 'alist tx-trips', 'data-testid': 'drive-list' }); d.items.forEach(function (x) { lst.appendChild(driveCard(x, true)); }); box.appendChild(lst); }
    return box;
  }
  function editDrive(x) {
    var other = x.route.indexOf(OTHER + ': ') === 0, ef = driveForm({ p: 'de', init: { date: x.date, route: other ? OTHER : x.route, routeText: other ? x.route.slice(OTHER.length + 2) : '', people: x.people, km: x.km, amount: x.amount, names: x.names, note: x.note } });
    var save = h('button', { class: 'btn', type: 'button', 'data-testid': 'de-save' }, 'Сохранить'), ctl;
    if (x.names || x.note) $('details', ef.el).open = true;
    save.addEventListener('click', function () {
      if (!requireOnline()) return; var body = ef.collect(); if (!body) return; body.id = x.id;
      save.disabled = true; ef.setBusy(true); clear(save); save.appendChild(h('span', { class: 'spinner' })); save.appendChild(document.createTextNode(' Сохраняем…'));
      call('taxiDriveUpdate', body).then(function (r) {
        save.disabled = false; ef.setBusy(false); clear(save); save.appendChild(document.createTextNode('Сохранить'));
        if (r.ok) { ctl.close(true); toast('Рейс исправлен'); carLoad(true); return; }
        if (r.error === 'state' || r.error === 'not_found' || r.error === 'driver_off') { ctl.close(true); toast(errText(r), 'warn'); carLoad(true); return; }
        if (ef.serverErr(r.error)) return; toast(errText(r), 'bad');
      });
    });
    ctl = openDialog({ title: 'Исправить рейс', body: ef.el, footer: h('div', { class: 'btnrow' }, h('button', { class: 'btn ghost', type: 'button', 'data-testid': 'de-cancel', onclick: function () { ctl.close(); } }, 'Отмена'), save) });
  }
  function deleteDrive(x, mine) {
    confirmAct({ title: 'Удалить рейс?', who: dmy(x.date) + ' · ' + x.people + ' ' + plural(x.people, ['пассажир', 'пассажира', 'пассажиров']), text: 'Рейс исчезнет из итогов, строка в таблице останется с причиной.', reason: true, reasonHint: 'Например: внесено по ошибке', danger: true, yes: 'Удалить' }).then(function (c) {
      if (!c || !requireOnline()) return;
      call('taxiDriveDelete', { id: x.id, reason: c.reason }).then(function (r) {
        if (r.ok) { toast('Рейс удалён'); if (mine) carLoad(true); else drvLoad(true); return; }
        var soft = r.error === 'state' || r.error === 'not_found'; toast(errText(r), soft ? 'warn' : 'bad'); if (soft) { if (mine) carLoad(true); else drvLoad(true); }
      });
    });
  }
  /* --- админ: водители, дни и рейсы --- */
  function drvLoad(quiet) {
    if (!session() || !isAdmin()) return Promise.resolve();
    var pb = periodOf(D); D.loading = true; D.err = ''; if (!quiet) drvRender();
    return call('taxiDriveList', { from: pb.from, to: pb.to, driverId: D.driverId }).then(function (r) {
      D.loading = false; if (!session()) return;
      if (r.ok) { D.data = r; D.err = ''; if (r.routes && r.routes.length) S.routes = r.routes; } else if (r.error !== 'auth') D.err = errText(r);
      drvRender();
    });
  }
  function drvRender() {
    if (!carBody || !S.mounted || !isAdmin()) return; clear(carBody);
    var d = D.data, pb = periodOf(D);
    carBody.appendChild(h('div', { class: 'card' }, h('div', { class: 'row between' }, h('h2', { 'data-testid': 'drv-title', text: 'Водители на своих авто' }), h('span', { class: 'cap', 'data-testid': 'drv-period', text: pb.label })), periodPicker(D, function () { drvLoad(); }, 'dv')));
    if (D.err) carBody.appendChild(h('div', { class: 'errbox', role: 'alert', 'data-testid': 'drv-err' }, ico('alert'), h('div', null, h('b', { text: 'Не удалось загрузить' }), h('span', { text: D.err }), h('div', null, h('button', { class: 'btn secondary', type: 'button', 'data-testid': 'drv-retry', onclick: function () { drvLoad(); } }, 'Повторить')))));
    if (!d) { if (!D.err) carBody.appendChild(h('div', { class: 'stack', 'aria-busy': 'true', 'data-testid': 'drv-skel' }, h('div', { class: 'sk c' }), h('div', { class: 'sk c' }))); return; }
    var t = d.totals, dr = d.drivers || [], on = dr.filter(function (x) { return x.status === 'active'; }).length;
    carBody.appendChild(h('div', { class: 'sumgrid tx-sum', 'data-testid': 'drv-totals' }, sumCard('Водителей', String(dr.length), on + ' активных', 'dt-drivers'), sumCard('Рейсов', String(t.count), '', 'dt-count'), sumCard('Пассажиров', String(t.people), 'человек всего', 'dt-people'), sumCard('Дней с рейсами', String(t.daysCount), '', 'dt-days')));
    var sel = h('select', { class: 'inp', 'aria-label': 'Фильтр по водителю', 'data-testid': 'drv-filter' }, h('option', { value: '', text: 'Все водители' }));
    dr.forEach(function (x) { sel.appendChild(h('option', { value: x.id, text: x.name + ' · ' + x.plate })); }); sel.value = D.driverId;
    sel.addEventListener('change', function () { D.driverId = sel.value; D.data = null; drvLoad(); });
    carBody.appendChild(h('div', { class: 'card' }, h('div', { class: 'field' }, h('label', { class: 'l', text: 'Водитель' }), sel),
      h('div', { class: 'tx-actions' }, h('button', { class: 'btn secondary', type: 'button', 'data-testid': 'drv-csv', disabled: !t.count, onclick: function () { exportDrivesCsv(d); } }, ico('download', 'sm'), 'CSV рейсов'),
        h('button', { class: 'btn secondary', type: 'button', 'data-testid': 'drv-csv-list', disabled: !dr.length, onclick: function () { exportDriversCsv(d); } }, ico('download', 'sm'), 'CSV водителей'))));
    var list = h('div', { class: 'alist', 'data-testid': 'drivers' });
    if (!dr.length) list.appendChild(h('div', { class: 'card empty', 'data-testid': 'drv-empty' }, h('div', { class: 'eic' }, ico('car', 'lg')), h('b', { text: 'Водителей пока нет' }), h('span', { text: 'Сотрудник создаёт профиль на вкладке «Мой авто».' })));
    dr.forEach(function (x) {
      var off = x.status === 'off', days = h('details', { class: 'tx-more', 'data-testid': 'drv-days' }, h('summary', { text: 'Дни за период: ' + x.daysCount }));
      var dl = h('div', { class: 'tx-days' }); x.days.forEach(function (b) { dl.appendChild(h('div', { class: 'tx-day', 'data-testid': 'drv-day' }, h('span', { class: 'dd', text: dmy(b.date).slice(0, 5) + ' ' + dowOf(b.date) }), h('span', { class: 'dn', text: b.count + ' ' + plural(b.count, ['рейс', 'рейса', 'рейсов']) }), h('span', { class: 'ds', text: b.people + ' ' + plural(b.people, ['пассажир', 'пассажира', 'пассажиров']) }))); });
      if (!x.days.length) dl.appendChild(h('p', { class: 'cap', text: 'Рейсов за период нет.' })); days.appendChild(dl);
      list.appendChild(h('article', { class: 'card acard' + (off ? ' deleted' : ''), 'data-testid': 'driver', 'data-id': x.id, 'data-status': x.status },
        h('div', { class: 'hd' }, h('div', { class: 'grow' }, h('div', { class: 'nm', 'data-testid': 'driver-name', text: x.name }), h('div', { class: 'meta', 'data-testid': 'driver-phone', text: phoneFmt(x.phone) }), h('div', { class: 'meta', 'data-testid': 'driver-car', text: x.car + (x.color ? ', ' + x.color : '') })), h('div', { class: 'plate', 'data-testid': 'driver-plate', text: x.plate })),
        h('div', { class: 'tx-meta' }, off ? chip('Отключён', 'bad', 'lock') : chip('Активен', 'ok', 'check'), chip(x.count + ' ' + plural(x.count, ['рейс', 'рейса', 'рейсов']), 'info', 'car'), chip(x.people + ' ' + plural(x.people, ['пассажир', 'пассажира', 'пассажиров']), 'gray')), days,
        h('div', { class: 'acts tx-acts' },
          h('button', { class: 'btn ghost', type: 'button', 'data-testid': 'driver-only', onclick: function () { D.driverId = x.id; D.data = null; drvLoad(); } }, 'Рейсы'),
          h('button', { class: 'btn ' + (off ? 'secondary' : 'danger'), type: 'button', 'data-testid': off ? 'driver-on' : 'driver-off', onclick: function () { toggleDriver(x); } }, ico(off ? 'check' : 'lock', 'sm'), off ? 'Включить' : 'Отключить'))));
    });
    carBody.appendChild(list);
    if (t.byDay.length) { var days2 = h('div', { class: 'tx-days', 'data-testid': 'dv-by-day' }); t.byDay.forEach(function (b) { days2.appendChild(h('div', { class: 'tx-day', 'data-testid': 'dv-day' }, h('span', { class: 'dd', text: dmy(b.date).slice(0, 5) + ' ' + dowOf(b.date) }), h('span', { class: 'dn', text: b.count + ' ' + plural(b.count, ['рейс', 'рейса', 'рейсов']) }), h('span', { class: 'ds', text: b.people + ' ' + plural(b.people, ['пассажир', 'пассажира', 'пассажиров']) }))); }); carBody.appendChild(h('div', { class: 'card' }, h('h2', { text: 'Календарь: дни с рейсами' }), days2)); }
    if (d.items.length) { var lst = h('div', { class: 'alist tx-trips', 'data-testid': 'dv-drives' }); d.items.forEach(function (x) { lst.appendChild(driveCard(x, false)); }); carBody.appendChild(lst); }
    if (d.truncated) carBody.appendChild(h('p', { class: 'help', text: 'Показаны не все рейсы периода. Сузьте период.' }));
  }
  function toggleDriver(x) {
    var off = x.status !== 'off';
    confirmAct({ title: off ? 'Отключить водителя?' : 'Включить водителя?', who: x.name + ' · ' + x.plate, text: off ? 'Он не сможет вносить рейсы и менять профиль. История сохранится.' : 'Водитель снова сможет вносить рейсы.', reason: off, reasonHint: 'Например: больше не возит людей', danger: off, yes: off ? 'Отключить' : 'Включить' }).then(function (c) {
      if (!c || !requireOnline()) return;
      call('taxiDriverStatus', { id: x.id, status: off ? 'off' : 'active', reason: c.reason }).then(function (r) {
        if (r.ok) { toast(r.same ? 'Статус уже такой' : off ? 'Водитель отключён' : 'Водитель включён', r.same ? 'warn' : undefined); drvLoad(true); return; }
        toast(errText(r), 'bad');
      });
    });
  }
  function csvDown(rows, name) {
    var text = '\ufeff' + rows.map(function (r) { return r.map(csvCell).join(';'); }).join('\r\n') + '\r\n';
    var blob = new Blob([text], { type: 'text/csv;charset=utf-8' }), url = URL.createObjectURL(blob), a = h('a', { href: url, download: name, hidden: true });
    document.body.appendChild(a); a.click(); setTimeout(function () { a.remove(); URL.revokeObjectURL(url); }, 1500); toast('Файл CSV сформирован');
  }
  function drvCsvRows(d) {
    var by = {}; (d.drivers || []).forEach(function (x) { by[x.id] = x; });
    var rows = [['Дата', 'Водитель', 'Телефон', 'Марка и модель', 'Госномер', 'Маршрут', 'Пассажиров', 'Имена пассажиров', 'Км', 'Сумма, ₽', 'Примечание', 'Тип', 'ID', 'Создано (МСК)']];
    d.items.filter(function (x) { return x.status === 'active'; }).slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.created < b.created ? -1 : 1); }).forEach(function (x) {
      var v = by[x.driverId] || {}; rows.push([dmy(x.date), x.driver, phoneFmt(v.phone), v.car || '', x.plate, x.route, x.people, x.names, x.km ? pnum(x.km) : '', x.amount ? num(x.amount) : '', x.note, 'Личный авто', x.id, x.created]);
    });
    var t = d.totals; rows.push(['Итого', 'рейсов: ' + t.count, '', '', '', '', t.people, '', t.km ? pnum(t.km) : '', t.sum ? num(t.sum) : '', '', '', '', '']);
    return rows;
  }
  function exportDrivesCsv(d) { csvDown(drvCsvRows(d), 'drives_' + d.from + '_' + d.to + '.csv'); }
  function exportDriversCsv(d) {
    var rows = [['Водитель', 'Телефон', 'Марка и модель', 'Госномер', 'Цвет', 'Статус', 'Рейсов за период', 'Пассажиров за период', 'Дней с рейсами', 'Км', 'Сумма, ₽', 'ID']];
    (d.drivers || []).forEach(function (x) { rows.push([x.name, phoneFmt(x.phone), x.car, x.plate, x.color, x.status === 'off' ? 'Отключён' : 'Активен', x.count, x.people, x.daysCount, x.km ? pnum(x.km) : '', x.sum ? num(x.sum) : '', x.id]); });
    csvDown(rows, 'drivers_' + d.from + '_' + d.to + '.csv');
  }

  /* ---------- запуск ---------- */
  function route() { var t = tabOk(location.hash.replace(/^#\//, '')); if (S.mounted) { setTab(t); if (t === 'list' && !S.data && !S.loading) loadList(); if (t === 'car' && C.driver === undefined && !C.loading) carLoad(); if (t === 'drv' && !D.data && !D.loading) drvLoad(); } }
  window.addEventListener('hashchange', function () { if (session()) route(); });
  window.addEventListener('online', function () { if (S.mounted) offlineBanner(); }); window.addEventListener('offline', function () { if (S.mounted) offlineBanner(); });
  function boot() {
    if (!session()) { renderLogin(); return; }
    S.tab = tabOk(location.hash.replace(/^#\//, ''));
    mount(); loadList(); if (isAdmin()) drvLoad(); else carLoad(); if (!/^#\/(add|list|car|drv)$/.test(location.hash) || '#/' + S.tab !== location.hash) history.replaceState(null, '', '#/' + S.tab);
  }
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    var hadCtl = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (hadCtl && !$('[data-testid="update-bar"]')) {
        var bar = h('div', { class: 'updbar', role: 'status', 'data-testid': 'update-bar' }, h('span', { text: 'Вышла новая версия.' }),
          h('button', { class: 'btn', type: 'button', 'data-testid': 'update-now', onclick: function () { location.reload(); } }, 'Обновить'),
          h('button', { class: 'btn ghost', type: 'button', 'data-testid': 'update-later', onclick: function () { bar.remove(); } }, 'Позже'));
        document.body.appendChild(bar);
      }
      hadCtl = true;
    });
  }
  boot();
})();
