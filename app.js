/* Мои выплаты — прототип для исполнителей. Всё на вымышленных данных (mock-data.js).
   «Сервер» эмулируется в localStorage (pr.server), клиентский офлайн-кэш — pr.cache.
   Безопасность вывода: пользовательский текст попадает в DOM только через textContent (функция h()). */
(function () {
  'use strict';
  var M = window.MOCK, CFG = M.config;
  CFG.cardRequired = (window.APP_CONFIG || {}).mode !== 'live' && (window.APP_CONFIG || {}).cardDemo !== false;   // демо: банк и карта обязательны (cardDemo:false отключает); в боевом режиме ответ сервера (ADV_CARD_REQUIRED)
  var APPC = window.APP_CONFIG || {}, BOT_URL = /^https:\/\/t\.me\/[A-Za-z][A-Za-z0-9_]{4,31}$/.test(String(APPC.loginBotUrl || '')) ? APPC.loginBotUrl : 'https://t.me/tableworks_bot', BOT_NAME = '@' + BOT_URL.replace(/^.*\//, ''), LIVE = APPC.mode === 'live' && /^https:\/\//.test(APPC.backendUrl || '');   // demo по умолчанию, пока нет URL бэкенда
  var qs = new URLSearchParams(location.search);
  var LAT = LIVE ? 0 : qs.has('lat') ? +qs.get('lat') : 450;       // задержка «сети», мс (в боевом режиме — настоящая сеть)
  if (LIVE) { ['users', 'shifts', 'cases', 'incidents', 'promos', 'jobs', 'applications', 'advances'].forEach(function (k) { M[k] = []; }); M.OPS.length = 0; }   // демо-данных в боевом режиме нет
  var NBSP = '\u00a0';
  var NOW = LIVE ? new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 16) : (qs.get('now') || (M.today + 'T15:40'));   // «текущее время» прототипа (МСК); ?now=2026-10-02T19:00 — для проверки дедлайна
  M.today = NOW.slice(0, 10);
  M.periods = M.buildPeriods(M.today);   // 01–15 и 16–конец месяца; первым идёт текущий период по дате

  /* ---------- утилиты ---------- */
  function h(tag, props) {
    var el = document.createElement(tag), i, k, v;
    props = props || {};
    for (k in props) {
      v = props[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { add(el, x); }); return; }
    el.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
  function $(s, r) { return (r || document).querySelector(s); }
  function sum(a, f) { return a.reduce(function (s, x) { return s + f(x); }, 0); }
  function delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function money(n) { var s = String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP); return (n < 0 ? '−' : '') + s + NBSP + '₽'; }
  function minus(n) { return '−' + money(Math.abs(n)); }
  function num(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP); }
  function plural(n, f) { var a = Math.abs(n) % 100, b = a % 10; return f[(a > 10 && a < 20) ? 2 : b > 1 && b < 5 ? 1 : b === 1 ? 0 : 2]; }
  var MON = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
  var MONG = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  var DOW = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  function pd(s) { var a = s.split('-'); return new Date(Date.UTC(+a[0], +a[1] - 1, +a[2])); }
  function dmy(s) { var a = s.slice(0, 10).split('-'); return a[2] + '.' + a[1] + '.' + a[0]; }
  function dm(s) { var a = s.split('-'); return a[2] + '.' + a[1]; }
  var MONS = ['янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июн.', 'июл.', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'];
  function dms(s) { var a = s.slice(0, 10).split('-'); return (+a[2]) + ' ' + MONS[+a[1] - 1]; }   // «17 окт.»
  function dlong(s) { var a = s.slice(0, 10).split('-'); return (+a[2]) + ' ' + MONG[+a[1] - 1]; }
  function dowOf(s) { return DOW[pd(s).getUTCDay()]; }
  function periodLabel(p) { return dm(p.start) + ' – ' + dmy(p.end); }
  function fmtPhone(d) { d = d.length === 11 ? d.slice(1) : d; return d.length < 10 ? d : '+7 ' + d.slice(0, 3) + ' ' + d.slice(3, 6) + '-' + d.slice(6, 8) + '-' + d.slice(8, 10); }
  function maskPhone(d) { return '+7 ' + d.slice(1, 4) + ' •••-••-' + d.slice(-2); }
  function kb(n) { return Math.max(1, Math.round(n / 1024)) + ' КБ'; }
  function pctClass(p) { return p >= CFG.normGood ? 'good' : p >= CFG.normLow ? 'mid' : 'low'; }
  function pctText(p) { return p >= CFG.normGood ? 'Норма выполнена' : p >= CFG.normLow ? 'Ниже нормы' : 'Сильно ниже нормы'; }
  function rate4(n) { return (Math.round(n * 10000) / 10000).toFixed(4).replace('.', ','); }   // «ЗП сотруднику, ₽/ед» в таблице — 4 знака (16,3605)
  function normTxt(o) { return o.normH > 0 ? o.normH + ' ед./ч' : 'нормы нет'; }
  function rate(n) { return (Math.round(n * 100) / 100).toFixed(2).replace('.', ','); }
  function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* квота */ } }
  function load(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function rid() { var a = new Uint32Array(2); crypto.getRandomValues(a); return a[0].toString(36) + a[1].toString(36); }
  function stamp(ts) { return new Date(ts).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }

  /* ---------- иконки (константы, не пользовательские данные) ---------- */
  var IC = {
    home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    ded: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
    wallet: '<path d="M3 7a2 2 0 0 1 2-2h12v3"/><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M16 13.5h2"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>', check: '<path d="M20 6L9 17l-5-5"/>',
    cl: '<path d="M15 18l-6-6 6-6"/>', cr: '<path d="M9 18l6-6-6-6"/>', cd: '<path d="M6 9l6 6 6-6"/>',
    alert: '<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>', clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    wifioff: '<path d="M1 1l22 22M16.7 11.1A11 11 0 0 1 22.6 9M5 12.6a11 11 0 0 1 5.2-2.6M8.5 16.4a6 6 0 0 1 7 0M12 20h.01"/>',
    box: '<path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7z"/><path d="M3.3 7L12 12l8.7-5M12 22V12"/>',
    err: '<circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>',
    bed: '<path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/>',
    tag: '<path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><path d="M7 7h.01"/>',
    star: '<path d="M12 2l3 6.9 7.5.7-5.7 5 1.8 7.4L12 18.2 5.4 22l1.8-7.4-5.7-5L9 8.9z"/>',
    trend: '<path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
    briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    gift: '<path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>',
    paper: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'
  };
  function ico(n, cls) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'ico' + (cls ? ' ' + cls : '')); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
    s.innerHTML = IC[n] || '';   // только константы из IC
    return s;
  }
  var KIND = {
    brak: { n: 'Брак', ic: 'box' }, error: { n: 'Ошибка', ic: 'err' }, advance: { n: 'Аванс', ic: 'wallet' },
    housing: { n: 'Проживание', ic: 'bed' }, other: { n: 'Прочее', ic: 'tag' }
  };
  var KINDS = ['brak', 'error', 'advance', 'housing', 'other'];
  var ADV_ST = { pending: ['На рассмотрении', 'warn'], approved: ['Одобрен', 'info'], rejected: ['Отклонён', 'bad'], issued: ['Выдан', 'ok'], cancelled: ['Отменён', 'gray'] };
  var EX_ST = { waiting: ['Ждёт объяснения', 'warn'], sent: ['Отправлено', 'info'], accepted: ['Принято', 'ok'] };
  function chip(t, tone, ic) { return h('span', { class: 'chip ' + tone }, ic ? ico(ic, 'sm') : null, t); }
  function needPhotoOf() { return true; }   // по уже начисленному браку/ошибке: и фото, и объяснительная обязательны

  /* ---------- происшествия: типы, статусы, общая валидация (клиент И «сервер») ---------- */
  var ANON_TOPICS = { conditions: 'Условия труда', safety: 'Безопасность', boss: 'Руководство', pay: 'Зарплата', idea: 'Идея', other: 'Другое' };
  var APP_ST = { sent: ['Отправлен', 'info'], viewed: ['Просмотрен', 'warn'], invited: ['Приглашён на собеседование', 'ok'], declined: ['Закрыто', 'gray'] };
  var INC_TYPES = { brak: 'Брак', damage: 'Порча имущества', other: 'Другое' };
  var INC_ST = { review: ['Отправлено, ждёт проверки', 'info'], accepted: ['Принято', 'ok'], returned: ['Возвращено на доработку', 'warn'], rejected: ['Отклонено', 'bad'] };
  var INC_ST_IC = { review: 'clock', accepted: 'check', returned: 'info', rejected: 'x' };
  // общие тексты ошибок связи/сервера: одинаково на всех вкладках
  function netMsg(e) { return e === 'network' ? 'нет связи с сервером, повторите' : e === 'server' ? 'ошибка сервера, повторите позже' : e === 'busy' ? 'сервер занят, повторите через минуту' : e === 'rate_limit' ? 'слишком часто, подождите' : ''; }
  function dateErr(v, today) {
    if (!v) return 'Укажите дату нарушения';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || iso(pd(v)) !== v) return 'Неверная дата';
    if (v > today) return 'Дата не может быть в будущем';
    return '';
  }
  function iso(d) { return d.getUTCFullYear() + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + d.getUTCDate()).slice(-2); }
  function incidentErrors(p, today) {
    var e = [];
    var de = dateErr(p.date, today); if (de) e.push(de === 'Дата не может быть в будущем' ? 'future_date' : 'bad_date');
    if (!INC_TYPES[p.type]) e.push('type');
    if (String(p.desc || '').trim().length < CFG.incDescMin) e.push('desc');
    if (!p.scene || !p.scene.length) e.push('scene_photo');
    if (!p.damage || !p.damage.length) e.push('damage_photo');
    if (!p.acts || !p.acts.length) e.push('act');
    if (String(p.text || '').trim().length < CFG.explMin) e.push('text');
    [['scene', CFG.maxPhotos], ['damage', CFG.maxPhotos], ['acts', CFG.maxActs]].forEach(function (g) { if ((p[g[0]] || []).length > g[1]) e.push('too_many_' + g[0]); });
    ['scene', 'damage', 'acts'].forEach(function (k) { (p[k] || []).forEach(function (f) {
      if (!f || (f.kind !== 'image' && f.kind !== 'pdf')) e.push('bad_file'); else if (f.kind === 'pdf' && (k !== 'acts' || f.size > CFG.pdfMaxMB * 1048576 || !f.size)) e.push('bad_file');
    }); });
    return e;
  }

  /* ---------- «сервер» (эмуляция Apps Script в localStorage) ---------- */
  var SK = 'pr.server', CK = 'pr.cache', SESSK = 'pr.session';
  /* ---------- согласие на обработку персональных данных ----------
     ЧЕРНОВИК ДЛЯ ПРОВЕРКИ ЮРИСТОМ: текст ниже не утверждён. Версия должна совпадать с CONSENT_VERSION в backend/Code.gs.
     Экран включает сервер (Script Property CONSENT_REQUIRED=1); в демо он включён всегда (config.js: consentDemo: false отключает). */
  var CONSENT_VERSION = '2026-10-черновик';
  var CONSENT_TITLE = 'Согласие на обработку персональных данных';
  var CONSENT_TEXT = [
    'Я, пользователь приложения «Мои выплаты», даю согласие ООО «Персональное Решение» (далее оператор) на обработку моих персональных данных: фамилии, имени, отчества, номера телефона, табельного номера, должности и места работы, сведений о моих сменах, выработке, выплатах и авансах, банка и номера банковской карты, которые я указываю для выплаты аванса, а также фотографий, актов и объяснительных, которые я сам загружаю в приложение, а также моего местоположения (координат и точности) в момент запроса кода входа.',
    'Цели обработки: показать мне мои выплаты и выработку, принять мои заявки на аванс и выплатить аванс на мою карту, принять объяснительные и сведения о происшествиях, отправить мне код входа и показать администратору, откуда запрошен код входа.',
    'Срок хранения: данные хранятся, пока я работаю у оператора. Фотографии и файлы хранятся 12 месяцев с даты записи, затем переносятся в архив для удаления. Местоположение при запросе кода входа не хранится: оно передаётся один раз вместе с запросом и показывается администратору в Telegram.',
    'Я могу отозвать согласие или попросить удалить мои данные в любой момент, обратившись к бригадиру склада.'
  ];
  var MYDATA_ITEMS = ['Фамилия, имя, отчество', 'Номер телефона', 'Табельный номер', 'Ваши заявки на аванс, объяснительные и сведения о происшествиях', 'Банк и номер банковской карты для выплаты аванса (сотрудник видит только последние 4 цифры, полный номер видит администратор)', 'Фото случаев и происшествий, акты и чеки, которые вы загрузили', 'Местоположение в момент запроса кода входа (обязательно для входа): передаётся только вместе с запросом, видно администратору в Telegram и нигде не сохраняется'];
  function srv() {
    var s = load(SK, null);
    if (!s) { s = { cases: JSON.parse(JSON.stringify(M.cases)), advances: JSON.parse(JSON.stringify(M.advances)), incidents: JSON.parse(JSON.stringify(M.incidents)), codes: {}, locks: {}, attempts: {}, tg: [], lastReq: {}, blocked: {} }; store(SK, s); }
    if (!s.blocked) s.blocked = {};   // демо вкладки «Доступ»: телефон → 1
    if (!s.incidents) s.incidents = [];
    if (!s.consent) s.consent = {};   // демо вкладки «Согласия»: телефон → { version, at }
    if (!s.applications) s.applications = JSON.parse(JSON.stringify(M.applications || [])).map(function (x) { x.userId = 'ПР-0042'; return x; });
    if (!s.anon) s.anon = { items: [], captchas: {}, hour: [] };   // анонимное хранилище: нет ни телефона, ни ФИО, ни токена
    return s;
  }
  function save(s) { store(SK, s); devRender(); }
  function userByPhone(p) { return M.users.filter(function (u) { return u.phone === p; })[0]; }
  function lim(s, phone, now) {   // демо-копия серверных лимитов входа (Code.gs: llParse_), окно скользящее
    if (!s.lim) s.lim = {}; var st = s.lim[phone] || { r: [], w: [], b: 0 }, from = now - CFG.windowH * 3600000;
    st.r = st.r.filter(function (t) { return t > from; }); st.w = st.w.filter(function (t) { return t > from; }); if (st.b <= now) st.b = 0; s.lim[phone] = st; return st;
  }
  var server = {
    requestCode: function (phone) {
      var s = srv(), now = Date.now(), u = userByPhone(phone), st = lim(s, phone, now);   // лимиты входа: 3 запроса кода и 2 неверных кода за скользящие 3 часа на номер
      if (st.b > now) return { ok: false, error: 'locked', until: st.b };
      if (st.r.length >= CFG.reqMax) return { ok: false, error: 'req_limit', until: st.r[0] + CFG.windowH * 3600000 };
      var last = s.lastReq[phone] || 0;
      if (now - last < CFG.resendSec * 1000) return { ok: true, throttled: true, wait: Math.ceil((CFG.resendSec * 1000 - (now - last)) / 1000) };
      s.lastReq[phone] = now; st.r.push(now);
      if (s.blocked[phone]) { /* заблокирован: кода нет, админу ничего, ответ клиенту тот же */ }
      else if (u) {
        var a = new Uint32Array(1); crypto.getRandomValues(a);
        var code = String(1000 + a[0] % 9000);
        s.codes[phone] = { code: code, exp: now + CFG.codeTtlMin * 60000 };
        s.tg.unshift({ t: now, kind: 'code', name: u.name, phone: phone, code: code, ttl: CFG.codeTtlMin });
      } else {
        s.tg.unshift({ t: now, kind: 'unknown', phone: phone });   // код не создаётся; клиенту отвечаем так же, как для известного номера
      }
      save(s);
      return { ok: true };
    },
    verify: function (phone, code) {
      var s = srv(), now = Date.now(), st = lim(s, phone, now);
      if (st.b > now) return { ok: false, error: 'locked', until: st.b };
      var rec = s.codes[phone];
      if (rec && rec.exp > now && rec.code === code && !s.blocked[phone]) {
        delete s.codes[phone]; save(s);
        store(SESSK, { phone: phone, token: rid(), at: now });
        return { ok: true };
      }
      st.w.push(now);
      if (st.w.length >= CFG.wrongMax) { st.b = st.w[0] + CFG.windowH * 3600000; st.w = []; delete s.codes[phone]; save(s); return { ok: false, error: 'locked', until: st.b }; }   // код сгорает, вход закрыт до конца окна
      save(s);
      return { ok: false, error: 'wrong', left: CFG.wrongMax - st.w.length };
    },
    consent: function (phone) {
      if (APPC.consentDemo === false) return { ok: true, version: CONSENT_VERSION, required: false };
      var c = srv().consent[phone];
      return c && c.version === CONSENT_VERSION ? { ok: true, version: CONSENT_VERSION, required: true, at: new Date(c.at + 10800000).toISOString().replace('T', ' ').slice(0, 19) } : { ok: false, version: CONSENT_VERSION, required: true };
    },
    consentAccept: function (phone, version) {
      if (APPC.consentDemo === false) return { ok: true, consent: server.consent(phone) };
      if (version !== CONSENT_VERSION) return { ok: false, error: 'consent_version', version: CONSENT_VERSION };
      var s = srv(); if (!server.consent(phone).ok) { s.consent[phone] = { version: CONSENT_VERSION, at: Date.now() }; save(s); }
      return { ok: true, consent: server.consent(phone) };
    },
    me: function (phone) {
      var cs = server.consent(phone); if (!cs.ok) return { ok: true, consent: cs, today: M.today, fetchedAt: Date.now() };   // без согласия данные не отдаются
      var s = srv(), u = userByPhone(phone);
      return { consent: cs, user: u, periods: M.periods, shifts: M.shifts, cases: s.cases, advances: s.advances, incidents: s.incidents, promos: M.promos, jobs: M.jobs, applications: s.applications.filter(function (x) { return x.userId === u.id; }), today: M.today, fetchedAt: Date.now() };
    },
    submitExplanation: function (id, text, photos) {
      var s = srv(), c = s.cases.filter(function (x) { return x.id === id; })[0];
      if (!c || (c.kind !== 'brak' && c.kind !== 'error')) return { ok: false, error: 'not_found' };
      if (c.expl && c.expl.status !== 'waiting') return { ok: false, error: 'already' };
      text = String(text || '').trim();
      if (text.length < CFG.explMin) return { ok: false, error: 'text_short' };
      if (needPhotoOf(c) && !photos.length) return { ok: false, error: 'photo_required' };
      if (photos.length > CFG.maxPhotos) return { ok: false, error: 'too_many' };
      c.expl = { status: 'sent', text: text.slice(0, 1000), photos: photos, sentAt: new Date().toISOString() };
      save(s); return { ok: true };
    },
    submitIncident: function (p) {
      var s = srv(), i;
      if (p.rid && s.incidents.some(function (x) { return x.rid === p.rid; })) return { ok: true, duplicate: true };
      var e = incidentErrors(p, M.today); if (e.length) return { ok: false, error: e[0], errors: e };
      function pack(a) { return a.map(function (f) { return f.kind === 'pdf' ? { kind: 'pdf', name: f.name, size: f.size } : { kind: 'image', name: f.name, thumb: f.thumb, w: f.w, h: f.h, size: f.size }; }); }
      s.incidents.unshift({ id: 'i' + rid(), rid: p.rid || null, date: p.date, type: p.type, desc: p.desc.trim(), text: p.text.trim().slice(0, 1000), scene: pack(p.scene), damage: pack(p.damage), acts: pack(p.acts), status: 'review', sentAt: new Date().toISOString() });
      s.tg.unshift({ t: Date.now(), kind: 'incident', name: userByPhone(session().phone).name, type: p.type, date: p.date });
      save(s); return { ok: true };
    },
    resubmitIncident: function (id, text) {
      var s = srv(), i = s.incidents.filter(function (x) { return x.id === id; })[0];
      if (!i) return { ok: false, error: 'not_found' };
      if (i.status !== 'returned') return { ok: false, error: 'not_returned' };
      text = String(text || '').trim();
      if (text.length < CFG.explMin) return { ok: false, error: 'text_short' };
      if (text.length > CFG.explMax) return { ok: false, error: 'text_long' };
      i.addendum = (i.addendum ? i.addendum + '\n\n' : '') + '[' + dmy(M.today) + '] ' + text; i.status = 'review';
      s.tg.unshift({ t: Date.now(), kind: 'incident-add', name: userByPhone(session().phone).name, id: i.id });
      save(s); return { ok: true };
    },
    /* --- анонимная обратная связь: «сервер» НЕ знает, кто отправил (не читает сессию, телефон, токен) --- */
    anonChallenge: function () {
      var s = srv(), x = 2 + Math.floor(Math.random() * 8), y = 2 + Math.floor(Math.random() * 8), cid = 'c' + rid(), ids = Object.keys(s.anon.captchas);
      if (ids.length > 50) delete s.anon.captchas[ids[0]];
      s.anon.captchas[cid] = { ans: x + y, at: Date.now() }; save(s);
      return { ok: true, cid: cid, q: x + ' + ' + y };
    },
    anonSubmit: function (p) {
      var s = srv(), now = Date.now(), text = String(p.text || '').trim(), i;
      if (p.hp) return { ok: true };                                  // ловушка для ботов: «успех» без записи
      if (!ANON_TOPICS[p.topic]) return { ok: false, error: 'topic' };
      if (text.length < CFG.anonMin) return { ok: false, error: 'text_short' };
      if (text.length > CFG.anonMax) return { ok: false, error: 'text_long' };
      if (p.photo && (p.photo.kind !== 'image' || !p.photo.size || p.photo.size > CFG.anonPhotoMaxKB * 1024)) return { ok: false, error: 'bad_photo' };
      var cp = s.anon.captchas[p.cid];
      if (!cp) return { ok: false, error: 'captcha' };
      delete s.anon.captchas[p.cid];                                   // проверка одноразовая
      if (now - cp.at < CFG.anonMinSec * 1000) { save(s); return { ok: false, error: 'too_fast' }; }
      if (now - cp.at > 15 * 60000) { save(s); return { ok: false, error: 'captcha_expired' }; }
      if (String(p.ans).trim() !== String(cp.ans)) { save(s); return { ok: false, error: 'captcha' }; }
      s.anon.hour = s.anon.hour.filter(function (t) { return now - t < 3600000; });
      if (s.anon.hour.length >= CFG.anonHourGlobal) { save(s); return { ok: false, error: 'busy' }; }
      var h0 = text.toLowerCase().replace(/\s+/g, ' ');
      if (s.anon.items.some(function (x) { return x.topic === p.topic && x.text.toLowerCase().replace(/\s+/g, ' ') === h0; })) { save(s); return { ok: true, duplicate: true }; }
      s.anon.hour.push(now);
      var it = { id: 'f' + rid(), topic: p.topic, text: text, day: M.today };   // только день, без времени: нельзя сопоставить с моментом входа
      if (p.photo) it.photo = { w: p.photo.w, h: p.photo.h, size: p.photo.size, thumb: p.photo.thumb };
      s.anon.items.unshift(it);
      s.tg.unshift({ t: now, kind: 'feedback', topic: p.topic });
      save(s); return { ok: true };
    },
    applyJob: function (phone, p) {
      var s = srv(), u = userByPhone(phone), job = M.jobs.filter(function (j) { return j.id === p.jobId; })[0];
      if (!u || !job) return { ok: false, error: 'not_found' };
      if (job.status !== 'open') return { ok: false, error: 'closed' };
      if (s.applications.some(function (x) { return x.jobId === job.id && x.userId === u.id; })) return { ok: false, error: 'already' };
      var c = String(p.comment || '').trim(); if (c.length > CFG.jobCommentMax) return { ok: false, error: 'comment_long' };
      s.applications.unshift({ id: 'ap' + rid(), userId: u.id, userName: u.name, phone: u.phone, jobId: job.id, comment: c, sentAt: new Date().toISOString(), status: 'sent' });
      s.tg.unshift({ t: Date.now(), kind: 'application', name: u.name, job: job.title });
      save(s); return { ok: true };
    },
    _data: function () { var s = srv(); return { shifts: M.shifts, cases: s.cases, advances: s.advances, incidents: s.incidents, periods: M.periods }; },
    _advCheck: function (amount, exclId) {   // серверная перепроверка: дедлайн, шаг, лимит, резерв
      var d = server._data(), av = advInfo(d, calcAll(d), exclId);
      if (av.closed) return { ok: false, error: 'closed' };
      if (!(amount >= CFG.advMin) || amount % CFG.advStep) return { ok: false, error: 'bad_amount' };
      if (amount > av.available) return { ok: false, error: 'over_limit' };
      return { ok: true, av: av };
    },
    _pay: function (pay, prev) {   // проверка банка и карты; в демо хранится только банк и последние 4 цифры
      pay = pay || {}; var bank = bankOk(pay.bank), card = String(pay.card || '').replace(/\D/g, ''), any = !!String(pay.bank || '').trim() || !!card;
      var pb = prev && prev.bank || '', pl = prev && prev.last4 || '';
      if (!CFG.cardRequired && !any) return { ok: true, bank: pb, last4: pl };
      if (!bank && !pb) return { ok: false, error: 'bad_bank' };
      if (card ? !(card.length >= 16 && card.length <= 19 && luhnOk(card)) : !pl) return { ok: false, error: 'bad_card' };
      return { ok: true, bank: bank || pb, last4: card ? card.slice(-4) : pl };
    },
    createAdvance: function (amount, comment, pay) {
      var s = srv(), d = server._data(), av0 = advInfo(d, calcAll(d));
      if (av0.active) return { ok: false, error: 'active' };
      var c = server._advCheck(amount); if (!c.ok) return c;
      var pp = server._pay(pay); if (!pp.ok) return pp;
      s.advances.unshift({ id: 'a' + rid(), date: M.today, time: NOW.slice(11, 16), week: av0.w.wk, payDate: av0.w.pay, amount: amount, comment: String(comment || '').slice(0, CFG.commentMax), status: 'pending', answer: '', bank: pp.bank, last4: pp.last4 });
      save(s); return { ok: true };
    },
    updateAdvance: function (id, amount, comment, pay) {
      var s = srv(), a = s.advances.filter(function (x) { return x.id === id; })[0];
      if (!a || (a.status !== 'pending' && a.status !== 'approved')) return { ok: false, error: 'not_found' };
      var c = server._advCheck(amount, id); if (!c.ok) return c;
      var pp = server._pay(pay, a); if (!pp.ok) return pp;
      a.bank = pp.bank; a.last4 = pp.last4; a.amount = amount; a.comment = String(comment || '').slice(0, CFG.commentMax); a.status = 'pending'; a.answer = ''; save(s); return { ok: true };
    },
    cancelAdvance: function (id) {
      var s = srv(), a = s.advances.filter(function (x) { return x.id === id; })[0];
      if (!a || (a.status !== 'pending' && a.status !== 'approved')) return { ok: false, error: 'not_found' };
      if (weekInfo(NOW).closed) return { ok: false, error: 'closed' };
      a.status = 'cancelled'; save(s); return { ok: true };
    }
  };
  /* админские действия (в реальности — админ в таблице/боте) */
  var admin = {
    paid: function (id, n) {   // демо: админ изменил фактически выданную сумму (на сервере - adminAdvanceSetPaid, Telegram сотруднику не уходит)
      var s = srv(), a = s.advances.filter(function (x) { return x.id === id; })[0]; if (!a || a.status !== 'issued' || !(n > 0)) return;
      if (!(a.requested > 0)) a.requested = a.amount; a.amount = n;
      s.cases.forEach(function (c) { if (c.kind === 'advance' && c.advId === id) c.amount = n; }); save(s); refresh();
    },
    advance: function (id, st) {
      var s = srv(), a = s.advances.filter(function (x) { return x.id === id; })[0]; if (!a) return;
      a.status = st; a.decidedAt = new Date().toISOString();
      if (st === 'rejected') a.answer = 'Не согласовано: есть незакрытые случаи брака (демо).';
      if (st === 'issued') s.cases.push({ id: 'c' + rid(), periodId: M.periods[0].id, date: M.today, kind: 'advance', advId: a.id, title: 'Аванс (выдан ' + dm(a.payDate || M.today) + ')', amount: a.amount });
      save(s); refresh();
    },
    application: function (id, st) { var s = srv(); s.applications.forEach(function (x) { if (x.id === id) x.status = st; }); save(s); refresh(); },
    decideIncident: function (id, st, answer) { var s = srv(); s.incidents.forEach(function (i) { if (i.id === id) { i.status = st; i.answer = answer; } }); save(s); refresh(); },
    acceptIncident: function (id) { var s = srv(); s.incidents.forEach(function (i) { if (i.id === id) i.status = 'accepted'; }); save(s); refresh(); },
    returnExpl: function (id, reason) { var s = srv(); s.cases.forEach(function (c) { if (c.id === id && c.expl) c.expl = { status: 'waiting', returned: true, returnedReason: reason }; }); save(s); refresh(); },
    accept: function (id) { var s = srv(); s.cases.forEach(function (c) { if (c.id === id && c.expl) c.expl.status = 'accepted'; }); save(s); refresh(); },
    block: function () { var s = srv(), se = session(); if (se) { s.blocked[se.phone] = 1; save(s); } },
    unblockAll: function () { var s = srv(); s.blocked = {}; save(s); },
    unlock: function () { var s = srv(); s.locks = {}; s.attempts = {}; s.lastReq = {}; s.lim = {}; save(s); },   // демо: «Сбросить лимиты» из кабинета админа (окно 3 часа, блокировка, троттлинг)
    reset: function () { localStorage.removeItem(SK); localStorage.removeItem(CK); localStorage.removeItem('pr.drafts'); localStorage.removeItem('pr.idraft'); localStorage.removeItem('pr.card'); devRender(); refresh(); }
  };


  /* ---------- слой доступа к бэкенду: demo → эмуляция в localStorage; live → Apps Script Web App (config.js) ---------- */
  function blobB64(blob) {
    return new Promise(function (res, rej) { var fr = new FileReader(); fr.onload = function () { res(String(fr.result).replace(/^data:[^,]*,/, '')); }; fr.onerror = function () { rej(new Error('read')); }; fr.readAsDataURL(blob); });
  }
  function reqTimeout(size) {   // зависший запрос (слабая сеть, холодный старт Apps Script) не должен держать кнопки «Отправляется…» вечно
    var t = +APPC.requestTimeoutMs; if (t >= 1000 && t <= 300000) return t;
    return size > 300000 ? 120000 : 45000;   // с фото дольше
  }
  function post(url, body) {   // text/plain без заголовков → нет CORS-preflight; ни cookie, ни referrer
    var raw = JSON.stringify(body), ctl = typeof AbortController === 'function' ? new AbortController() : null, tm = ctl ? setTimeout(function () { ctl.abort(); }, reqTimeout(raw.length)) : null;
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: raw, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', redirect: 'follow', signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.json(); }).then(function (r) { return r && typeof r === 'object' ? r : { ok: false, error: 'server' }; }).catch(function () { return { ok: false, error: 'network' }; })
      .then(function (r) { if (tm) clearTimeout(tm); return r; });
  }
  /* ---------- геопозиция при запросе кода: ОБЯЗАТЕЛЬНА (только live; в демо не требуется). Без разрешения запрос кода не уходит. Координаты нигде не сохраняются: идут только в запрос кода ---------- */
  function geoGet() {
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
    timeout: 'Местоположение не определилось за 10 секунд. Выйдите на открытое место, включите GPS и повторите.', unsupported: 'Этот браузер не умеет определять местоположение. Откройте приложение в Chrome или Safari.'
  };
  function geoNeed(reason, onRetry) {   // инструкция и кнопка «Повторить» (общий вид для экрана номера)
    return h('div', { class: 'geoneed', role: 'alert', 'data-testid': 'geo-need' },
      h('b', { text: 'Нужно разрешить определение местоположения' }),
      h('p', { text: (GEO_WHY[reason] || GEO_WHY.denied) + ' Без этого код не запрашивается. Местоположение уходит только вместе с запросом кода и нигде не сохраняется.' }),
      h('ul', null,
        h('li', { text: 'iPhone: Настройки → Конфиденциальность и безопасность → Службы геолокации: включить, затем найти Safari (или «Мои выплаты») и выбрать «При использовании».' }),
        h('li', { text: 'Android: нажмите на значок замка слева от адреса → Разрешения → Местоположение → Разрешить. Для установленного приложения: Настройки → Приложения → Мои выплаты → Разрешения → Местоположение.' }),
        h('li', { text: 'Компьютер: значок замка слева от адреса → Местоположение → Разрешить.' })),
      h('button', { class: 'btn', type: 'button', 'data-testid': 'geo-retry', onclick: onRetry }, 'Повторить'));
  }
  /* ---------- автовыход: после LOGIN_HOUR_TO (22:00 МСК) приложение закрыто, утром вход заново по коду (только live; в демо времени нет) ---------- */
  var HRSK = 'pr.hours', autoT = null;
  function okHr(f, t) { return f === Math.floor(f) && t === Math.floor(t) && f >= 0 && f <= 23 && t >= 1 && t <= 24 && f < t; }
  function loginHrs() {   // часы из ответов сервера (приоритет), иначе из config.js (loginHours), иначе 6 и 22
    var st = load(HRSK, null), c = APPC.loginHours || {};
    if (st && okHr(+st.from, +st.to)) return { from: +st.from, to: +st.to, off: !!st.off };
    if (okHr(+c.from, +c.to)) return { from: +c.from, to: +c.to, off: false };
    return { from: 6, to: 22, off: false };
  }
  function rememberHours(o) { if (o && okHr(+o.from, +o.to)) store(HRSK, { from: +o.from, to: +o.to, off: !!o.off }); }
  function isLoginClosed(r) { return !!r && r.error === 'closed' && typeof r.from === 'number' && typeof r.to === 'number'; }   // у 'closed' про аванс/вакансию часов нет
  function closedNotice() { var hr = loginHrs(); return 'В ' + hr.to + ':00 приложение закрывается. Вход возможен с ' + hr.from + ':00 до ' + hr.to + ':00 по Москве.'; }
  function staleNotice() { return 'Приложение закрывается в ' + loginHrs().to + ':00, поэтому нужно войти заново.'; }
  function mskLastClose(hr) { var m = Date.now() + 10800000, d = new Date(m), c = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hr.to, 0, 0); if (c > m) c -= 86400000; return c - 10800000; }   // Москва = UTC+3, считаем от Date.now(), не от пояса устройства
  function tokenIat(se) { try { var p = JSON.parse(atob(String(se.token).split('.')[0].replace(/-/g, '+').replace(/_/g, '/'))); if (p && p.iat > 0) return +p.iat; } catch (e) { /* не наш формат */ } return +se.at || 0; }
  function clockState(se) {   // 'closed' (сейчас вне окна), 'stale' (сессия выдана до последнего закрытия) или null
    if (!LIVE || !se) return null;
    var hr = loginHrs(); if (hr.off) return null;
    var h = new Date(Date.now() + 10800000).getUTCHours();
    if (h < hr.from || h >= hr.to) return 'closed';
    var iat = tokenIat(se); return iat && iat < mskLastClose(hr) ? 'stale' : null;
  }
  function autoCheck() { var se = session(); if (!LIVE || !se) return; var k = clockState(se); if (k) logout(k === 'closed' ? closedNotice() : staleNotice()); }
  function armAuto() {   // точный таймер на ближайшее закрытие (плюс страховочный опрос ниже)
    clearTimeout(autoT); if (!LIVE || !session()) return;
    var hr = loginHrs(); if (hr.off) return;
    var m = Date.now() + 10800000, d = new Date(m), c = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hr.to, 0, 0); if (c <= m) c += 86400000;
    autoT = setTimeout(function () { autoCheck(); armAuto(); }, Math.min(c - m + 300, 2000000000));
  }
  if (LIVE) {
    setInterval(autoCheck, 30000);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') { autoCheck(); armAuto(); } });
    window.addEventListener('pageshow', function () { autoCheck(); armAuto(); });
  }
  function api(action, body) {
    var se = session(), b = { action: action }; for (var k in (body || {})) b[k] = body[k]; if (se && se.token) b.token = se.token;
    return post(APPC.backendUrl, b).then(function (r) {
      if (isLoginClosed(r) && session()) { rememberHours({ from: r.from, to: r.to, off: false }); logout(closedNotice()); return r; }   // сервер закрыт на ночь: сессия стирается, данные не показываем
      if (r && r.error === 'auth' && session()) { var ck = clockState(session()); logout(ck === 'closed' ? closedNotice() : ck === 'stale' ? staleNotice() : null); if (!ck) toast('Сессия закончилась — войдите снова', 'warn'); }
      if (r && r.error === 'blocked' && session()) onBlocked();
      if (r && r.error === 'consent' && session()) { openStack.slice().forEach(function (c) { c.close(true); }); S.consent = { ok: false, version: r.version, required: true }; S.data = null; S.calc = null; render(); }   // версия текста сменилась, пока приложение было открыто
      return r; });
  }
  function applyLive(d) {   // справочники и настройки из ответа сервера
    M.promos = d.promos || []; M.jobs = d.jobs || [];
    M.OPS.length = 0; Object.keys(OPI).forEach(function (k) { delete OPI[k]; }); (d.ops || []).forEach(function (o) { M.OPS.push(o); OPI[o.id] = o; });
    if (d.hours) { M.HOURS_SHIFT = d.hours; NORM_SHIFT_H = d.hours; }
    if (d.cfg) { var c = d.cfg; CFG.advWeekLimit = c.advWeekLimit; CFG.advShare = c.advShare; CFG.advStep = c.advStep; CFG.advMin = c.advMin; CFG.advDeadlineDow = c.advDeadlineDow; CFG.advDeadlineHour = c.advDeadlineHour; CFG.advPayDow = c.advPayDow; CFG.incidentReserve = c.incidentReserve; CFG.deductShare = c.deductShare; M.SHARE = c.payShare; CFG.cardRequired = c.cardRequired === true; }
  }
  function filesB64(a) { return Promise.all((a || []).map(function (f) { return blobB64(f.blob).then(function (b) { return { b64: b }; }); })); }
  var backend = LIVE ? {
    requestCode: function (phone) {
      return geoGet().then(function (g) {
        if (!g.ok) return { ok: false, error: 'geo', reason: g.reason };
        return post(APPC.backendUrl, { action: 'codeRequest', phone: phone, rid: rid(), lat: g.lat, lon: g.lon, accuracy: g.accuracy });
      });
    },
    verify: function (phone, code) { return post(APPC.backendUrl, { action: 'codeVerify', phone: phone, code: code }).then(function (r) { if (r.ok && r.token) { store(SESSK, { phone: phone, token: r.token, at: Date.now() }); if (r.loginHours) rememberHours(r.loginHours); } return r; }); },
    me: function () { return api('me').then(function (r) { if (!r.ok) throw new Error(r.error || 'fail'); if (r.loginHours) rememberHours(r.loginHours); if (r.consent && r.consent.ok === false) return r; r.user.phone = session().phone; if (r.loginHours) rememberHours(r.loginHours); applyLive(r); return r; }); },
    submitExplanation: function (id, text, photos) { return filesB64(photos).then(function (ph) { return api('explainSubmit', { caseId: id, text: text, photos: ph, rid: rid() }); }); },
    resubmitIncident: function (id, text) { return api('incidentResubmit', { id: id, text: text, rid: rid() }); },
    submitIncident: function (p) { return Promise.all([filesB64(p.scene), filesB64(p.damage), filesB64(p.acts)]).then(function (g) { return api('incidentSubmit', { date: p.date, type: p.type, desc: p.desc, text: p.text, scene: g[0], damage: g[1], acts: g[2], rid: p.rid }); }); },
    consentAccept: function (version) { return api('consentAccept', { agree: true, version: version }); },
    applyJob: function (jobId, comment) { return api('jobApply', { jobId: jobId, comment: comment, rid: rid() }); },
    createAdvance: function (amount, comment, pay) { return api('advanceCreate', { amount: amount, comment: comment, rid: rid(), bank: pay && pay.bank || '', card: pay && pay.card || '' }); },
    updateAdvance: function (id, amount, comment, pay) { return api('advanceUpdate', { id: id, amount: amount, comment: comment, bank: pay && pay.bank || '', card: pay && pay.card || '' }); },
    cancelAdvance: function (id) { return api('advanceCancel', { id: id }); },
    anonChallenge: function () { return post(APPC.feedbackUrl, { action: 'feedbackChallenge' }); },
    anonSubmit: function (body, blob) {   // отдельный деплой, БЕЗ токена; в теле только тема, текст, ответ, ловушка и (опционально) фото
      var b = { action: 'feedbackSubmit', topic: body.topic, text: body.text, cid: body.cid, ans: body.ans, hp: body.hp };
      return (blob ? blobB64(blob) : Promise.resolve(null)).then(function (x) { if (x) b.photo = { b64: x }; return post(APPC.feedbackUrl, b); });
    }
  } : {
    requestCode: function (phone) { return Promise.resolve(server.requestCode(phone)); },
    verify: function (phone, code) { return Promise.resolve(server.verify(phone, code)); },
    me: function () { var se = session(); return Promise.resolve(server.me(se.phone)); },
    submitExplanation: function (id, text, photos) { return Promise.resolve(server.submitExplanation(id, text, photos.map(function (p) { return { thumb: p.thumb, w: p.w, h: p.h, size: p.size }; }))); },
    resubmitIncident: function (id, text) { return Promise.resolve(server.resubmitIncident(id, text)); },
    submitIncident: function (p) { return Promise.resolve(server.submitIncident(p)); },
    consentAccept: function (version) { return Promise.resolve(server.consentAccept(session().phone, version)); },
    applyJob: function (jobId, comment) { return Promise.resolve(server.applyJob(session().phone, { jobId: jobId, comment: comment })); },
    createAdvance: function (amount, comment, pay) { return Promise.resolve(server.createAdvance(amount, comment, pay)); },
    updateAdvance: function (id, amount, comment, pay) { return Promise.resolve(server.updateAdvance(id, amount, comment, pay)); },
    cancelAdvance: function (id) { return Promise.resolve(server.cancelAdvance(id)); },
    anonChallenge: function () { return Promise.resolve(server.anonChallenge()); },
    anonSubmit: function (body) { return Promise.resolve(server.anonSubmit(body)); }
  };
  if (!LIVE) ['me', 'submitExplanation', 'resubmitIncident', 'submitIncident', 'applyJob', 'createAdvance', 'updateAdvance', 'cancelAdvance'].forEach(function (k) {   // демо: заблокированного не обслуживаем ни в одном действии (как live → 'blocked')
    var f = backend[k]; backend[k] = function () { var se = session(); if (se && srv().blocked[se.phone]) { onBlocked(); return k === 'me' ? Promise.reject(new Error('blocked')) : Promise.resolve({ ok: false, error: 'blocked' }); } return f.apply(null, arguments); };
  });

  /* ---------- расчёты по периодам (как в «Ведомости») ---------- */
  function calcAll(d) {
    var asc = d.periods.slice().sort(function (a, b) { return a.start < b.start ? -1 : 1; }), carry = 0, out = {};
    asc.forEach(function (p) {
      var sh = d.shifts.filter(function (s) { return !s.planned && s.date >= p.start && s.date <= p.end; });
      var cs = d.cases.filter(function (c) { return c.periodId === p.id; });
      var units = sum(sh, function (s) { return s.units; }), tariff = sum(sh, function (s) { return s.tsum; }), norm = sum(sh, function (s) { return s.norm; }), accrued = Math.round(tariff * M.SHARE);
      var by = {}; KINDS.forEach(function (k) { by[k] = sum(cs.filter(function (c) { return c.kind === k; }), function (c) { return c.amount; }); });
      var own = sum(cs, function (c) { return c.amount; }), total = own + carry, limit = Math.floor(accrued * CFG.deductShare);
      var withheld = Math.min(total, limit), carryOut = total - withheld;
      out[p.id] = { p: p, shifts: sh, cases: cs, units: units, norm: norm, tariff: tariff, accrued: accrued, by: by, own: own, carryIn: carry, total: total, limit: limit,
        withheld: withheld, carryOut: carryOut, payout: accrued - withheld, hours: sum(sh, function (s) { return s.hours; }),
        perf: meanPerf(sh) };
      var stm = d.statements && d.statements[p.id];   // боевой режим: деньги берём из «Ведомости» как есть, не пересчитываем
      if (stm) { var o = out[p.id]; o.perf = stm.perf || o.perf; o.accrued = stm.accrued; o.by = stm.by; o.own = sum(KINDS, function (k) { return stm.by[k] || 0; }); o.total = stm.total; o.limit = stm.limit; o.withheld = stm.withheld; o.carryOut = stm.carryOut; o.payout = stm.payout; carryOut = stm.carryOut; }
      carry = carryOut;
    });
    return out;
  }
  /* ---------- недельный аванс: все параметры — в CFG (настройки) ---------- */
  function limitWords() { var d = CFG.deductShare; return d === 0.5 ? 'половины' : Math.round(d * 100) + '%'; }
  function perfOf(x) { return x.norm ? x.units / x.norm * 100 : 0; }
  // «Произв-ть, %» в таблице = СРЕДНЕЕ процентов по сменам (не взвешенное по единицам): так считает «Ведомость» и «Нормативы по участкам»
  function meanPerf(shifts) { var a = shifts.filter(function (x) { return x.norm; }); return a.length ? sum(a, perfOf) / a.length : 0; }
  // подпись процента: целое; если округление перескочило бы порог 50/100/115 (99,7 → «100»), показываем десятые со знаком вниз, как в таблице («99,7%»)
  function pctS(p) { var r = Math.round(p); if ([50, 100, 115].some(function (t) { return (r >= t) !== (p >= t); })) return (Math.floor(p * 10) / 10).toFixed(1).replace('.', ','); return String(r); }
  var DOWG = ['воскресенья', 'понедельника', 'вторника', 'среды', 'четверга', 'пятницы', 'субботы'];
  var DOWA = ['в воскресенье', 'в понедельник', 'во вторник', 'в среду', 'в четверг', 'в пятницу', 'в субботу'];
  function hh(n) { return ('0' + n).slice(-2) + ':00'; }
  function dayFull(ds) { return dowOf(ds).toLowerCase() + ', ' + dlong(ds); }
  function weekInfo(nowStr) {
    var today = nowStr.slice(0, 10), wk = M.monday(today), dl = M.addDays(wk, CFG.advDeadlineDow - 1), nx = M.addDays(wk, 7);
    return { wk: wk, wkEnd: M.addDays(wk, 6), deadline: dl, deadlineAt: dl + 'T' + hh(CFG.advDeadlineHour), pay: M.addDays(wk, CFG.advPayDow - 1),
      closed: nowStr >= dl + 'T' + hh(CFG.advDeadlineHour), nextWk: nx, nextDeadline: M.addDays(nx, CFG.advDeadlineDow - 1), nextPay: M.addDays(nx, CFG.advPayDow - 1) };
  }
  function advInfo(d, calc, exclId) {
    var w = weekInfo(NOW), cur = calc[M.periods[0].id];
    var wkShifts = d.shifts.filter(function (x) { return !x.planned && x.date >= w.wk && x.date <= w.wkEnd; });
    var earned = Math.round(sum(wkShifts, function (x) { return x.tsum; }) * M.SHARE), earnCap = Math.floor(earned * CFG.advShare);
    var mine = d.advances.filter(function (a) { return a.week === w.wk && a.id !== exclId && (a.status === 'pending' || a.status === 'approved' || a.status === 'issued'); });
    var ordered = sum(mine, function (a) { return a.amount; });
    var openCases = d.cases.filter(function (c) { return c.expl && (c.expl.status === 'waiting' || c.expl.status === 'sent'); });
    var openInc = (d.incidents || []).filter(function (i) { return i.status === 'review'; });
    var risk = sum(openCases, function (c) { return c.amount; }) + openInc.length * CFG.incidentReserve, riskN = openCases.length + openInc.length;
    var carry = d.advCarry != null ? d.advCarry : (cur ? cur.carryIn : 0);
    var capLimit = CFG.advWeekLimit - ordered, capEarn = earnCap - risk - carry - ordered;
    var raw = Math.min(capLimit, capEarn), avail = Math.max(0, Math.floor(raw / CFG.advStep) * CFG.advStep);
    var active = d.advances.filter(function (a) { return a.week === w.wk && (a.status === 'pending' || a.status === 'approved'); })[0];
    return { w: w, earned: earned, earnCap: earnCap, ordered: ordered, risk: risk, riskN: riskN, carry: carry, limit: CFG.advWeekLimit, capLimit: capLimit, capEarn: capEarn, raw: raw,
      available: avail, active: active, shiftsN: wkShifts.length, binding: capLimit <= capEarn ? 'limit' : 'earn', closed: w.closed };
  }

  /* ---------- состояние клиента ---------- */
  var S = { consent: null, data: null, calc: null, stale: false, periodId: M.periods[0].id, calMonth: M.today.slice(0, 7), calSel: null, dedFilter: 'all', perfAll: false, route: 'home', lastRoute: null };
  var session = function () { return load(SESSK, null); };
  var root = $('#view-root'), tabbar = $('#tabbar'), overlayRoot = $('#overlay-root'), toasts = $('#toasts');

  function setTheme(pref) {
    store('pr.theme', pref);
    var dark = matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', pref === 'auto' ? (dark ? 'dark' : 'light') : pref);
  }
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { setTheme(load('pr.theme', 'auto')); });

  function toast(msg, tone) {
    var t = h('div', { class: 'toast ' + (tone || 'ok'), role: tone === 'bad' ? 'alert' : null }, ico(tone === 'bad' ? 'alert' : tone === 'warn' ? 'info' : 'check'), h('span', { text: msg }));
    toasts.appendChild(t);
    setTimeout(function () { t.remove(); }, 3800);
  }

  /* ---------- API-обёртка: онлайн → «сервер» + обновление кэша; офлайн → кэш ---------- */
  function fetchMe() {
    var se = session(); if (!se) return Promise.reject(new Error('noauth'));
    function fromCache() { var c = load(CK, null); if (c && c.phone === se.phone) { if (LIVE) applyLive(c.data); return { data: c.data, stale: true }; } throw new Error('offline'); }
    return delay(LAT).then(function () {
      if (navigator.onLine === false) return fromCache();
      return backend.me().then(function (d) { if (!(d.consent && d.consent.ok === false)) store(CK, { phone: se.phone, data: d }); return { data: d, stale: false }; }, function (e) { if (LIVE && e.message !== 'auth' && e.message !== 'blocked' && e.message !== 'closed') return fromCache(); throw e; });
    });
  }
  function applyMe(r) {   // без согласия на текущую версию данные не рисуем: только экран согласия
    var c = r.data && r.data.consent;
    if (c && c.ok === false) { try { localStorage.removeItem(CK); } catch (e) { /* ignore */ } S.consent = c; S.data = null; S.calc = null; S.stale = false; return; }   // сохранённая копия данных тоже стирается
    S.consent = null; S.data = r.data; S.stale = r.stale; S.calc = calcAll(r.data);
  }
  function refresh() {
    if (!session()) return Promise.resolve();
    return fetchMe().then(function (r) { applyMe(r); render(); }, function () { render(); });
  }
  function requireOnline() { if (navigator.onLine === false) { toast('Нет сети. Это действие доступно только онлайн.', 'warn'); return false; } return true; }

  /* ---------- оверлеи ---------- */
  var openStack = [];
  function openSheet(o) {
    var opener = document.activeElement, id = 'sh' + rid();
    var title = h('h2', { id: id, tabindex: '-1', text: o.title });
    var closeBtn = h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Закрыть', 'data-testid': 'sheet-close', onclick: function () { ctl.close(); } }, ico('x'));
    var sheet = h('div', { class: 'sheet', role: o.alert ? 'alertdialog' : 'dialog', 'aria-modal': 'true', 'aria-labelledby': id },
      h('div', { class: 'grab' }), h('div', { class: 'sh' }, title, o.dialog ? null : closeBtn), h('div', { class: 'sb' }, o.body), o.footer ? h('div', { class: 'sf' }, o.footer) : null);
    var ov = h('div', { class: 'ov' + (o.dialog ? ' dlg' : '') }, h('div', { class: 'bd', onclick: function () { ctl.close(); } }), sheet);
    function onKey(e) {
      if (openStack[openStack.length - 1] !== ctl) return;
      if (e.key === 'Escape') { e.preventDefault(); ctl.close(); }
      if (e.key === 'Tab') {
        var f = [].slice.call(sheet.querySelectorAll('button:not([disabled]),input:not([type=file]),textarea,[tabindex="0"]')).filter(function (x) { return x.offsetParent !== null; });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === title)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    var ctl = {
      el: sheet,
      close: function (silent) {
        if (!ov.parentNode) return;
        ov.remove(); document.removeEventListener('keydown', onKey); openStack.splice(openStack.indexOf(ctl), 1);
        if (!openStack.length) { $('#app').removeAttribute('inert'); document.body.classList.remove('has-ov'); }
        if (o.onClose && !silent) o.onClose();
        if (opener && opener.isConnected) opener.focus();
      }
    };
    openStack.push(ctl); document.body.classList.add('has-ov'); overlayRoot.appendChild(ov); $('#app').setAttribute('inert', ''); document.addEventListener('keydown', onKey);
    setTimeout(function () { (o.focus ? o.focus() : title.focus()); }, 30);
    return ctl;
  }
  function confirmDlg(o) {
    return new Promise(function (res) {
      var done = false, ctl;
      function fin(v) { if (done) return; done = true; ctl.close(true); res(v); }
      ctl = openSheet({ title: o.title, dialog: true, alert: true, onClose: function () { fin(false); },
        body: h('div', { class: 'gap12' }, o.body),
        footer: h('div', { class: 'btnrow' }, h('button', { class: 'btn ghost', type: 'button', 'data-testid': 'confirm-no', onclick: function () { fin(false); } }, o.no || 'Отмена'),
          h('button', { class: 'btn' + (o.danger ? ' danger' : ''), type: 'button', 'data-testid': 'confirm-yes', onclick: function () { fin(true); } }, o.yes || 'Да')) });
    });
  }

  /* ---------- общие блоки ---------- */
  function skeleton(kind) {
    var w = h('div', { class: 'stack', 'aria-busy': 'true', 'aria-label': 'Загрузка данных', role: 'status', 'data-testid': 'skeleton' });
    w.appendChild(h('div', { class: 'sk h1' }));
    if (kind === 'home') w.appendChild(h('div', { class: 'sk hero' }));
    w.appendChild(h('div', { class: 'sk c' })); w.appendChild(h('div', { class: 'sk c' }));
    w.appendChild(h('div', { class: 'card' }, h('div', { class: 'sk l' })));
    return w;
  }
  function periodBtn() {
    var p = S.calc[S.periodId].p;
    return h('button', { class: 'periodbtn', type: 'button', 'data-testid': 'period-btn', 'aria-haspopup': 'dialog', onclick: openPeriods },
      h('span', { class: 'dot' + (p.status === 'paid' ? ' paid' : ''), 'aria-hidden': 'true' }), h('span', { class: 'num', text: periodLabel(p) }), ico('cd', 'sm'));
  }
  function openPeriods() {
    var ctl, list = h('div', { role: 'radiogroup', 'aria-label': 'Расчётный период', class: 'gap8' });
    M.periods.forEach(function (p) {
      var sel = p.id === S.periodId;
      list.appendChild(h('button', { class: 'popt', type: 'button', role: 'radio', 'aria-checked': sel ? 'true' : 'false', 'data-period': p.id,
        onclick: function () { S.periodId = p.id; ctl.close(true); render(); } },
        h('div', { class: 'grow' }, h('b', { class: 'num', text: periodLabel(p) }), h('small', { text: p.status === 'open' ? 'Текущий · выплата ' + dms(p.payDate) : p.status === 'closed' ? 'Закрыт · выплата ' + dms(p.payDate) : 'Выплачено ' + dms(p.payDate) })),
        sel ? ico('check') : null));
    });
    ctl = openSheet({ title: 'Расчётный период', body: list });
  }
  function offlineBanner() {
    var b = $('#offline');
    if (S.stale || navigator.onLine === false) {
      b.hidden = false; clear(b); b.appendChild(ico('wifioff', 'sm'));
      b.appendChild(h('span', { text: (navigator.onLine === false ? 'Нет сети' : 'Нет связи с сервером') + ' — показаны сохранённые данные' + (S.data ? ' на ' + stamp(S.data.fetchedAt) : '') }));
    } else b.hidden = true;
  }
  function explReturnedCount() { return S.data ? S.data.cases.filter(function (c) { return c.expl && c.expl.status === 'waiting' && c.expl.returned; }).length : 0; }
  function waitingCount() { return S.data ? S.data.cases.filter(function (c) { return c.expl && c.expl.status === 'waiting'; }).length : 0; }
  function returnedCount() { return S.data ? (S.data.incidents || []).filter(function (i) { return i.status === 'returned'; }).length : 0; }
  var TABS = [['home', 'Главная', 'home'], ['cal', 'Календарь', 'cal'], ['ops', 'Операции', 'box'], ['ded', 'Вычеты', 'ded'], ['adv', 'Аванс', 'wallet'], ['me', 'Профиль', 'user']];
  function renderTabs() {
    clear(tabbar);
    TABS.forEach(function (t) {
      var n = t[0] === 'ded' ? waitingCount() + returnedCount() : 0, wn = t[0] === 'ded' ? waitingCount() : 0, rn = t[0] === 'ded' ? returnedCount() : 0;
      tabbar.appendChild(h('a', { class: 'tab', href: '#/' + t[0], 'aria-current': (S.route === t[0] || (t[0] === 'home' && (S.route === 'promo' || S.route === 'jobs')) || (t[0] === 'me' && S.route === 'mydata')) ? 'page' : null, 'data-tab': t[0], 'aria-label': t[1] + (wn ? ', ждут объяснения: ' + wn : '') + (rn ? ', возвращено на доработку: ' + rn : '') },
        ico(t[2]), h('span', { text: t[1] }), n ? h('span', { class: 'cnt', 'aria-hidden': 'true', text: String(n) }) : null));
    });
  }
  function emptyState(ic, t, sub) { return h('div', { class: 'empty', 'data-testid': 'empty' }, h('div', { class: 'eic' }, ico(ic, 'lg')), h('b', { text: t }), h('p', { text: sub })); }
  function pageTop(t, sub) { return h('div', { class: 'top' }, h('div', null, h('h1', { text: t }), sub ? h('p', { class: 'sub', text: sub }) : null)); }

  /* ---------- вход ---------- */
  var L = { step: 'phone', phone: '', timer: null, readyAt: 0 };
  /* ---------- «Доступ закрыт»: бригадир заблокировал номер (ответ сервера 'blocked' на уже вошедшем) ---------- */
  function onBlocked() {
    localStorage.removeItem(SESSK); localStorage.removeItem(CK); localStorage.removeItem('pr.drafts'); localStorage.removeItem('pr.idraft'); localStorage.removeItem('pr.card'); localStorage.removeItem('pr.iadd');   // сессия и сохранённые данные стираются
    openStack.slice().forEach(function (c) { c.close(true); });
    S.data = null; S.calc = null; S.stale = false; S.consent = null; S.blocked = true; clearInterval(L.timer); L = { step: 'phone', phone: '', timer: null, readyAt: 0 };
    if (location.hash !== '#/login') location.hash = '#/login';
    renderBlocked();
  }
  function renderBlocked() {
    tabbar.hidden = true; $('#offline').hidden = true; clear(root); clearInterval(L.timer);
    document.title = 'Доступ закрыт · Мои выплаты';
    var v = h('main', { class: 'login blocked', id: 'main', 'data-testid': 'blocked-screen' }); root.appendChild(v);
    v.appendChild(h('div', { class: 'brand' }, h('div', { class: 'logo' }, ico('lock', 'lg')), h('div', null, h('b', { text: 'Персональное Решение' }), h('span', { text: 'Кабинет исполнителя' }))));
    v.appendChild(h('div', { class: 'lockbox', role: 'alert', 'data-testid': 'blockbox' }, ico('lock', 'lg'), h('h1', { text: 'Доступ закрыт' }), h('p', { text: 'Обратитесь к бригадиру.' })));
    v.appendChild(h('p', { class: 'blocked-note', text: 'Сохранённые на этом телефоне данные удалены.' }));
    v.appendChild(h('p', { class: 'foot', text: LIVE ? 'Данные видны только вам' : 'Демо-прототип · все данные вымышлены' }));
    devRender();
  }
  function renderLogin() {
    if (S.blocked) return renderBlocked();
    tabbar.hidden = true; $('#offline').hidden = true; clear(root); clearInterval(L.timer);
    var v = h('main', { class: 'login', id: 'main' }); root.appendChild(v);
    var lu = L.phone ? (LIVE ? (L.lockUntil || 0) : Math.max(L.lockUntil || 0, ((srv().lim || {})[L.phone] || {}).b || 0)) : 0;
    if (L.step === 'code' && lu > Date.now()) { loginLocked(v, lu); devRender(); return; }
    v.appendChild(h('div', { class: 'brand' }, h('div', { class: 'logo' }, ico('star', 'lg')), h('div', null, h('b', { text: 'Персональное Решение' }), h('span', { text: 'Кабинет исполнителя · СК Северная Звезда' }))));
    if (L.step === 'phone') loginPhone(v); else loginCode(v);
    v.appendChild(h('p', { class: 'foot', text: LIVE ? 'Данные видны только вам' : 'Демо-прототип · все данные вымышлены' }));
    devRender();
  }
  function mskWhen(ms) {   // время по Москве: «17:10» или «05.10 в 02:40», если это не сегодня
    var d = new Date(ms + 10800000), n = new Date(Date.now() + 10800000), hm = ('0' + d.getUTCHours()).slice(-2) + ':' + ('0' + d.getUTCMinutes()).slice(-2);
    return d.toISOString().slice(0, 10) === n.toISOString().slice(0, 10) ? hm : ('0' + d.getUTCDate()).slice(-2) + '.' + ('0' + (d.getUTCMonth() + 1)).slice(-2) + ' в ' + hm;
  }
  function reqLimitMsg(until) { return 'Лимит запросов кода исчерпан, обратитесь к администратору. Новый код можно будет запросить после ' + mskWhen(until) + ' (МСК).'; }
  function closedMsg(r) { return 'Вход возможен только с ' + (r && r.from >= 0 ? r.from : 6) + ':00 до ' + (r && r.to > 0 ? r.to : 22) + ':00 по Москве. Попробуйте позже.'; }   // часы входа задаёт сервер (6–22 МСК по умолчанию)
  function loginPhone(v) {
    var inp, btn, err = h('div', { class: 'err', id: 'ph-err', role: 'alert', hidden: true, 'data-testid': 'ph-err' });
    if (L.notice) { err.textContent = L.notice; err.hidden = false; }   // сообщение живёт, пока пользователь не начнёт вводить номер (экран могут перерисовать)
    function digits() { return inp.value.replace(/\D/g, '').replace(/^[78](?=\d{10})/, '').slice(0, 10); }
    function fmt(d) { var o = d.slice(0, 3); if (d.length > 3) o += ' ' + d.slice(3, 6); if (d.length > 6) o += '-' + d.slice(6, 8); if (d.length > 8) o += '-' + d.slice(8, 10); return o; }
    inp = h('input', { type: 'tel', inputmode: 'tel', autocomplete: 'tel-national', id: 'phone', 'data-testid': 'phone', placeholder: '900 000-00-00', 'aria-describedby': 'ph-err ph-help',
      oninput: function () { L.notice = ''; var d = digits(); inp.value = fmt(d); btn.disabled = d.length !== 10; err.hidden = true; inp.parentNode.classList.remove('invalid'); } });
    inp.value = fmt(L.phone.replace(/^7/, ''));
    btn = h('button', { class: 'btn', type: 'submit', 'data-testid': 'req-code' }, ico('send', 'sm'), 'Запросить код');
    btn.disabled = digits().length !== 10;
    var form = h('form', { class: 'gap16', novalidate: true, onsubmit: function (e) { e.preventDefault(); doReq(); } },
      h('div', { class: 'field' }, h('label', { class: 'l', for: 'phone', text: 'Номер телефона' }), h('div', { class: 'phone' }, h('span', { class: 'pre', 'aria-hidden': 'true', text: '+7' }), inp), err, h('p', { class: 'help', id: 'ph-help', text: 'Тот номер, который вы сообщили бригадиру при оформлении.' })), L.geoErr ? geoNeed(L.geoErr, function () { doReq(true); }) : null, btn);
    function doReq(retry) {
      var d = digits(); if (d.length !== 10 || (btn.disabled && !retry)) return; L.notice = ''; L.reqUntil = 0;
      if (navigator.onLine === false) { err.textContent = 'Нет сети. Подключитесь к интернету и повторите.'; err.hidden = false; return; }
      btn.disabled = true; clear(btn); btn.appendChild(h('span', { class: 'spinner' })); btn.appendChild(document.createTextNode(LIVE ? ' Определяем местоположение…' : ' Отправляем…'));
      var phone = '7' + d;
      delay(LAT).then(function () { return backend.requestCode(phone); }).then(function (r) {
        if (r.error === 'geo' || r.error === 'bad_geo') { L.phone = phone; L.step = 'phone'; L.geoErr = r.reason || 'unavailable'; return renderLogin(); }   // без геопозиции код не запрашивается: показываем инструкцию и «Повторить»
        L.geoErr = '';
        if (r.error === 'network' || r.error === 'server' || r.error === 'bad_phone') { toast(r.error === 'bad_phone' ? 'Проверьте номер телефона' : 'Нет связи с сервером. Повторите позже.', 'bad'); return renderLogin(); }
        if (r.closed) { L.phone = phone; L.step = 'phone'; L.notice = closedMsg(r); return renderLogin(); }   // вне часов входа: остаёмся на вводе номера, код не запрашивался, таймера нет
        if (r.error === 'req_limit') { L.phone = phone; L.step = 'phone'; L.lockUntil = 0; L.notice = reqLimitMsg(r.until); return renderLogin(); }   // остаёмся на вводе номера с понятным сообщением
        L.lockUntil = r.error === 'locked' ? r.until : 0;
        L.phone = phone; L.step = 'code'; L.readyAt = Date.now() + (r.throttled ? r.wait * 1000 : CFG.resendSec * 1000); renderLogin();
      });
    }
    v.appendChild(h('h1', { text: 'Вход для исполнителей' }));
    v.appendChild(h('p', { class: 'lead', text: 'Доступ только по личному коду, который приходит вам в Telegram.' }));
    v.appendChild(form);
    v.appendChild(h('div', { class: 'steps' },
      h('div', { class: 'stepi' }, h('i', { text: '1' }), h('span', { text: 'Введите номер телефона, нажмите «Запросить код» и разрешите определение местоположения: без него код не выдаётся.' })),
      h('div', { class: 'stepi' }, h('i', { text: '2' }), h('span', { text: 'Код придёт вам лично в Telegram от бота ' + BOT_NAME + '. Впервые? Откройте бота, нажмите «Старт» и «Поделиться номером».' })),
      h('div', { class: 'stepi' }, h('i', { text: '3' }), h('span', { text: 'Введите 4 цифры — увидите только свои данные.' }))));
    setTimeout(function () { inp.focus(); }, 50);
  }
  function loginCode(v) {
    var boxes = [], otp = h('div', { class: 'otp', role: 'group', 'aria-label': 'Код из 4 цифр', 'data-testid': 'otp' }), err = h('div', { class: 'err', id: 'code-err', role: 'alert', hidden: true, 'data-testid': 'code-err' }), busy = false;
    var resend = h('button', { class: 'link', type: 'button', 'data-testid': 'resend' });
    var go = h('button', { class: 'btn', type: 'button', 'data-testid': 'login-btn', disabled: true }, 'Войти');
    function val() { return boxes.map(function (b) { return b.value; }).join(''); }
    function showErr(t) { err.hidden = false; clear(err); err.appendChild(ico('alert', 'sm')); err.appendChild(document.createTextNode(t)); }
    function submit() {
      var c = val(); if (c.length !== 4 || busy) return; busy = true;
      if (navigator.onLine === false) { busy = false; showErr('Нет сети. Подключитесь к интернету и повторите.'); return; }
      go.disabled = true; clear(go); go.appendChild(h('span', { class: 'spinner' })); go.appendChild(document.createTextNode(' Проверяем…'));
      delay(LAT).then(function () { return backend.verify(L.phone, c); }).then(function (r) {
        busy = false;
        if (r.ok) { clearInterval(L.timer); location.hash = '#/home'; boot(); return; }
        if (r.error === 'closed') { clear(go); go.appendChild(document.createTextNode('Войти')); go.disabled = false; showErr(closedMsg(r)); return; }   // не неверная попытка: поля не очищаем
        if (r.error === 'locked') { L.lockUntil = r.until; return renderLogin(); }
        if (r.error === 'network' || r.error === 'server') { clear(go); go.appendChild(document.createTextNode('Войти')); go.disabled = false; showErr('Нет связи с сервером. Повторите.'); return; }
        boxes.forEach(function (b) { b.value = ''; b.setAttribute('aria-invalid', 'true'); });
        otp.classList.remove('bad'); void otp.offsetWidth; otp.classList.add('bad');
        clear(go); go.appendChild(document.createTextNode('Войти')); go.disabled = true;
        showErr('Неверный код. Осталось ' + r.left + ' ' + plural(r.left, ['попытка', 'попытки', 'попыток']) + (r.left === 1 ? '. После ещё одной ошибки вход закроется на ' + CFG.windowH + ' часа.' : '.'));
        boxes[0].focus();
      });
    }
    for (var i = 0; i < 4; i++) (function (i) {
      var b = h('input', { type: 'text', inputmode: 'numeric', pattern: '[0-9]*', maxlength: '1', autocomplete: i === 0 ? 'one-time-code' : 'off', 'aria-label': 'Цифра ' + (i + 1) + ' из 4', 'aria-describedby': 'code-err', 'data-testid': 'otp-' + i,
        oninput: function () {
          b.value = b.value.replace(/\D/g, '').slice(-1); err.hidden = true; boxes.forEach(function (x) { x.removeAttribute('aria-invalid'); });
          if (b.value && i < 3) boxes[i + 1].focus(); go.disabled = val().length !== 4; if (val().length === 4) submit();
        },
        onkeydown: function (e) { if (e.key === 'Backspace' && !b.value && i > 0) { boxes[i - 1].focus(); boxes[i - 1].value = ''; } },
        onpaste: function (e) { var t = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 4); if (!t) return; e.preventDefault(); t.split('').forEach(function (ch, k) { boxes[k].value = ch; }); go.disabled = t.length !== 4; boxes[Math.min(t.length, 3)].focus(); if (t.length === 4) submit(); } });
      boxes.push(b); otp.appendChild(b);
    })(i);
    go.addEventListener('click', submit);
    function tick() {
      var left = Math.ceil((L.readyAt - Date.now()) / 1000);
      var limOn = (L.reqUntil || 0) > Date.now();
      resend.disabled = left > 0 || limOn; resend.textContent = limOn ? 'Лимит запросов кода исчерпан' : left > 0 ? 'Запросить код ещё раз (' + left + ' с)' : 'Запросить код ещё раз';
    }
    resend.addEventListener('click', function () {
      backend.requestCode(L.phone).then(function (r) {
        if (r.error === 'geo' || r.error === 'bad_geo') { clearInterval(L.timer); L.step = 'phone'; L.geoErr = r.reason || 'unavailable'; return renderLogin(); }
        if (r.closed) { clearInterval(L.timer); L.step = 'phone'; L.notice = closedMsg(r); return renderLogin(); }
        if (r.error === 'locked') { L.lockUntil = r.until; return renderLogin(); }
        if (r.error === 'req_limit') { L.reqUntil = r.until; showErr(reqLimitMsg(r.until)); tick(); return; }   // вводить уже выданный код можно, новый не запросить
        if (r.error === 'network' || r.error === 'server') { toast('Нет связи с сервером. Повторите позже.', 'bad'); return; }
        L.readyAt = Date.now() + (r.throttled ? r.wait * 1000 : CFG.resendSec * 1000); tick(); toast('Код запрошен повторно — проверьте Telegram'); boxes.forEach(function (b) { b.value = ''; }); boxes[0].focus();
      });
    });
    tick(); L.timer = setInterval(function () { if (!resend.isConnected) return clearInterval(L.timer); tick(); }, 1000);
    v.appendChild(h('h1', { text: 'Введите код' }));
    // подсказка одинакова для любого номера (не раскрываем, есть ли он в CRM и привязан ли Telegram)
    v.appendChild(h('div', { class: 'waitbox', 'data-testid': 'wait-admin', role: 'status' }, ico('send'), h('div', null, h('b', { text: 'Проверьте Telegram' }),
      h('span', { 'data-testid': 'tg-hint', text: 'Код придёт вам в Telegram. Если вы ещё не запускали бота, откройте ' + BOT_NAME + ' (кнопка со ссылкой ' + BOT_URL + '), нажмите «Старт» и «Поделиться номером», затем запросите код снова. Пока бот не подключён, код получит администратор и передаст его вам лично. Код действует ' + CFG.codeTtlMin + ' минут.' }),
      h('a', { class: 'btn ghost botlink', href: BOT_URL, target: '_blank', rel: 'noopener noreferrer', 'data-testid': 'tg-bot-link' }, ico('send', 'sm'), 'Открыть ' + BOT_NAME + ' в Telegram'))));
    v.appendChild(h('div', { class: 'gap16' }, h('div', { class: 'gap12' }, otp, err), go,
      h('div', { class: 'row between' }, resend, h('button', { class: 'link', type: 'button', 'data-testid': 'change-phone', onclick: function () { L.step = 'phone'; L.reqUntil = 0; renderLogin(); } }, 'Изменить номер'))));
    v.appendChild(h('p', { class: 'foot', 'data-testid': 'limits-note', text: 'За ' + CFG.windowH + ' часа можно запросить код не более ' + CFG.reqMax + ' раз и ошибиться не более ' + CFG.wrongMax + ' раз. После двух ошибок вход закрывается на ' + CFG.windowH + ' часа.' }));
    setTimeout(function () { boxes[0].focus(); }, 50);
  }
  function loginLocked(v, until) {
    var t = h('div', { class: 't num', 'data-testid': 'lock-timer' });
    function tick() { var s = Math.max(0, Math.ceil((until - Date.now()) / 1000)); t.textContent = ('0' + Math.floor(s / 3600)).slice(-2) + ':' + ('0' + Math.floor(s % 3600 / 60)).slice(-2) + ':' + ('0' + s % 60).slice(-2); if (s <= 0) { clearInterval(L.timer); L.step = 'phone'; renderLogin(); } }
    v.appendChild(h('div', { class: 'brand' }, h('div', { class: 'logo' }, ico('lock', 'lg')), h('div', null, h('b', { text: 'Вход временно закрыт' }), h('span', { text: 'Слишком много неверных кодов' }))));
    v.appendChild(h('div', { class: 'lockbox', role: 'alert', 'data-testid': 'lockbox' }, ico('lock', 'lg'), h('p', { 'data-testid': 'lock-until', text: 'Вход закрыт до ' + mskWhen(until) + ' по Москве. Повторить попытку можно через' }), t, h('p', { text: 'Когда блокировка закончится, запросите новый код: он придёт в Telegram. Нужен доступ раньше? Обратитесь к администратору: он может снять ограничение.' })));
    v.appendChild(h('div', { class: 'gap12 lockbtn' }, h('button', { class: 'btn ghost', type: 'button', onclick: function () { clearInterval(L.timer); L.step = 'phone'; renderLogin(); } }, 'Вернуться к вводу номера')));
    tick(); L.timer = setInterval(tick, 1000);
  }

  /* ---------- главная ---------- */
  function perfChart(shifts) {
    var W = 320, H = 112, top = 8, bot = 18, n = shifts.length, max = 140, bw = Math.min(22, (W - 40) / n - 4), gap = n > 1 ? (W - 36 - bw * n) / (n - 1) : 0;
    var ns = 'http://www.w3.org/2000/svg', s = document.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', '0 0 ' + W + ' ' + H); s.setAttribute('class', 'trend'); s.setAttribute('role', 'img'); s.setAttribute('data-testid', 'trend');
    s.setAttribute('aria-label', 'График производительности по сменам: ' + shifts.map(function (x) { return dm(x.date) + ' — ' + pctS(perfOf(x)) + '%'; }).join(', '));
    function el(t, a, txt) { var e = document.createElementNS(ns, t); for (var k in a) e.setAttribute(k, a[k]); if (txt) e.textContent = txt; s.appendChild(e); return e; }
    var y100 = top + (H - top - bot) * (1 - 100 / max);
    el('line', { x1: 32, x2: W, y1: y100, y2: y100, class: 'norm' }); el('text', { x: 28, y: y100 + 3, class: 'nl' }, '100%');
    shifts.forEach(function (x, i) {
      var p = perfOf(x), bh = Math.max(3, (H - top - bot) * Math.min(p, max) / max), bx = 36 + i * (bw + gap);
      el('rect', { x: bx, y: H - bot - bh, width: bw, height: bh, rx: 4, class: 'bar ' + pctClass(p) });
      el('text', { x: bx + bw / 2, y: H - 5 }, String(+x.date.slice(8)));
    });
    return s;
  }
  function shiftRow(s) {
    var p = perfOf(s);
    return h('div', { class: 'srow' }, h('div', { class: 'sico ' + s.type }, ico(s.type === 'day' ? 'sun' : 'moon', 'sm')),
      h('div', { class: 'd' }, dlong(s.date) + ', ' + dowOf(s.date).slice(0, 2).toLowerCase(), h('small', { text: (s.type === 'day' ? 'Дневная' : 'Ночная') + ' · ' + s.hours + ' ч · ' + num(s.units) + ' ед.' })),
      h('div', { class: 'pct ' + pctClass(p), text: pctS(p) + '%' }));
  }
  function applyWidths(v) { // CSP запрещает inline style — размеры задаём через CSSOM
    v.querySelectorAll('.stackbar i[data-w]').forEach(function (b) { b.style.flex = b.getAttribute('data-w') + ' 1 0'; });
    v.querySelectorAll('.gauge i[data-w]').forEach(function (g) { g.style.width = g.getAttribute('data-w') + '%'; });
  }
  function viewHome() {
    var c = S.calc[S.periodId], u = S.data.user, open = c.p.status === 'open', wait = c.p.status === 'closed', first = u.name.split(' ')[1] || u.name;
    var v = h('main', { class: 'view stack', id: 'main' });
    v.appendChild(pageTop('Здравствуйте, ' + first, u.position + ' · ' + u.site));
    v.appendChild(h('div', null, periodBtn()));
    var w = waitingCount();
    if (w) v.appendChild(h('button', { class: 'alert', type: 'button', 'data-testid': 'home-alert', onclick: function () { S.dedFilter = 'all'; location.hash = '#/ded'; } }, ico('alert'),
      h('div', null, h('b', { text: w + ' ' + plural(w, ['случай ждёт', 'случая ждут', 'случаев ждут']) + ' объяснения' }), h('span', { text: 'Для брака обязательны фото повреждения и объяснительная. Нажмите, чтобы заполнить.' + (explReturnedCount() ? ' Возвращено администратором: ' + explReturnedCount() + '.' : '') }))));
    var rc = returnedCount();
    if (rc) v.appendChild(h('button', { class: 'alert', type: 'button', 'data-testid': 'home-alert-returned', onclick: function () { S.dedFilter = 'all'; location.hash = '#/ded'; } }, ico('alert'),
      h('div', null, h('b', { text: rc + ' ' + plural(rc, ['сообщение возвращено', 'сообщения возвращены', 'сообщений возвращено']) + ' на доработку' }), h('span', { text: 'Администратор просит дополнить объяснение. Нажмите, чтобы открыть.' }))));
    v.appendChild(h('section', { class: 'hero', 'aria-labelledby': 'hero-l', 'data-testid': 'hero' },
      h('div', { class: 'lbl', id: 'hero-l' }, open || wait ? 'К выплате' : 'Выплачено', h('span', { class: 'badge-lite', text: open ? 'период идёт' : wait ? 'период закрыт' : 'закрыт' })),
      h('div', { class: 'big num' }, h('span', { 'data-testid': 'payout', text: num(c.payout) }), h('small', { text: '₽' })),
      h('p', { class: 'note', text: open ? 'Ожидаемая выплата ' + dlong(c.p.payDate) + ' — сумма может измениться до конца периода' : wait ? 'Период закрыт, выплата ' + dlong(c.p.payDate) + ' — сумма уточняется при расчёте' : 'Выплата ' + dlong(c.p.payDate) }),
      h('div', { class: 'eq' }, h('span', { class: 'num', text: 'Начислено ' + money(c.accrued) }), h('span', { class: 'num', text: 'Удержано ' + minus(c.withheld) }))));
    v.appendChild(reportBtn('report-home'));
    v.appendChild(advHomeCard());
    v.appendChild(moreTiles());
    // разбор суммы
    var b = h('section', { class: 'card', 'aria-labelledby': 'br-h', id: 'breakdown', 'data-testid': 'breakdown' });
    b.appendChild(h('div', { class: 'card-h' }, h('h2', { id: 'br-h', text: 'Из чего сложилась сумма' })));
    b.appendChild(h('div', { class: 'line' }, h('div', { class: 'nm' }, 'Выработка по тарифу', h('small', { class: 'num', text: num(c.units) + ' ед. по тарифам операций · смен: ' + c.shifts.length })), h('div', { class: 'am num', text: money(c.tariff) })));
    b.appendChild(h('div', { class: 'line' }, h('div', { class: 'nm' }, 'Ваша доля ' + Math.round(M.SHARE * 100) + '%', h('small', { text: 'Так считается начисление' })), h('div', { class: 'am num', text: '× ' + Math.round(M.SHARE * 100) + '%' })));
    b.appendChild(h('div', { class: 'line total' }, h('div', { class: 'nm', text: 'Начислено' }), h('div', { class: 'am num', 'data-testid': 'accrued', text: money(c.accrued) })));
    b.appendChild(h('div', { class: 'card-h sp' }, h('h3', { class: 'h3', text: 'Вычеты по видам' }), h('span', { class: 'am num', text: minus(c.own) })));
    if (c.own) {
      var bar = h('div', { class: 'stackbar', 'aria-hidden': 'true' });
      KINDS.forEach(function (k) { if (c.by[k]) bar.appendChild(h('i', { class: 'k-' + k, 'data-w': c.by[k] })); });
      b.appendChild(bar);
    }
    KINDS.forEach(function (k) {
      if (!c.by[k]) return;
      var n = c.cases.filter(function (x) { return x.kind === k; }).length;
      b.appendChild(h('div', { class: 'line k-' + k, 'data-kind': k }, h('span', { class: 'swatch', 'aria-hidden': 'true' }), h('div', { class: 'nm' }, KIND[k].n, h('small', { text: n + ' ' + plural(n, ['запись', 'записи', 'записей']) })), h('div', { class: 'am num', text: minus(c.by[k]) })));
    });
    if (c.carryIn) b.appendChild(h('div', { class: 'line' }, h('span', { class: 'swatch k-other', 'aria-hidden': 'true' }), h('div', { class: 'nm', text: 'Перенос с прошлого периода' }), h('div', { class: 'am num', text: minus(c.carryIn) })));
    if (!c.own && !c.carryIn) b.appendChild(h('p', { class: 'cap', text: 'В этом периоде вычетов нет.' }));
    var over = c.carryOut > 0, used = c.limit ? Math.min(100, c.withheld / c.limit * 100) : 0;
    b.appendChild(h('div', { class: 'limit', 'data-testid': 'limit-box' },
      h('div', { class: 't' }, ico('lock', 'sm'), 'Защитный лимит удержаний'),
      (CFG.deductShare >= 1 ? h('p', null, 'Удерживать можно не больше начисленного — сейчас это ', h('b', { class: 'num', text: money(c.limit) }), '.') : h('p', null, 'Из начисленного нельзя удержать больше ', h('b', { text: limitWords() }), ' — сейчас это ', h('b', { class: 'num', text: money(c.limit) }), '.')),
      h('div', { class: 'gauge', role: 'img', 'aria-label': 'Удержано ' + money(c.withheld) + ' из лимита ' + money(c.limit) }, h('i', { class: over ? 'full' : '', 'data-w': used })),
      h('div', { class: 'gl num' }, h('span', { text: 'Удержано ' + money(c.withheld) }), h('span', { text: 'Лимит ' + money(c.limit) })),
      over ? h('p', { 'data-testid': 'carry-text' }, 'Вычетов набралось больше лимита, поэтому ', h('b', { class: 'num', text: money(c.carryOut) }), ' сейчас не списываются — они ', h('b', { text: 'переносятся на следующий период' }), ' и будут удержаны позже.')
        : h('p', { 'data-testid': 'carry-text', text: 'Все вычеты укладываются в лимит — переносить ничего не нужно.' })));
    b.appendChild(h('div', { class: 'line total final' }, h('div', { class: 'nm', text: 'К выплате' }), h('div', { class: 'am num', text: money(c.accrued) + ' − ' + money(c.withheld) + ' = ' + money(c.payout) })));
    v.appendChild(b);
    // производительность
    var pc = pctClass(c.perf), pf = h('section', { class: 'card', 'aria-labelledby': 'pf-h', 'data-testid': 'perf' });
    pf.appendChild(h('div', { class: 'card-h' }, h('h2', { id: 'pf-h', text: 'Производительность' }), chip(pctText(c.perf), pc === 'good' ? 'ok' : pc === 'mid' ? 'warn' : 'bad')));
    pf.appendChild(h('div', { class: 'perf-top' }, h('div', null, h('div', { class: 'perf-num num ' + pc, 'data-testid': 'perf-val', text: pctS(c.perf) + '%' }), h('div', { class: 'cap', text: 'факт к нормативу операций за период' }))));
    if (c.shifts.length) {
      pf.appendChild(perfChart(c.shifts));
      pf.appendChild(h('div', { class: 'legend' }, h('span', null, h('i', { class: 'lg-good' }), '100% и выше'), h('span', null, h('i', { class: 'lg-mid' }), '50–99%'), h('span', null, h('i', { class: 'lg-low' }), 'ниже 50%')));
      var rows = c.shifts.slice().reverse(), shown = S.perfAll ? rows : rows.slice(0, 4), sl = h('div', { class: 'shifts', 'data-testid': 'shift-list' });
      shown.forEach(function (s) { sl.appendChild(shiftRow(s)); }); pf.appendChild(sl);
      if (rows.length > 4) pf.appendChild(h('button', { class: 'link', type: 'button', 'aria-expanded': S.perfAll ? 'true' : 'false', 'data-testid': 'perf-toggle', onclick: function () { S.perfAll = !S.perfAll; render(); } }, S.perfAll ? 'Свернуть' : 'Показать все смены (' + rows.length + ')'));
    } else pf.appendChild(emptyState('cal', 'В этом периоде смен нет', 'Когда появятся смены, здесь будет график.'));
    v.appendChild(pf);
    applyWidths(v); return v;
  }

  /* ---------- календарь ---------- */
  function shiftMonth(ym, d) { var y = +ym.slice(0, 4), m = +ym.slice(5) - 1 + d; y += Math.floor(m / 12); m = (m % 12 + 12) % 12; return y + '-' + ('0' + (m + 1)).slice(-2); }
  function defaultSel(ym, by) {
    if (by[S.data.today] && S.data.today.slice(0, 7) === ym && !by[S.data.today].planned) return S.data.today;
    var ds = Object.keys(by).filter(function (d) { return d.slice(0, 7) === ym && !by[d].planned; }).sort();
    return ds.length ? ds[ds.length - 1] : ym + '-01';
  }
  function viewCal() {
    var v = h('main', { class: 'view stack', id: 'main' }), ym = S.calMonth, y = +ym.slice(0, 4), m = +ym.slice(5), first = pd(ym + '-01'), dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
    var byDate = {}; S.data.shifts.forEach(function (s) { byDate[s.date] = s; });
    v.appendChild(pageTop('Календарь смен', 'Ваши выходы на объект'));
    var done = S.data.shifts.filter(function (s) { return !s.planned && s.date.slice(0, 7) === ym; });
    var card = h('section', { class: 'card calcard', 'aria-label': 'Месяц' });
    card.appendChild(h('div', { class: 'cal-head' }, h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Предыдущий месяц', 'data-testid': 'cal-prev', disabled: ym <= M.periods[M.periods.length - 1].start.slice(0, 7), onclick: function () { S.calMonth = shiftMonth(ym, -1); S.calSel = null; render(); } }, ico('cl')),
      h('h2', { 'aria-live': 'polite', 'data-testid': 'cal-title', text: MON[m - 1] + ' ' + y }),
      h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Следующий месяц', 'data-testid': 'cal-next', disabled: ym >= M.today.slice(0, 7), onclick: function () { S.calMonth = shiftMonth(ym, 1); S.calSel = null; render(); } }, ico('cr'))));
    var g = h('div', { class: 'grid7', role: 'group', 'aria-label': 'Дни месяца' });
    ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].forEach(function (d, i) { g.appendChild(h('div', { class: 'dow' + (i > 4 ? ' we' : ''), 'aria-hidden': 'true', text: d })); });
    var lead = (first.getUTCDay() + 6) % 7, i;
    for (i = 0; i < lead; i++) g.appendChild(h('div', { class: 'cell empty', 'aria-hidden': 'true' }));
    var sel = S.calSel || defaultSel(ym, byDate); S.calSel = sel;
    for (i = 1; i <= dim; i++) (function (day) {
      var ds = ym + '-' + ('0' + day).slice(-2), s = byDate[ds], cls = 'cell', label = dlong(ds) + ', ' + dowOf(ds).toLowerCase();
      if (s) { cls += s.planned ? ' planned' : ' ' + s.type; label += s.planned ? ': запланирована смена' : ': ' + (s.type === 'day' ? 'дневная' : 'ночная') + ' смена, ' + s.hours + ' ч, ' + s.units + ' ед.'; } else { cls += ' off'; label += ': выходной'; }
      if (ds === S.data.today) { cls += ' today'; label += ', сегодня'; }
      if (ds === sel) cls += ' sel';
      g.appendChild(h('button', { class: cls, type: 'button', 'data-date': ds, 'aria-pressed': ds === sel ? 'true' : 'false', 'aria-label': label, onclick: function () { S.calSel = ds; render(); } },
        h('span', { class: 'num', text: String(day) }), s ? ico(s.type === 'day' ? 'sun' : 'moon', 'mk') : h('span', { class: 'ph' })));
    })(i);
    card.appendChild(g);
    card.appendChild(h('div', { class: 'legend-cal' }, h('span', null, h('i', { class: 'day' }), 'День'), h('span', null, h('i', { class: 'night' }), 'Ночь'), h('span', null, h('i', { class: 'pl' }), 'Запланирована'), h('span', null, h('i', { class: 'td' }), 'Сегодня')));
    v.appendChild(card);
    var hrs = sum(done, function (s) { return s.hours; }), un = sum(done, function (s) { return s.units; });
    v.appendChild(h('section', { class: 'card', 'aria-labelledby': 'ct-h', 'data-testid': 'cal-totals' }, h('div', { class: 'card-h' }, h('h2', { id: 'ct-h', text: 'Итого за ' + MON[m - 1] })),
      h('div', { class: 'stats3' }, h('div', { class: 'stat' }, h('b', { class: 'num', 'data-testid': 't-shifts', text: String(done.length) }), h('span', { text: plural(done.length, ['смена', 'смены', 'смен']) })),
        h('div', { class: 'stat' }, h('b', { class: 'num', 'data-testid': 't-hours', text: String(hrs) }), h('span', { text: 'часов' })),
        h('div', { class: 'stat' }, h('b', { class: 'num', 'data-testid': 't-units', text: num(un) }), h('span', { text: 'ед. выработки' })))));
    var s = byDate[sel], dc = h('section', { class: 'card daycard', 'aria-labelledby': 'dc-h', 'data-testid': 'day-card' });
    dc.appendChild(h('div', { class: 'card-h' }, h('h2', { id: 'dc-h', text: dowOf(sel) + ', ' + dlong(sel) }), s ? chip(s.planned ? 'Запланирована' : s.type === 'day' ? 'День' : 'Ночь', s.planned ? 'gray' : s.type === 'day' ? 'day' : 'night', s.planned ? 'clock' : s.type === 'day' ? 'sun' : 'moon') : chip('Выходной', 'gray')));
    if (!s) dc.appendChild(h('p', { class: 'cap', text: 'В этот день смены не было.' }));
    else if (s.planned) dc.appendChild(h('p', { class: 'cap', text: 'Смена ещё не закрыта — выработка появится после подведения итогов.' }));
    else { var p = Math.round(perfOf(s));
      dc.appendChild(h('div', { class: 'kv' }, h('div', null, h('b', { class: 'num', text: s.hours + ' ч' }), h('span', { text: 'Отработано' })), h('div', null, h('b', { class: 'num', text: num(s.units) }), h('span', { text: 'Выработка, ед.' })), h('div', null, h('b', { class: 'num ' + pctClass(p), 'data-testid': 'day-pct', text: pctS(p) + '%' }), h('span', { text: 'Производит-ть' }))));
      dc.appendChild(h('p', { class: 'cap mt', 'data-testid': 'day-zone', text: 'Участок ' + ZI[s.zone].name + ' · смена «' + shiftName(s) + '»' + (s.counted ? '' : ' · не засчитана') }));
      dc.appendChild(h('p', { class: 'cap num mt', text: 'Начислено за смену ≈ ' + money(Math.round(s.tsum * M.SHARE)) }));
      dc.appendChild(h('button', { class: 'btn secondary mt', type: 'button', 'data-testid': 'shift-detail', onclick: function () { openShiftDetail(s); } }, 'Детали смены')); }
    v.appendChild(dc);
    return v;
  }

  /* ---------- операции, участки и нормативы ---------- */
  // Факт берётся из вкладки «Выработка»: одна строка = человек × дата × смена × участок (единицы, производительность, сумма по тарифу, зачёт смены).
  // Разбивки по операциям в «Выработке» нет: факт показываем по участкам и сменам, а операции — как справочник (тариф, норматив).
  var OPI = {}; M.OPS.forEach(function (o) { OPI[o.id] = o; });   // в боевом режиме заполняется из ответа сервера (applyLive)
  var ZI = {}; M.ZONES.forEach(function (z) { ZI[z.id] = z; });
  var NORM_SHIFT_H = M.HOURS_SHIFT || 11;   // в боевом режиме берётся из «Нормативов по участкам» (B3)
  function opTone(p) { return p >= CFG.normHigh ? ['Выше нормы', 'ok', 'good'] : p >= CFG.normGood ? ['Норма', 'ok', 'good'] : p >= CFG.normLow ? ['Ниже нормы', 'warn', 'mid'] : ['Сильно ниже нормы', 'bad', 'low']; }
  function shiftName(s) { return s.label || (s.type === 'day' ? 'День' : 'Ночь'); }
  function zoneAgg(shifts) {
    var by = {};
    shifts.forEach(function (sh) { if (sh.planned || !sh.counted) return;
      var a = by[sh.zone] || (by[sh.zone] = { id: sh.zone, z: ZI[sh.zone], units: 0, norm: 0, tsum: 0, shifts: [] });
      a.units += sh.units; a.norm += sh.norm; a.tsum += sh.tsum; a.shifts.push(sh);
    });
    return M.ZONES.filter(function (z) { return by[z.id]; }).map(function (z) { var a = by[z.id]; a.perf = meanPerf(a.shifts); a.earned = Math.round(a.tsum * M.SHARE); a.avgTariff = a.units ? a.tsum / a.units : 0; return a; });
  }
  function viewOps() {
    var c = S.calc[S.periodId], v = h('main', { class: 'view stack', id: 'main' });
    v.appendChild(pageTop('Операции', 'Ваша выработка и нормативы'));
    v.appendChild(h('div', null, periodBtn()));
    var zs = zoneAgg(c.shifts), total = sum(zs, function (a) { return a.earned; });
    v.appendChild(h('section', { class: 'card', 'aria-labelledby': 'ops-h', 'data-testid': 'ops-total' }, h('div', { class: 'card-h' }, h('h2', { id: 'ops-h', text: 'Заработано по выработке' }), chip(pctText(c.perf), pctClass(c.perf) === 'good' ? 'ok' : pctClass(c.perf) === 'mid' ? 'warn' : 'bad')),
      h('div', { class: 'avail num', 'data-testid': 'ops-total-val', text: money(total) }), h('p', { class: 'help', text: 'Сумма по тарифу × ' + Math.round(M.SHARE * 100) + '% — это ваше начисление до вычетов (с точностью до рубля сходится с «Начислено» на главной: ' + money(c.accrued) + ').' })));
    v.appendChild(h('h2', { class: 'h3', text: 'Мой факт по участкам' }));
    if (!zs.length) v.appendChild(emptyState('box', 'Выработки в периоде нет', 'Когда смены будут закрыты, здесь появится факт по участкам.'));
    else { var zl = h('div', { class: 'stack', 'data-testid': 'zone-list' }); zs.forEach(function (a) {
      var t = opTone(a.perf);
      zl.appendChild(h('button', { class: 'card opcard', type: 'button', 'data-zone-card': a.id, 'aria-label': 'Участок ' + a.z.name + ': ' + num(a.units) + ' ед., ' + pctS(a.perf) + '% к нормативу, заработано ' + money(a.earned), onclick: function () { openZoneDetail(a); } },
        h('div', { class: 'row between' }, h('b', { class: 'opn', text: a.z.name }), chip(t[0], t[1])),
        h('div', { class: 'opgrid' }, h('div', null, h('span', { text: 'Смен в зачёте' }), h('b', { class: 'num', text: String(a.shifts.length) })), h('div', null, h('span', { text: 'Выполнено' }), h('b', { class: 'num', text: num(a.units) + ' ед.' })),
          h('div', null, h('span', { text: 'Средний тариф' }), h('b', { class: 'num', text: rate(a.avgTariff) + ' ₽/ед.' })), h('div', null, h('span', { text: 'Заработано' }), h('b', { class: 'num', text: money(a.earned) }))),
        h('div', { class: 'gauge', 'aria-hidden': 'true' }, h('i', { class: 'pg-' + t[2], 'data-w': Math.min(100, a.perf / 1.3) })),
        h('div', { class: 'gl num' }, h('span', { text: 'Выполнение норматива: ' + pctS(a.perf) + '%' }), h('span', { text: 'По сменам ›' }))));
    }); v.appendChild(zl); }
    v.appendChild(h('h2', { class: 'h3', text: 'Нормативы и тарифы операций' }));
    v.appendChild(h('p', { class: 'cap', text: 'Справочник «Нормативы по участкам»: с ним сверяется ваша выработка. Единицы учитываются по смене и участку, поэтому своего факта по каждой операции здесь нет.' }));
    var lst = h('div', { class: 'stack', 'data-testid': 'ops-list' });
    M.ZONES.forEach(function (z) {
      var ops = M.OPS.filter(function (o) { return o.zone === z.id; });
      var box = h('div', { class: 'card2box refbox', 'data-zone': z.id }, h('div', { class: 'zone-h' }, h('h3', { class: 'h3', text: 'Участок ' + z.name })));
      ops.forEach(function (o) {
        box.appendChild(h('button', { class: 'refrow', type: 'button', 'data-op': o.id, 'aria-label': o.name + ': тариф ' + rate(o.tariff) + ' ₽ за единицу, ' + (o.normH > 0 ? 'норматив ' + o.normH + ' ед. в час' : 'норматива нет'), onclick: function () { openOpDetail(o); } },
          h('span', { class: 'opn', text: o.name }), h('span', { class: 'num rv' }, h('b', { text: rate(o.tariff) + ' ₽' }), h('small', { text: normTxt(o) }))));
      });
      lst.appendChild(box);
    });
    v.appendChild(lst);
    v.appendChild(h('section', { class: 'card', 'aria-labelledby': 'hw-h', 'data-testid': 'how-calc' }, h('h2', { id: 'hw-h', text: 'Как считается' }),
      h('div', { class: 'gap8 mt' },
        h('p', { class: 'cap', text: 'Выработка по тарифу = единицы смены × тарифы операций (средний тариф зависит от того, какими операциями вы занимались).' }),
        h('p', { class: 'cap', text: 'Начисление = выработка по тарифу × ' + Math.round(M.SHARE * 100) + '% (доля на ЗП). Вам за единицу — тариф × ' + Math.round(M.SHARE * 100) + '%.' }),
        h('p', { class: 'cap', text: 'Норматив на смену = норматив (ед. в час) × ' + NORM_SHIFT_H + ' ч. Выполнение норматива = факт ÷ норматив смены («Производительность» в таблице).' }),
        h('p', { class: 'cap', text: 'В зачёт идут смены с отметкой «Зачёт смены». Тарифы и нормативы берутся из справочника «Нормативы по участкам».' }),
        h('div', { class: 'legend' }, h('span', null, h('i', { class: 'lg-good' }), '100% и выше — норма'), h('span', null, h('i', { class: 'lg-mid' }), '50–99% — ниже нормы'), h('span', null, h('i', { class: 'lg-low' }), 'ниже 50% — сильно ниже'), h('span', null, h('i', { class: 'lg-good' }), '115% и выше — выше нормы')),
        h('div', { class: 'tipbox' }, ico('info', 'sm'), h('span', { text: 'Как выйти на норму: откройте участок и посмотрите смены — видно, когда темп просел и сколько единиц не хватило до нормы. Ошибки и пересорт не только снижают вычеты, но и отнимают время на перепроверку.' })))));
    applyWidths(v); return v;
  }
  function shiftRowLine(s, onTap) {
    var p = perfOf(s), cls = 'srow' + (onTap ? ' tap' : '');
    return h(onTap ? 'button' : 'div', { class: cls, type: onTap ? 'button' : null, 'data-date': s.date, onclick: onTap || null }, h('div', { class: 'sico ' + s.type }, ico(s.type === 'day' ? 'sun' : 'moon', 'sm')),
      h('div', { class: 'd' }, dlong(s.date) + ', ' + dowOf(s.date).slice(0, 2).toLowerCase(), h('small', { class: 'num', text: shiftName(s) + ' · ' + num(s.units) + ' ед. · ' + money(Math.round(s.tsum * M.SHARE)) })), h('div', { class: 'pct ' + pctClass(p), text: pctS(p) + '%' }));
  }
  function openZoneDetail(a) {
    var t = opTone(a.perf), ctl, need = Math.max(0, Math.ceil(a.norm - a.units)), z = a.z;
    var list = h('div', { 'data-testid': 'zone-days' }); a.shifts.slice().sort(function (x, y) { return x.date < y.date ? 1 : -1; }).forEach(function (s) { list.appendChild(shiftRowLine(s)); });
    var ops = M.OPS.filter(function (o) { return o.zone === z.id; });
    ctl = openSheet({ title: 'Участок ' + z.name, body: h('div', { class: 'gap16', 'data-testid': 'zone-detail' },
      h('div', { class: 'row between' }, chip(t[0], t[1]), h('span', { class: 'cap num', text: 'Выполнение норматива: ' + pctS(a.perf) + '%' })),
      h('div', { class: 'card2box' }, h('div', { class: 'line' }, h('div', { class: 'nm', text: 'Смен в зачёте' }), h('div', { class: 'am num', text: String(a.shifts.length) })),
        h('div', { class: 'line' }, h('div', { class: 'nm', text: 'Выполнено единиц' }), h('div', { class: 'am num', text: num(a.units) })),
        h('div', { class: 'line' }, h('div', { class: 'nm', text: 'Норматив за эти смены' }), h('div', { class: 'am num', text: num(a.norm) })),
        h('div', { class: 'line' }, h('div', { class: 'nm' }, 'Выработка по тарифу', h('small', { class: 'num', text: 'средний тариф ' + rate(a.avgTariff) + ' ₽/ед.' })), h('div', { class: 'am num', text: money(a.tsum) })),
        h('div', { class: 'line' }, h('div', { class: 'nm' }, 'Заработано', h('small', { class: 'num', text: money(a.tsum) + ' × ' + Math.round(M.SHARE * 100) + '%' })), h('div', { class: 'am num', 'data-testid': 'zone-earned', text: money(a.earned) }))),
      need > 0 ? h('div', { class: 'tipbox warn' }, ico('info', 'sm'), h('span', { text: 'До нормы за период не хватает ' + num(need) + ' ед. ' + z.tip })) : h('div', { class: 'tipbox ok' }, ico('check', 'sm'), h('span', { text: 'Норматив выполнен. ' + z.tip })),
      h('div', { class: 'sec' }, h('div', { class: 'sec-h', text: 'По сменам (нажмите — детали смены)' }), list)),
      footer: h('button', { class: 'btn ghost', type: 'button', onclick: function () { ctl.close(); } }, 'Закрыть') });
    Array.prototype.forEach.call(list.children, function (row) { var sh = a.shifts.filter(function (x) { return x.date === row.getAttribute('data-date'); })[0]; row.classList.add('tap'); row.setAttribute('role', 'button'); row.tabIndex = 0;
      var go = function () { ctl.close(); setTimeout(function () { openShiftDetail(sh); }, 260); }; row.addEventListener('click', go); row.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }); });
  }
  function openOpDetail(d) {
    var ctl, z = ZI[d.zone];
    ctl = openSheet({ title: d.name, body: h('div', { class: 'gap16', 'data-testid': 'op-detail' },
      h('div', { class: 'cap', text: 'Участок ' + z.name + ' · вам за единицу ' + rate4(d.tariff * M.SHARE) + ' ₽' }),
      h('div', { class: 'kv4' }, h('div', null, h('b', { class: 'num', text: rate(d.tariff) + ' ₽' }), h('span', { text: 'тариф за ед.' })), h('div', null, h('b', { class: 'num', text: d.normH > 0 ? String(d.normH) : '—' }), h('span', { text: 'ед. в час' })), h('div', null, h('b', { class: 'num', text: d.normH > 0 ? num(NORM_SHIFT_H * d.normH) : '—' }), h('span', { text: 'ед. за смену ' + NORM_SHIFT_H + ' ч' }))),
      d.normH > 0 ? h('div', { class: 'card2box' }, h('div', { class: 'line' }, h('div', { class: 'nm' }, 'За 100% нормы за смену', h('small', { class: 'num', text: num(NORM_SHIFT_H * d.normH) + ' × ' + rate(d.tariff) + ' ₽ × ' + Math.round(M.SHARE * 100) + '%' })), h('div', { class: 'am num', 'data-testid': 'op-norm-pay', text: money(NORM_SHIFT_H * d.normH * d.tariff * M.SHARE) })),
        h('div', { class: 'line' }, h('div', { class: 'nm', text: 'Каждые +10 ед. выработки' }), h('div', { class: 'am num', text: '+' + money(10 * d.tariff * M.SHARE) }))) : h('div', { class: 'card2box' }, h('div', { class: 'line' }, h('div', { class: 'nm', text: 'Норматива по операции нет' }), h('div', { class: 'am num', text: 'оплата за единицу' })), h('div', { class: 'line' }, h('div', { class: 'nm', text: 'Каждые +10 ед. выработки' }), h('div', { class: 'am num', text: '+' + money(10 * d.tariff * M.SHARE) }))),
      h('div', { class: 'tipbox' }, ico('info', 'sm'), h('span', { text: 'Ваш факт считается по смене и участку (вкладка «Выработка»), а не по отдельной операции. Свой результат смотрите в разделе «Мой факт по участкам». ' + d.tip }))),
      footer: h('button', { class: 'btn ghost', type: 'button', onclick: function () { ctl.close(); } }, 'Закрыть') });
  }
  function openShiftDetail(s) {
    var ctl, p = perfOf(s), t = opTone(p), z = ZI[s.zone], need = Math.max(0, Math.ceil(s.norm - s.units)), earned = Math.round(s.tsum * M.SHARE);
    ctl = openSheet({ title: dowOf(s.date) + ', ' + dlong(s.date), body: h('div', { class: 'gap16', 'data-testid': 'shift-detail-sheet' },
      h('div', { class: 'row between' }, chip(shiftName(s), s.type === 'day' ? 'day' : 'night', s.type === 'day' ? 'sun' : 'moon'), chip(t[0] + ' · ' + pctS(p) + '%', t[1])),
      h('div', { class: 'cap', text: 'Участок ' + z.name + (s.counted ? ' · смена засчитана' : ' · смена не засчитана') }),
      h('div', { class: 'stats3' }, h('div', { class: 'stat' }, h('b', { class: 'num', text: num(s.units) }), h('span', { text: 'единиц' })), h('div', { class: 'stat' }, h('b', { class: 'num ' + pctClass(p), text: pctS(p) + '%' }), h('span', { text: 'к нормативу' })), h('div', { class: 'stat' }, h('b', { class: 'num', text: money(earned) }), h('span', { text: 'начислено' }))),
      h('div', { class: 'card2box', 'data-testid': 'shift-lines' }, h('div', { class: 'line' }, h('div', { class: 'nm', text: 'Выполнено единиц' }), h('div', { class: 'am num', text: num(s.units) })),
        h('div', { class: 'line' }, h('div', { class: 'nm' }, 'Норматив смены', h('small', { text: 'факт ÷ производительность' })), h('div', { class: 'am num', text: num(s.norm) })),
        h('div', { class: 'line' }, h('div', { class: 'nm' }, 'Выработка по тарифу', h('small', { class: 'num', text: 'средний тариф ' + rate(s.units ? s.tsum / s.units : 0) + ' ₽/ед.' })), h('div', { class: 'am num', text: money(s.tsum) })),
        h('div', { class: 'line' }, h('div', { class: 'nm' }, 'Начислено за смену', h('small', { class: 'num', text: money(s.tsum) + ' × ' + Math.round(M.SHARE * 100) + '%' })), h('div', { class: 'am num', text: money(earned) }))),
      need > 0 ? h('div', { class: 'tipbox warn' }, ico('info', 'sm'), h('span', { text: 'До нормы смены не хватило ' + num(need) + ' ед. ' + z.tip })) : h('div', { class: 'tipbox ok' }, ico('check', 'sm'), h('span', { text: 'Норматив смены выполнен. ' + z.tip })),
      h('p', { class: 'cap', text: 'Данные смены — из вкладки «Выработка»: одна строка на смену и участок. Разбивка по отдельным операциям в таблице не ведётся.' })),
      footer: h('button', { class: 'btn ghost', type: 'button', onclick: function () { ctl.close(); } }, 'Закрыть') });
  }


  /* ---------- фото: карусель и полноэкранный просмотр (акции и вакансии) ---------- */
  // Допустимы только https-ссылки (Drive/lh3/прямые картинки), встроенные data:image и файлы демо-папки; всё остальное отбрасывается.
  var PHOTO_OK = [/^https:\/\/[^\s"'<>]+$/i, /^data:image\/(?:jpeg|png|webp|gif);base64,[A-Za-z0-9+\/=]+$/, /^demo-photos\/[\w.-]+$/];
  function photosOf(x) {
    var seen = {}; return (x && Array.isArray(x.photos) ? x.photos : []).filter(function (u) {
      if (typeof u !== 'string' || seen[u] || !PHOTO_OK.some(function (r) { return r.test(u); })) return false; seen[u] = 1; return true;
    }).slice(0, 10);
  }
  var REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function carousel(urls, o) {
    o = o || {};
    var n = urls.length, cur = Math.min(Math.max(o.start || 0, 0), n - 1), raf = 0, lastW = 0, imgs = [];
    var track = h('div', { class: 'car-track', tabindex: '0', role: 'group', 'aria-roledescription': 'карусель', 'aria-label': (o.label || 'Фотографии') + (n > 1 ? ', фото ' + n : ''), 'data-testid': 'car-track' });
    urls.forEach(function (u, i) {
      var img = h('img', { class: 'car-img', alt: (o.alt || 'Фото') + ', ' + (i + 1) + ' из ' + n, loading: 'lazy', decoding: 'async', draggable: 'false', referrerpolicy: 'no-referrer' }), sl;
      img.addEventListener('load', function () { sl.classList.add('ok'); });
      img.addEventListener('error', function () { sl.classList.add('bad'); });
      sl = h('div', { class: 'car-slide', 'data-i': String(i) }, img, h('div', { class: 'car-bad' }, ico('image'), h('span', { text: 'Фото не загрузилось' })));
      imgs.push(img); track.appendChild(sl);
    });
    var cnt = n > 1 ? h('span', { class: 'car-cnt num', 'data-testid': 'car-cnt', role: 'status', 'aria-label': '' }) : null;
    var dots = n > 1 ? h('div', { class: 'car-dots', 'data-testid': 'car-dots', 'aria-hidden': 'true' }, urls.map(function () { return h('span', { class: 'car-dot' }); })) : null;
    var prev = n > 1 ? h('button', { class: 'car-arrow prev', type: 'button', 'aria-label': 'Предыдущее фото', 'data-testid': 'car-prev', onclick: function () { go(cur - 1, true); } }, ico('cl')) : null;
    var next = n > 1 ? h('button', { class: 'car-arrow next', type: 'button', 'aria-label': 'Следующее фото', 'data-testid': 'car-next', onclick: function () { go(cur + 1, true); } }, ico('cr')) : null;
    var el = h('div', { class: 'car' + (o.cls ? ' ' + o.cls : ''), 'data-testid': o.testid || 'carousel', 'data-count': String(n) }, track, cnt, dots, prev, next);
    function ensure(i) {   // подгружаем только текущее и соседние фото
      for (var j = Math.max(0, i - 1); j <= Math.min(n - 1, i + 1); j++) if (!imgs[j].getAttribute('src')) imgs[j].setAttribute('src', urls[j]);
    }
    function paint() {
      if (cnt) { cnt.textContent = (cur + 1) + '/' + n; cnt.setAttribute('aria-label', 'Фото ' + (cur + 1) + ' из ' + n); }
      if (dots) [].forEach.call(dots.children, function (d, i) { d.classList.toggle('on', i === cur); });
      if (prev) { prev.disabled = cur === 0; next.disabled = cur === n - 1; }
      el.setAttribute('data-index', String(cur));
    }
    function set(i) { cur = i; paint(); ensure(i); if (o.onChange) o.onChange(i); }
    function go(i, smooth) {
      i = Math.min(Math.max(i, 0), n - 1);
      track.scrollTo({ left: i * track.clientWidth, behavior: smooth && !REDUCE ? 'smooth' : 'auto' });
      if (!smooth || REDUCE) set(i);
    }
    track.addEventListener('scroll', function () {
      if (raf) return;
      raf = requestAnimationFrame(function () { raf = 0; var i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth)); if (i !== cur && i >= 0 && i < n) set(i); });
    }, { passive: true });
    track.addEventListener('keydown', function (e) {
      if (n > 1 && e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1, true); }
      else if (n > 1 && e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1, true); }
      else if (n > 1 && e.key === 'Home') { e.preventDefault(); go(0, true); }
      else if (n > 1 && e.key === 'End') { e.preventDefault(); go(n - 1, true); }
      else if (o.onOpen && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); o.onOpen(cur); }
    });
    if (o.onOpen) { el.classList.add('tap'); track.addEventListener('click', function () { o.onOpen(cur); }); }
    if (window.ResizeObserver) new ResizeObserver(function () {   // меняется ширина (поворот экрана, первый показ) → держим текущий кадр
      var w = track.clientWidth; if (w && w !== lastW) { lastW = w; track.scrollLeft = cur * w; }
    }).observe(track);
    paint(); ensure(cur);
    return { el: el, track: track, go: go, index: function () { return cur; } };
  }
  var lbCtl = null;
  function openLightbox(urls, start, label) {
    if (lbCtl) return;
    var opener = document.activeElement, ctl, car;
    var closeBtn = h('button', { class: 'lb-x', type: 'button', 'aria-label': 'Закрыть', 'data-testid': 'lb-close', onclick: function () { ctl.close(); } }, ico('x'));
    car = carousel(urls, { start: start, label: label, alt: label, cls: 'lb-car', testid: 'lb-carousel' });
    var ov = h('div', { class: 'lb', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Просмотр фотографий: ' + label, 'data-testid': 'lightbox' }, car.el, closeBtn);
    function onKey(e) {
      if (openStack[openStack.length - 1] !== ctl) return;
      if (e.key === 'Escape') { e.preventDefault(); ctl.close(); }
      if (e.key === 'Tab') {
        var f = [car.track].concat([].slice.call(ov.querySelectorAll('button:not([disabled])'))).filter(function (x) { return x.offsetParent !== null; });
        var i = f.indexOf(document.activeElement), d = e.shiftKey ? -1 : 1;
        e.preventDefault(); f[(i + d + f.length) % f.length].focus();
      }
    }
    ctl = {
      el: ov,
      close: function (fromPop) {
        if (!ov.parentNode) return;
        ov.remove(); document.removeEventListener('keydown', onKey); openStack.splice(openStack.indexOf(ctl), 1); lbCtl = null;
        [].forEach.call(overlayRoot.children, function (x) { x.removeAttribute('inert'); });
        if (!openStack.length) { $('#app').removeAttribute('inert'); document.body.classList.remove('has-ov'); }
        if (fromPop !== true && history.state && history.state.prLb) history.back();   // убираем свою запись истории (крестик/Esc)
        if (opener && opener.isConnected) opener.focus();
      }
    };
    lbCtl = ctl;
    try { history.pushState({ prLb: 1 }, '', location.href); } catch (e) { /* без истории закрытие по «назад» недоступно */ }
    [].forEach.call(overlayRoot.children, function (x) { x.setAttribute('inert', ''); });
    openStack.push(ctl); document.body.classList.add('has-ov'); overlayRoot.appendChild(ov); $('#app').setAttribute('inert', ''); document.addEventListener('keydown', onKey);
    setTimeout(function () { car.track.focus(); }, 30);
  }
  window.addEventListener('popstate', function () { if (lbCtl && !(history.state && history.state.prLb)) lbCtl.close(true); });   // «назад» / жест Android закрывают просмотр

  /* ---------- «Ещё»: плитки, акции, вакансии, анонимная обратная связь ---------- */
  function promoState(p) {
    var t = M.today;
    if (p.from > t) return { k: 'soon', label: 'Скоро', tone: 'info', note: 'Начало ' + dmy(p.from) };
    if (p.to < t) return { k: 'ended', label: 'Завершена', tone: 'gray', note: 'Закончилась ' + dmy(p.to) };
    var left = Math.round((pd(p.to) - pd(t)) / 86400000);
    return { k: 'active', label: 'Активна', tone: 'ok', note: left === 0 ? 'Последний день' : 'Осталось ' + left + ' ' + plural(left, ['день', 'дня', 'дней']) };
  }
  function moreTiles() {
    var act = M.promos.filter(function (p) { return promoState(p).k === 'active'; }).length, jobs = (S.data.jobs || M.jobs).filter(function (j) { return j.status === 'open'; }).length;
    function tile(id, ic, t, sub, fn) { return h('button', { class: 'tile', type: 'button', 'data-testid': 'tile-' + id, onclick: fn }, h('span', { class: 'tic' }, ico(ic)), h('b', { text: t }), h('small', { text: sub })); }
    return h('section', { class: 'stack', 'aria-labelledby': 'more-h', 'data-testid': 'more' }, h('h2', { class: 'h3', id: 'more-h', text: 'Ещё' }),
      h('div', { class: 'tiles' },
        tile('promo', 'gift', 'Акции и бонусы', act + ' ' + plural(act, ['активна', 'активны', 'активны']), function () { location.hash = '#/promo'; }),
        tile('jobs', 'briefcase', 'Вакансии в компании', jobs + ' ' + plural(jobs, ['открыта', 'открыты', 'открыто']), function () { location.hash = '#/jobs'; }),
        tile('fb', 'paper', 'Анонимная обратная связь', 'без имени и телефона', openFeedback)));
  }
  function backTop(title, sub, href) { return h('div', { class: 'top' }, h('div', null, h('a', { class: 'back', href: href || '#/home', 'data-testid': 'back' }, ico('cl', 'sm'), 'Назад'), h('h1', { text: title }), sub ? h('p', { class: 'sub', text: sub }) : null)); }

  /* --- акции и бонусы --- */
  function promoCard(p) {
    var st = promoState(p), ph = photosOf(p), lbl = p.title + ', ' + st.label + ', ' + p.bonus;
    var inner = [h('div', { class: 'row between' }, chip(st.label, st.tone, st.k === 'active' ? 'check' : st.k === 'soon' ? 'clock' : null), h('span', { class: 'cap num', text: st.note })),
      h('b', { class: 'pt', text: p.title }), h('div', { class: 'pbonus num', text: p.bonus }), h('p', { class: 'cap', text: p.desc }),
      h('div', { class: 'gl num' }, h('span', { text: dmy(p.from) + ' – ' + dmy(p.to) }), h('span', { text: 'Условия ›' }))];
    if (!ph.length) return h('button', { class: 'card promo ' + st.k, type: 'button', 'data-promo': p.id, 'data-state': st.k, 'aria-label': lbl, onclick: function () { openPromo(p); } }, inner);
    var car = carousel(ph, { label: p.title, alt: p.title, cls: 'in-card', onOpen: function (i) { openLightbox(ph, i, p.title); } });
    return h('div', { class: 'card promo has-photo ' + st.k, 'data-promo': p.id, 'data-state': st.k, onclick: function (e) { if (!e.target.closest('.car')) openPromo(p); } },
      car.el, h('button', { class: 'pc-main', type: 'button', 'aria-label': lbl }, inner));
  }
  function viewPromo() {
    var v = h('main', { class: 'view stack', id: 'main' }); v.appendChild(backTop('Акции и бонусы', 'Что действует для вас сейчас'));
    var order = { active: 0, soon: 1, ended: 2 }, f = S.promoFilter || 'all';
    var all = M.promos.slice().sort(function (x, y) { return order[promoState(x).k] - order[promoState(y).k] || (x.to < y.to ? -1 : 1); });
    var bar = h('div', { class: 'filters', role: 'group', 'aria-label': 'Фильтр акций' });
    [['all', 'Все'], ['active', 'Активные'], ['soon', 'Скоро'], ['ended', 'Завершённые']].forEach(function (x) {
      var n = x[0] === 'all' ? all.length : all.filter(function (p) { return promoState(p).k === x[0]; }).length;
      bar.appendChild(h('button', { class: 'fbtn', type: 'button', 'aria-pressed': f === x[0] ? 'true' : 'false', 'data-filter': x[0], onclick: function () { S.promoFilter = x[0]; render(); } }, x[1], h('em', { text: String(n) })));
    });
    v.appendChild(bar);
    var items = all.filter(function (p) { return f === 'all' || promoState(p).k === f; });
    if (!items.length) v.appendChild(emptyState('gift', 'Акций нет', 'В этой категории ничего нет.'));
    else { var l = h('div', { class: 'stack', 'data-testid': 'promo-list' }); items.forEach(function (p) { l.appendChild(promoCard(p)); }); v.appendChild(l); }
    v.appendChild(h('p', { class: 'note-s', text: 'Акции и бонусы ведёт администратор. Выплата — в «Ведомости» за период, в котором выполнены условия.' }));
    return v;
  }
  function openPromo(p) {
    var st = promoState(p), ctl, ph = photosOf(p);
    ctl = openSheet({ title: p.title, body: h('div', { class: 'gap16', 'data-testid': 'promo-detail' },
      ph.length ? carousel(ph, { label: p.title, alt: p.title, onOpen: function (i) { openLightbox(ph, i, p.title); } }).el : null,
      h('div', { class: 'row between' }, chip(st.label, st.tone, st.k === 'active' ? 'check' : st.k === 'soon' ? 'clock' : null), h('span', { class: 'cap num', text: st.note })),
      h('div', { class: 'pbonus big num', text: p.bonus }), h('p', { text: p.desc }),
      h('div', { class: 'card2box' }, h('div', { class: 'line' }, h('div', { class: 'nm', text: 'Срок действия' }), h('div', { class: 'am num', text: dmy(p.from) + ' – ' + dmy(p.to) }))),
      h('div', { class: 'sec' }, h('div', { class: 'sec-h', text: 'Условия' }), h('ul', { class: 'terms', 'data-testid': 'promo-terms' }, p.terms.map(function (t) { return h('li', { text: t }); }))),
      st.k === 'ended' ? h('p', { class: 'cap', text: 'Акция завершена — новые начисления по ней не производятся.' }) : st.k === 'soon' ? h('p', { class: 'cap', text: 'Акция ещё не началась: смены до ' + dmy(p.from) + ' не учитываются.' }) : h('p', { class: 'cap', text: 'Если считаете, что условия выполнены, а бонуса нет, напишите бригадиру или администратору.' })),
      footer: h('button', { class: 'btn ghost', type: 'button', onclick: function () { ctl.close(); } }, 'Закрыть') });
  }

  /* --- вакансии --- */
  function appOf(jobId) { return (S.data.applications || []).filter(function (x) { return x.jobId === jobId; })[0]; }
  function jobCard(j) {
    var ap = appOf(j.id), closed = j.status !== 'open', ph = photosOf(j);
    var lbl = j.title + ', ' + j.zone + (closed ? ', закрыта' : '') + (ap ? ', вы откликнулись' : '');
    var inner = [h('div', { class: 'row between' }, h('b', { class: 'pt', text: j.title }), closed ? chip('Закрыта', 'gray') : ap ? chip(APP_ST[ap.status][0], APP_ST[ap.status][1], 'check') : chip('Открыта', 'ok')),
      h('div', { class: 'jmeta' }, h('span', null, ico('box', 'sm'), j.zone), h('span', null, ico('clock', 'sm'), j.schedule)),
      h('div', { class: 'jpay num', text: j.pay }), h('div', { class: 'gl' }, h('span', { text: 'Контакт: ' + j.contact.name }), h('span', { text: 'Подробнее ›' }))];
    if (!ph.length) return h('button', { class: 'card job' + (closed ? ' closed' : ''), type: 'button', 'data-job': j.id, 'aria-label': lbl, onclick: function () { openJob(j); } }, inner);
    var car = carousel(ph, { label: j.title, alt: j.title, cls: 'in-card', onOpen: function (i) { openLightbox(ph, i, j.title); } });
    return h('div', { class: 'card job has-photo' + (closed ? ' closed' : ''), 'data-job': j.id, onclick: function (e) { if (!e.target.closest('.car')) openJob(j); } },
      car.el, h('button', { class: 'pc-main', type: 'button', 'aria-label': lbl }, inner));
  }
  function viewJobs() {
    var v = h('main', { class: 'view stack', id: 'main' }); v.appendChild(backTop('Вакансии в компании', 'Внутренние вакансии — можно откликнуться'));
    var jobs = (S.data.jobs || M.jobs).slice().sort(function (x, y) { return (x.status === 'open' ? 0 : 1) - (y.status === 'open' ? 0 : 1); });
    var l = h('div', { class: 'stack', 'data-testid': 'job-list' }); jobs.forEach(function (j) { l.appendChild(jobCard(j)); }); if (jobs.length) v.appendChild(l); else v.appendChild(emptyState('briefcase', 'Вакансий пока нет', 'Когда появятся внутренние вакансии, они будут здесь.'));
    v.appendChild(h('p', { class: 'note-s', text: 'Вакансии ведёт администратор. Отклик увидит только он и HR — бригадир по вашему участку отклик не получает.' }));
    return v;
  }
  function openJob(j) {
    var ap = appOf(j.id), closed = j.status !== 'open', ctl, ph = photosOf(j);
    function kv(t, val) { return h('div', { class: 'line' }, h('div', { class: 'nm', text: t }), h('div', { class: 'am', text: val })); }
    var foot = closed ? h('button', { class: 'btn ghost', type: 'button', onclick: function () { ctl.close(); } }, 'Закрыть')
      : ap ? h('button', { class: 'btn ghost', type: 'button', onclick: function () { ctl.close(); } }, 'Закрыть')
      : h('div', { class: 'stack' }, h('button', { class: 'btn', type: 'button', 'data-testid': 'job-apply', onclick: function () { ctl.close(true); openApply(j); } }, ico('send', 'sm'), 'Откликнуться'), h('button', { class: 'btn ghost', type: 'button', onclick: function () { ctl.close(); } }, 'Закрыть'));
    ctl = openSheet({ title: j.title, body: h('div', { class: 'gap16', 'data-testid': 'job-detail' },
      ph.length ? carousel(ph, { label: j.title, alt: j.title, onOpen: function (i) { openLightbox(ph, i, j.title); } }).el : null,
      closed ? h('div', { class: 'tipbox' }, ico('info', 'sm'), h('span', { text: 'Вакансия закрыта — отклики не принимаются.' })) : null,
      ap ? h('div', { class: 'tipbox ok', 'data-testid': 'job-applied' }, ico('check', 'sm'), h('span', { text: 'Вы откликнулись ' + dmy(ap.sentAt) + '. Статус: ' + APP_ST[ap.status][0] + '.' + (ap.comment ? ' Ваш комментарий: «' + ap.comment + '».' : '') })) : null,
      h('div', { class: 'card2box' }, kv('Участок', j.zone), kv('График', j.schedule), kv('Оплата', j.pay)),
      h('div', { class: 'sec' }, h('div', { class: 'sec-h', text: 'Требования' }), h('ul', { class: 'terms', 'data-testid': 'job-reqs' }, j.reqs.map(function (t) { return h('li', { text: t }); }))),
      h('div', { class: 'sec' }, h('div', { class: 'sec-h', text: 'Кому написать' }), h('div', { class: 'casebox', 'data-testid': 'job-contact' }, h('b', { text: j.contact.name }), h('span', { text: j.contact.role }), h('span', { class: 'num', text: j.contact.how })))),
      footer: foot });
  }
  function openApply(j) {
    var u = S.data.user, sending = false, ctl;
    var text = h('textarea', { class: 'inp', id: 'ap-text', 'data-testid': 'ap-text', rows: '4', maxlength: String(CFG.jobCommentMax), placeholder: 'Например: есть опыт, удобно выйти с понедельника (необязательно)', 'aria-describedby': 'ap-h' });
    var cnt = h('span', { class: 'cap num', 'data-testid': 'ap-count', text: '0 из ' + CFG.jobCommentMax });
    text.addEventListener('input', function () { cnt.textContent = text.value.length + ' из ' + CFG.jobCommentMax; });
    var send = h('button', { class: 'btn', type: 'button', 'data-testid': 'ap-send' }, ico('send', 'sm'), 'Отправить отклик');
    send.addEventListener('click', function () {
      if (sending || !requireOnline()) return; sending = true; send.disabled = true; clear(send); send.appendChild(h('span', { class: 'spinner' })); send.appendChild(document.createTextNode(' Отправляем…'));
      delay(LAT + 300).then(function () { return backend.applyJob(j.id, text.value); }).then(function (r) {
        if (!r.ok) { sending = false; send.disabled = false; clear(send); send.appendChild(ico('send', 'sm')); send.appendChild(document.createTextNode('Отправить отклик')); toast(r.error === 'already' ? 'Вы уже откликались на эту вакансию' : r.error === 'closed' ? 'Вакансия закрыта' : netMsg(r.error) ? 'Не отправлено: ' + netMsg(r.error) : 'Не отправлено (' + r.error + ')', 'bad'); return; }
        ctl.close(true); toast('Отклик отправлен. Статус — «Отправлен»'); refresh();
      });
    });
    ctl = openSheet({ title: 'Отклик: ' + j.title, body: h('div', { class: 'gap16', 'data-testid': 'apply-form' },
      h('div', { class: 'card2box' }, h('div', { class: 'line' }, h('div', { class: 'nm', text: 'Кто откликается' }), h('div', { class: 'am', text: u.name })),
        h('div', { class: 'line' }, h('div', { class: 'nm', text: 'Телефон для связи' }), h('div', { class: 'am num', 'data-testid': 'ap-phone', text: maskPhone(u.phone) })),
        h('div', { class: 'line' }, h('div', { class: 'nm', text: 'Текущий участок' }), h('div', { class: 'am', text: u.site }))),
      h('p', { class: 'cap', id: 'ap-h', text: 'Контакт берётся из профиля — заполнять ничего не нужно. Отклик увидит администратор/HR (вкладка «Отклики на вакансии»).' }),
      h('div', { class: 'sec' }, h('div', { class: 'sec-h' }, h('label', { for: 'ap-text', text: 'Комментарий' }), h('span', { class: 'tag opt', text: 'по желанию' })), text, h('div', { class: 'row between' }, h('span', { class: 'help', text: 'Расскажите коротко, почему вам подходит.' }), cnt))),
      footer: h('div', { class: 'stack' }, send, h('button', { class: 'btn ghost', type: 'button', onclick: function () { ctl.close(); } }, 'Отмена')) });
  }

  /* --- анонимная обратная связь: отдельный запрос БЕЗ сессии, телефона, ФИО; защита от спама без идентификации --- */
  var ANON_URL = 'api/anonymous-feedback';
  function anonBuildRequest(p) {
    // В тело входят только тема, текст, (фото), ответ на проверку и ловушка для ботов. Никаких cookie/токена/заголовка Authorization.
    var body = { topic: p.topic, text: p.text, cid: p.cid, ans: p.ans, hp: p.hp || '' };
    if (p.photo) body.photo = { kind: 'image', w: p.photo.w, h: p.photo.h, size: p.photo.size, thumb: p.photo.thumb };
    return { url: ANON_URL, method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', body: JSON.stringify(body) };
  }
  function anonSend(p) {   // «сеть»: запрос фиксируется в window.__anonSent (для проверки в тестах) и обрабатывается «сервером», который видит только эти поля
    var req = anonBuildRequest(p); (window.__anonSent = window.__anonSent || []).push(req);
    return delay(LAT + 300).then(function () { return backend.anonSubmit(JSON.parse(req.body), p.photo && p.photo.blob); });
  }
  function anonQuota() { var q = load('pr.anon', null), day = M.today; if (!q || q.day !== day) q = { day: day, n: 0 }; return q; }   // локальный счётчик: только на этом устройстве, никуда не отправляется
  var ANON_ERR = { topic: 'Выберите тему', text_short: 'Напишите хотя бы ' + 10 + ' символов', text_long: 'Слишком длинное сообщение', bad_photo: 'Фото не подошло: выберите другое', captcha: 'Неверный ответ на проверку — попробуйте ещё раз', captcha_expired: 'Проверка устарела — обновили, ответьте ещё раз', too_fast: 'Слишком быстро — подождите пару секунд', busy: 'Сейчас много сообщений. Попробуйте позже (через час)' };
  function openFeedback() {
    var topic = '', sending = false, ctl, ch = null, readyAt = 0, tick = null, done = false;
    var q0 = anonQuota();
    var seg = h('div', { class: 'seg tp', role: 'radiogroup', 'aria-label': 'Тема', 'data-testid': 'fb-topic' });
    var text = h('textarea', { class: 'inp', id: 'fb-text', 'data-testid': 'fb-text', rows: '5', maxlength: String(CFG.anonMax), placeholder: 'Опишите ситуацию или идею. Без ФИО — вас не спрашивают, кто вы.', 'aria-describedby': 'fb-th' });
    var count = h('span', { class: 'help', id: 'fb-th', 'data-testid': 'fb-count' });
    var slot = fileSlot({ id: 'fb', title: 'Фото (по желанию)', alt: 'Фото', max: 1, gallery: true, camLabel: 'Снять на камеру', galLabel: 'Из галереи', help: 'По желанию. Фото пережимается на телефоне — данные о месте и времени съёмки удаляются. Не снимайте лица и бейджи.' });
    var capQ = h('span', { 'data-testid': 'fb-q', text: '…' });
    var ans = h('input', { class: 'inp', type: 'text', inputmode: 'numeric', autocomplete: 'off', id: 'fb-ans', 'data-testid': 'fb-ans', maxlength: '3', 'aria-label': 'Ответ на проверку' });
    var hp = h('input', { type: 'text', name: 'website', class: 'sr-only', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true', 'data-testid': 'fb-hp' });
    var send = h('button', { class: 'btn', type: 'button', 'data-testid': 'fb-send', disabled: true });
    var why = h('p', { class: 'note-s', role: 'status', 'data-testid': 'fb-why' });
    var errEl = h('div', { class: 'err', role: 'alert', hidden: true, 'data-testid': 'fb-err' });
    function sendLabel() { clear(send); send.appendChild(ico('send', 'sm')); send.appendChild(document.createTextNode('Отправить анонимно')); }
    sendLabel();
    function newChallenge() { ch = null; update(); backend.anonChallenge().then(function (r) { if (!r.ok) { capQ.textContent = 'нет связи'; errEl.textContent = 'Нет связи с сервером. Закройте окно и повторите позже.'; errEl.hidden = false; return; } ch = r; readyAt = Date.now() + CFG.anonMinSec * 1000; capQ.textContent = r.q + ' = ?'; ans.value = ''; update(); }); }
    Object.keys(ANON_TOPICS).forEach(function (k) {
      seg.appendChild(h('button', { type: 'button', role: 'radio', 'data-topic': k, 'aria-checked': 'false', onclick: function () { topic = k; [].forEach.call(seg.children, function (b) { b.setAttribute('aria-checked', b.getAttribute('data-topic') === k ? 'true' : 'false'); }); update(); } }, ANON_TOPICS[k]));
    });
    function update() {
      var tl = text.value.trim().length, ok = topic && tl >= CFG.anonMin && ans.value.trim() && !slot.busy() && ch, wait = Math.max(0, Math.ceil((readyAt - Date.now()) / 1000));
      count.textContent = tl >= CFG.anonMin ? tl + ' симв. ✓' : tl + ' из ' + CFG.anonMin + ' симв. минимум';
      send.disabled = !(ok && !wait) || sending;
      var miss = []; if (!topic) miss.push('выберите тему'); if (tl < CFG.anonMin) miss.push('напишите текст'); if (!ans.value.trim()) miss.push('ответьте на проверку');
      why.textContent = slot.busy() ? 'Обрабатываем фото…' : miss.length ? 'Осталось: ' + miss.join(', ') + '.' : wait ? 'Отправка откроется через ' + wait + ' с (защита от автоматических сообщений).' : 'Всё готово — можно отправлять.';
    }
    tick = setInterval(function () { if (!document.body.contains(ans)) { clearInterval(tick); return; } update(); }, 500);
    text.addEventListener('input', update); ans.addEventListener('input', update); slot.onChange(update);
    send.addEventListener('click', function () {
      if (send.disabled || !requireOnline()) return; sending = true; send.disabled = true; errEl.hidden = true; clear(send); send.appendChild(h('span', { class: 'spinner' })); send.appendChild(document.createTextNode(' Отправляем…'));
      var ph = slot.ready()[0];
      anonSend({ topic: topic, text: text.value, cid: ch.cid, ans: ans.value, hp: hp.value, photo: ph ? { kind: 'image', w: ph.w, h: ph.h, size: ph.size, thumb: ph.thumb, blob: ph.blob } : null }).then(function (r) {
        sending = false;
        if (!r.ok) { sendLabel(); errEl.textContent = ANON_ERR[r.error] || 'Не отправлено'; errEl.hidden = false; newChallenge(); toast('Не отправлено', 'bad'); return; }
        var q = anonQuota(); q.n++; store('pr.anon', q); done = true; clearInterval(tick); slot.release();
        showThanks();
      });
    });
    var anonBox = h('section', { class: 'anonbox', 'data-testid': 'fb-how', 'aria-labelledby': 'fb-how-h' }, h('div', { class: 't', id: 'fb-how-h' }, ico('lock', 'sm'), 'Как обеспечена анонимность'),
      h('ul', { class: 'terms' },
        h('li', { text: 'Сообщение уходит отдельным запросом без входа: в него не попадают ваш телефон, ФИО, табельный номер и токен сессии.' }),
        h('li', { text: 'Сервер не знает, кто вы, и не записывает IP-адрес и устройство. Хранятся тема, текст, фото и только дата, без времени.' }),
        h('li', { text: 'От спама защищает простая проверка, пауза перед отправкой и общий лимит в час — всё это не привязано к человеку. Счётчик «не больше ' + CFG.anonDayLimit + ' в день» хранится только на вашем телефоне.' }),
        h('li', { text: 'Фото пережимается на телефоне: данные о месте и времени съёмки удаляются.' }),
        h('li', { text: 'Честно: если в тексте есть детали, которые знаете только вы (смена, дата, фамилии), автора можно догадаться. Ответа вы не получите — связи с вами нет.' })));
    function showThanks() {
      var q = anonQuota(), left = Math.max(0, CFG.anonDayLimit - q.n);
      ctl.body.replaceChildren(h('div', { class: 'thanks', 'data-testid': 'fb-thanks' }, h('div', { class: 'eic ok' }, ico('check', 'lg')), h('b', { text: 'Спасибо, отправлено' }),
        h('p', { text: 'Сообщение передано администратору без вашего имени и телефона. Связать его с вами нельзя — поэтому ответа не будет.' }),
        h('p', { class: 'cap', 'data-testid': 'fb-left', text: left ? 'С этого устройства сегодня можно отправить ещё ' + left + '.' : 'Дневной лимит на этом устройстве исчерпан — следующее сообщение завтра.' })));
      ctl.footer.replaceChildren(h('button', { class: 'btn', type: 'button', 'data-testid': 'fb-close', onclick: function () { ctl.close(); } }, 'Готово'));
      toast('Анонимное сообщение отправлено');
    }
    var body;
    if (q0.n >= CFG.anonDayLimit) body = h('div', { class: 'gap16' }, h('div', { class: 'tipbox warn', 'data-testid': 'fb-limit' }, ico('info', 'sm'), h('span', { text: 'С этого устройства сегодня уже отправлено ' + q0.n + ' ' + plural(q0.n, ['сообщение', 'сообщения', 'сообщений']) + ' — это дневной лимит. Попробуйте завтра.' })), anonBox);
    else body = h('div', { class: 'gap16' }, anonBox,
      h('div', { class: 'sec' }, h('div', { class: 'sec-h' }, h('span', { text: 'Тема' }), h('span', { class: 'req', 'aria-hidden': 'true', text: '*' })), seg),
      h('div', { class: 'sec' }, h('div', { class: 'sec-h' }, h('label', { for: 'fb-text', text: 'Сообщение' }), h('span', { class: 'req', 'aria-hidden': 'true', text: '*' })), text, count),
      h('div', { class: 'sec' }, h('div', { class: 'sec-h' }, h('span', { text: 'Фото' }), h('span', { class: 'tag opt', text: 'по желанию' })), slot.el),
      h('div', { class: 'sec' }, h('div', { class: 'sec-h' }, h('label', { for: 'fb-ans', text: 'Проверка: сколько будет ' }), h('b', { class: 'num' }, capQ)), ans, h('p', { class: 'help', text: 'Так мы отличаем людей от программ, не узнавая, кто вы.' }), hp), errEl);
    var foot = q0.n >= CFG.anonDayLimit ? h('button', { class: 'btn ghost', type: 'button', onclick: function () { ctl.close(); } }, 'Закрыть') : h('div', null, send, why);
    ctl = openSheet({ title: 'Анонимная обратная связь', body: body, footer: foot, onClose: function () { clearInterval(tick); slot.release(); } });
    ctl.body = body; ctl.footer = foot;
    if (q0.n < CFG.anonDayLimit) newChallenge();
  }

  /* ---------- вычеты ---------- */
  function needText() { return 'Обязательно: фото и объяснительная'; }
  function caseCard(c) {
    var k = KIND[c.kind], el = h('article', { class: 'card case k-' + c.kind, 'data-case': c.id, 'aria-label': k.n + ', ' + c.title + ', ' + money(c.amount) });
    el.appendChild(h('div', { class: 'hd' }, h('div', { class: 'kico' }, ico(k.ic)), h('div', { class: 'grow' }, h('div', { class: 'tt', text: c.title }), h('div', { class: 'meta', text: k.n + ' · ' + dmy(c.date) })), h('div', { class: 'amt num', text: minus(c.amount) })));
    if (c.expl) {
      var st = EX_ST[c.expl.status], ft = h('div', { class: 'ft' });
      var ret = c.expl.status === 'waiting' && c.expl.returned;
      ft.appendChild(h('div', { class: 'row between' }, ret ? chip('Возвращено', 'warn', 'info') : chip(st[0], st[1], c.expl.status === 'waiting' ? 'clock' : 'check'), c.expl.sentAt ? h('span', { class: 'cap', text: dmy(c.expl.sentAt) }) : null));
      if (c.expl.status === 'waiting') {
        if (ret) ft.appendChild(retBox(c.expl.returnedReason, 'expl-returned-' + c.id));
        ft.appendChild(h('div', { class: 'need' }, ico('info', 'sm'), h('span', { text: needText(c) })));
        ft.appendChild(h('button', { class: 'btn', type: 'button', 'data-testid': 'explain-' + c.id, onclick: function () { openExplain(c); } }, ico('camera', 'sm'), ret ? 'Исправить и отправить снова' : 'Объяснить / приложить фото'));
      } else ft.appendChild(h('button', { class: 'btn ghost', type: 'button', 'data-testid': 'view-' + c.id, onclick: function () { openExplView(c); } }, 'Посмотреть отправленное'));
      el.appendChild(ft);
    }
    return el;
  }
  function viewDed() {
    var c = S.calc[S.periodId], v = h('main', { class: 'view stack', id: 'main' });
    v.appendChild(pageTop('Вычеты', 'Брак, ошибки, авансы, проживание'));
    v.appendChild(h('div', null, periodBtn()));
    v.appendChild(reportBtn('report-ded'));
    var incs = (S.data.incidents || []).slice().sort(function (a, b) { return a.sentAt < b.sentAt ? 1 : -1; });
    if (incs.length && S.dedFilter === 'all') { var isec = h('section', { 'aria-labelledby': 'inc-h', class: 'stack' }, h('h2', { class: 'h3', id: 'inc-h', text: 'Мои сообщения о происшествиях (' + incs.length + ')' })); var il = h('div', { class: 'stack', 'data-testid': 'incident-list' }); incs.forEach(function (i) { il.appendChild(incCard(i)); }); isec.appendChild(il); v.appendChild(isec); }
    var all = c.cases.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    v.appendChild(h('div', { class: 'card' }, h('div', { class: 'sumline' }, h('span', { text: 'Всего вычетов в периоде' }), h('b', { class: 'num', 'data-testid': 'ded-total', text: minus(c.own) })),
      c.carryOut ? h('p', { class: 'cap mt', text: 'Из начисленного удерживается не больше 50% — ' + money(c.carryOut) + ' переносится на следующий период.' }) : null));
    var f = h('div', { class: 'filters', role: 'group', 'aria-label': 'Фильтр по виду' });
    var LBL = { all: 'Все', brak: 'Брак', error: 'Ошибки', advance: 'Авансы', housing: 'Проживание', other: 'Прочее' };
    ['all'].concat(KINDS).forEach(function (k) {
      var n = k === 'all' ? all.length : all.filter(function (q) { return q.kind === k; }).length; if (k !== 'all' && !n) return;
      f.appendChild(h('button', { class: 'fbtn', type: 'button', 'aria-pressed': S.dedFilter === k ? 'true' : 'false', 'data-filter': k, onclick: function () { S.dedFilter = k; render(); } }, LBL[k], h('em', { text: String(n) })));
    });
    v.appendChild(f);
    var items = all.filter(function (q) { return S.dedFilter === 'all' || q.kind === S.dedFilter; });
    if (!items.length) v.appendChild(emptyState('ded', all.length ? 'Ничего не найдено' : 'Вычетов нет', all.length ? 'В этой категории за период записей нет.' : 'За выбранный период удержаний не было — так держать!'));
    else { var lst = h('div', { class: 'stack', 'data-testid': 'case-list' }); items.forEach(function (q) { lst.appendChild(caseCard(q)); }); v.appendChild(lst); }
    return v;
  }

  /* --- лист «Объяснить / приложить фото»: фото (для брака/повреждений) и объяснительная ОБЯЗАТЕЛЬНЫ --- */
  function processImage(file) {
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\//.test(file.type)) return reject(new Error('notimage'));
      if (!file.size) return reject(new Error('empty'));
      if (file.size > CFG.imgSrcMaxMB * 1048576) return reject(new Error('toobig'));
      function fromSrc(src, w, h0, rel) {
        try {
          var sc = Math.min(1, 1280 / Math.max(w, h0)), cw = Math.round(w * sc), ch = Math.round(h0 * sc), cv = document.createElement('canvas');
          cv.width = cw; cv.height = ch; var cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cw, ch); cx.drawImage(src, 0, 0, cw, ch);
          var ts = Math.min(1, 240 / Math.max(cw, ch)), tv = document.createElement('canvas'); tv.width = Math.round(cw * ts); tv.height = Math.round(ch * ts); tv.getContext('2d').drawImage(cv, 0, 0, tv.width, tv.height);
          cv.toBlob(function (b) { if (rel) rel(); if (!b) return reject(new Error('fail')); resolve({ kind: 'image', name: safeName(file.name), blob: b, url: URL.createObjectURL(b), thumb: tv.toDataURL('image/jpeg', 0.7), w: cw, h: ch, size: b.size }); }, 'image/jpeg', 0.82);
        } catch (e) { reject(e); }
      }
      function viaImg() { var u = URL.createObjectURL(file), im = new Image(); im.onload = function () { fromSrc(im, im.naturalWidth, im.naturalHeight, function () { URL.revokeObjectURL(u); }); }; im.onerror = function () { URL.revokeObjectURL(u); reject(new Error('fail')); }; im.src = u; }
      if (window.createImageBitmap) createImageBitmap(file, { imageOrientation: 'from-image' }).then(function (b) { fromSrc(b, b.width, b.height, function () { if (b.close) b.close(); }); }, viaImg); else viaImg();
    });
  }
  function safeName(n) { return String(n || 'файл').replace(/[\u0000-\u001f<>]/g, '').slice(0, 60); }
  function isPdf(f) { return f.type === 'application/pdf' || /\.pdf$/i.test(f.name || ''); }
  function processPdf(file) {   // PDF не сжимаем, только проверяем размер и сигнатуру %PDF-
    return new Promise(function (resolve, reject) {
      if (!file.size) return reject(new Error('empty'));
      if (file.size > CFG.pdfMaxMB * 1048576) return reject(new Error('toobig'));
      file.slice(0, 5).arrayBuffer().then(function (b) {
        if (String.fromCharCode.apply(null, new Uint8Array(b)) !== '%PDF-') return reject(new Error('badtype'));
        resolve({ kind: 'pdf', name: safeName(file.name), size: file.size, blob: file, url: URL.createObjectURL(file) });
      }, function () { reject(new Error('fail')); });
    });
  }
  function processAny(file, allowPdf) {
    if (file && isPdf(file)) return allowPdf ? processPdf(file) : Promise.reject(new Error('notimage'));
    if (file && /^image\//.test(file.type)) return processImage(file);
    return Promise.reject(new Error(allowPdf ? 'badtype' : 'notimage'));
  }
  var FERR = { notimage: 'Это не фото. Выберите изображение.', badtype: 'Допустимы только фото и PDF.', empty: 'Файл пустой.', toobig: 'Файл слишком большой (PDF до ' + CFG.pdfMaxMB + ' МБ, фото до ' + CFG.imgSrcMaxMB + ' МБ).', fail: 'Не удалось обработать файл.' };
  function fileTile(f, alt, onRemove, tid) {
    var el = f.kind === 'pdf'
      ? h('div', { class: 'ph-item pdf', role: 'listitem', 'data-testid': tid, 'data-kind': 'pdf', 'data-size': f.size }, ico('file', 'lg'), h('span', { class: 'fn', text: f.name }), h('span', { class: 'sz num', text: 'PDF · ' + (f.size > 1048576 ? (f.size / 1048576).toFixed(1) + ' МБ' : kb(f.size)) }))
      : (!f.url && !f.thumb) ? h('div', { class: 'ph-item pdf', role: 'listitem', 'data-testid': tid, 'data-kind': 'image' }, ico('image', 'lg'), h('span', { class: 'fn', text: f.name || 'Фото' }), h('span', { class: 'sz num', text: 'Фото · у администратора' }))
      : h('figure', { class: 'ph-item', role: 'listitem', 'data-testid': tid, 'data-kind': 'image' }, h('img', { src: f.url || f.thumb, alt: alt, 'data-w': f.w, 'data-h': f.h, 'data-size': f.size }), h('span', { class: 'sz num', text: f.w + '×' + f.h + (f.blob ? ' · ' + kb(f.size) : '') }));
    if (onRemove) el.appendChild(h('button', { class: 'rm', type: 'button', 'aria-label': 'Удалить: ' + (f.kind === 'pdf' ? f.name : alt), 'data-testid': 'rm-' + tid, onclick: onRemove }, h('span', null, ico('x', 'sm'))));
    return el;
  }
  /* поле с файлами: камера / галерея / PDF, сжатие, превью, удаление */
  function fileSlot(o) {
    var items = [], cb = function () {};
    var grid = h('div', { class: 'photos', role: 'list', 'aria-label': o.title, 'data-testid': 'grid-' + o.id });
    var cam = h('input', { type: 'file', accept: 'image/*', capture: 'environment', class: 'sr-only', tabindex: '-1', 'aria-hidden': 'true', 'data-testid': 'in-' + o.id + '-camera' });
    var gal = o.gallery ? h('input', { type: 'file', accept: o.pdf ? 'image/*,application/pdf' : 'image/*', multiple: true, class: 'sr-only', tabindex: '-1', 'aria-hidden': 'true', 'data-testid': 'in-' + o.id + '-gallery' }) : null;
    var bCam = h('button', { class: 'addbtn', type: 'button', 'data-testid': 'btn-' + o.id + '-camera', onclick: function () { cam.click(); } }, ico('camera'), o.camLabel);
    var bGal = o.gallery ? h('button', { class: 'addbtn', type: 'button', 'data-testid': 'btn-' + o.id + '-gallery', onclick: function () { gal.click(); } }, ico(o.pdf ? 'file' : 'image'), o.galLabel) : null;
    function draw() {
      clear(grid);
      items.forEach(function (f, i) {
        if (f.busy) grid.appendChild(h('div', { class: 'ph-item ph-busy', role: 'listitem', 'aria-label': 'Обработка файла' }, h('span', { class: 'spinner' })));
        else grid.appendChild(fileTile(f, o.alt + ' ' + (i + 1), function () { if (f.url) URL.revokeObjectURL(f.url); items.splice(items.indexOf(f), 1); draw(); cb(); }, o.id + '-item'));
      });
      bCam.disabled = items.length >= o.max; if (bGal) bGal.disabled = items.length >= o.max;
    }
    function add(files) {
      [].slice.call(files).forEach(function (file) {
        if (items.length >= o.max) { toast('Не больше ' + o.max + ' файлов в этом поле', 'warn'); return; }
        var slot = { busy: true }; items.push(slot); draw(); cb();
        processAny(file, !!o.pdf).then(function (r) { Object.assign(slot, r); slot.busy = false; draw(); cb(); }, function (e) {
          items.splice(items.indexOf(slot), 1); draw(); cb(); toast(FERR[e.message] || FERR.fail, 'bad');
        });
      });
    }
    cam.addEventListener('change', function () { add(cam.files); cam.value = ''; });
    if (gal) gal.addEventListener('change', function () { add(gal.files); gal.value = ''; });
    draw();
    return {
      el: h('div', null, grid, h('div', { class: 'addrow' + (o.gallery ? '' : ' one') }, bCam, bGal), cam, gal, h('p', { class: 'help', text: o.help })),
      ready: function () { return items.filter(function (f) { return !f.busy; }); },
      busy: function () { return items.some(function (f) { return f.busy; }); },
      onChange: function (f) { cb = f; },
      release: function () { items.forEach(function (f) { if (f.url) URL.revokeObjectURL(f.url); }); }
    };
  }

  /* ---------- «Сообщить о порче / браке» ---------- */
  function reportBtn(id) {
    return h('button', { class: 'report', type: 'button', 'data-testid': id, onclick: openIncident },
      h('span', { class: 'ric' }, ico('alert')), h('span', { class: 'rt' }, h('b', { text: 'Сообщить о порче / браке' }), h('small', { text: 'Фото, акт и объяснительная — сразу после случая' })), ico('cr', 'sm'));
  }
  function openIncident() {
    if (!requireOnline()) return;
    var today = S.data.today, dr = load('pr.idraft', {}), sending = false, ctl, type = INC_TYPES[dr.type] ? dr.type : '';
    var date = h('input', { class: 'inp', type: 'date', id: 'inc-date', 'data-testid': 'inc-date', value: today, max: today, 'aria-required': 'true', 'aria-describedby': 'inc-date-err' });
    var dateErrEl = h('div', { class: 'err', id: 'inc-date-err', role: 'alert', hidden: true, 'data-testid': 'inc-date-err' });
    var seg = h('div', { class: 'seg tp', role: 'radiogroup', 'aria-label': 'Тип происшествия', 'data-testid': 'inc-type' });
    var desc = h('input', { class: 'inp', type: 'text', id: 'inc-desc', 'data-testid': 'inc-desc', maxlength: String(CFG.incDescMax), autocomplete: 'off', 'aria-required': 'true', 'aria-describedby': 'inc-desc-h', placeholder: 'Например: порвана плёнка на паллете №4471' });
    var text = h('textarea', { class: 'inp', id: 'inc-text', 'data-testid': 'inc-text', rows: '5', maxlength: '1000', 'aria-required': 'true', 'aria-describedby': 'inc-text-h', placeholder: 'Подробно: что произошло, когда, почему, кого поставили в известность.' });
    desc.value = dr.desc || ''; text.value = dr.text || '';
    var count = h('span', { 'data-testid': 'inc-count' });
    var slots = {
      scene: fileSlot({ id: 'scene', title: 'Фото места / нарушения', alt: 'Фото места', max: CFG.maxPhotos, camLabel: 'Снять на камеру', help: 'Только снимок с камеры, общий план места. Можно несколько: нажимайте кнопку снова. До ' + CFG.maxPhotos + ' шт.' }),
      damage: fileSlot({ id: 'damage', title: 'Фото порчи имущества', alt: 'Фото порчи', max: CFG.maxPhotos, gallery: true, camLabel: 'Сделать фото', galLabel: 'Из галереи', help: 'Крупным планом повреждение. До ' + CFG.maxPhotos + ' шт.' }),
      acts: fileSlot({ id: 'act', title: 'Акт', alt: 'Акт', max: CFG.maxActs, gallery: true, pdf: true, camLabel: 'Сфотографировать акт', galLabel: 'Фото или PDF', help: 'Фото/скан акта (картинка или PDF до ' + CFG.pdfMaxMB + ' МБ). Фото сжимаются автоматически, PDF — без изменений. До ' + CFG.maxActs + ' файлов.' })
    };
    var tags = {}; ['date', 'type', 'desc', 'scene', 'damage', 'act', 'text'].forEach(function (k) { tags[k] = h('span', { class: 'tag', 'data-testid': 'tag-' + k }); });
    var checks = h('ul', { class: 'checks', 'data-testid': 'inc-checks', 'aria-label': 'Что ещё нужно для отправки' });
    var sendBtn = h('button', { class: 'btn', type: 'button', 'data-testid': 'inc-send', 'aria-describedby': 'inc-why', disabled: true });
    function sendLabel() { clear(sendBtn); sendBtn.appendChild(ico('send', 'sm')); sendBtn.appendChild(document.createTextNode('Отправить')); }
    sendLabel();
    var why = h('p', { class: 'note-s', id: 'inc-why', 'data-testid': 'inc-why', role: 'status' });
    Object.keys(INC_TYPES).forEach(function (k) {
      seg.appendChild(h('button', { type: 'button', role: 'radio', 'data-type': k, 'aria-checked': type === k ? 'true' : 'false', onclick: function () { type = k; [].forEach.call(seg.children, function (b) { b.setAttribute('aria-checked', b.getAttribute('data-type') === k ? 'true' : 'false'); }); persist(); update(); } }, INC_TYPES[k]));
    });
    function persist() { store('pr.idraft', { type: type, desc: desc.value, text: text.value }); }
    function check(ok, t) { return h('li', { class: ok ? 'ok' : '' }, h('span', { class: 'cb' }, ok ? ico('check') : null), h('span', { text: t })); }
    function tag(k, ok) { tags[k].className = 'tag ' + (ok ? 'done' : 'must'); tags[k].textContent = ok ? 'Готово' : 'Обязательно'; }
    function update() {
      var de = dateErr(date.value, today), dl = desc.value.trim().length, tl = text.value.trim().length;
      var ok = { date: !de, type: !!type, desc: dl >= CFG.incDescMin, scene: slots.scene.ready().length > 0, damage: slots.damage.ready().length > 0, act: slots.acts.ready().length > 0, text: tl >= CFG.explMin };
      var busy = slots.scene.busy() || slots.damage.busy() || slots.acts.busy();
      dateErrEl.hidden = !de || !date.value && date.dataset.touched !== '1'; dateErrEl.textContent = de;
      date.setAttribute('aria-invalid', de && !dateErrEl.hidden ? 'true' : 'false');
      count.textContent = ok.text ? tl + ' симв. ✓' : tl + ' из ' + CFG.explMin + ' симв. минимум';
      clear(checks);
      checks.appendChild(check(ok.date, ok.date ? 'Дата: ' + dmy(date.value) : de));
      checks.appendChild(check(ok.type, ok.type ? 'Тип: ' + INC_TYPES[type] : 'Выберите тип: брак, порча имущества или другое'));
      checks.appendChild(check(ok.desc, ok.desc ? 'Описание написано' : 'Коротко опишите, что случилось (от ' + CFG.incDescMin + ' симв.)'));
      checks.appendChild(check(ok.scene, ok.scene ? 'Фото места: ' + slots.scene.ready().length : 'Снимите место нарушения на камеру (минимум 1 фото)'));
      checks.appendChild(check(ok.damage, ok.damage ? 'Фото порчи: ' + slots.damage.ready().length : 'Добавьте фото порчи имущества (минимум 1)'));
      checks.appendChild(check(ok.act, ok.act ? 'Акт приложен: ' + slots.acts.ready().length : 'Приложите акт — фото или PDF (минимум 1 файл)'));
      checks.appendChild(check(ok.text, ok.text ? 'Объяснительная написана' : 'Напишите объяснительную (ещё ' + (CFG.explMin - tl) + ' симв.)'));
      Object.keys(ok).forEach(function (k) { tag(k, ok[k]); });
      var miss = []; if (!ok.date) miss.push('исправьте дату'); if (!ok.type) miss.push('выберите тип'); if (!ok.desc) miss.push('опишите случай'); if (!ok.scene) miss.push('фото места'); if (!ok.damage) miss.push('фото порчи'); if (!ok.act) miss.push('акт'); if (!ok.text) miss.push('объяснительную');
      var all = Object.keys(ok).every(function (k) { return ok[k]; });
      sendBtn.disabled = !all || busy || sending;
      why.textContent = busy ? 'Обрабатываем файлы…' : miss.length ? 'Осталось заполнить: ' + miss.join(', ') + '.' : 'Всё готово — можно отправлять.';
    }
    Object.keys(slots).forEach(function (k) { slots[k].onChange(update); });
    date.addEventListener('input', function () { date.dataset.touched = '1'; update(); }); date.addEventListener('change', function () { date.dataset.touched = '1'; update(); });
    desc.addEventListener('input', function () { persist(); update(); }); text.addEventListener('input', function () { persist(); update(); });
    sendBtn.addEventListener('click', function () {
      if (sendBtn.disabled || !requireOnline()) return; sending = true; sendBtn.disabled = true; clear(sendBtn); sendBtn.appendChild(h('span', { class: 'spinner' })); sendBtn.appendChild(document.createTextNode(' Отправляем…'));
      delay(LAT + 300).then(function () { return backend.submitIncident({ rid: rid(), date: date.value, type: type, desc: desc.value, text: text.value, scene: slots.scene.ready(), damage: slots.damage.ready(), acts: slots.acts.ready() }); }).then(function (r) {
        if (!r.ok) { sending = false; sendLabel(); update(); toast(r.error === 'rate_limit' ? 'Слишком много сообщений за сутки' : netMsg(r.error) ? 'Не отправлено: ' + netMsg(r.error) : r.error === 'bad_file' ? 'Не отправлено: файл не подошёл (нужны фото JPG/PNG или PDF)' : r.error === 'too_big' ? 'Не отправлено: файл слишком большой' : 'Не отправлено: проверьте поля (' + r.error + ')', 'bad'); return; }
        localStorage.removeItem('pr.idraft'); localStorage.removeItem('pr.card'); Object.keys(slots).forEach(function (k) { slots[k].release(); });
        ctl.close(true); S.dedFilter = 'all'; toast('Сообщение отправлено. Статус — «Отправлено, ждёт проверки»');
        refresh().then(function () { if (location.hash !== '#/ded') location.hash = '#/ded'; });
      });
    });
    function sec(tk, titleEl, content, hintId, extra) { return h('div', { class: 'sec' }, h('div', { class: 'sec-h' }, titleEl, h('span', { class: 'req', 'aria-hidden': 'true', text: '*' }), tags[tk]), content, extra); }
    var body = h('div', null,
      h('div', { class: 'reqbanner', 'data-testid': 'req-banner' }, ico('alert'), h('div', null, h('b', { text: 'Заполните всё — иначе «Отправить» не сработает' }), h('span', { text: 'Нужны: дата, тип, описание, фото места (с камеры), фото порчи, акт и объяснительная.' }))),
      checks,
      sec('date', h('label', { for: 'inc-date', text: 'Дата нарушения' }), h('div', null, date, dateErrEl, h('p', { class: 'help', text: 'По умолчанию сегодня. Будущую дату указать нельзя.' }))),
      sec('type', h('span', { id: 'inc-type-l', text: 'Тип' }), seg),
      sec('desc', h('label', { for: 'inc-desc', text: 'Что случилось (коротко)' }), h('div', null, desc, h('p', { class: 'help', id: 'inc-desc-h', text: 'Одной фразой, от ' + CFG.incDescMin + ' символов.' }))),
      sec('scene', h('span', { text: 'Фото места / нарушения' }), slots.scene.el),
      sec('damage', h('span', { text: 'Фото порчи имущества' }), slots.damage.el),
      sec('act', h('span', { text: 'Акт (фото или PDF)' }), slots.acts.el),
      sec('text', h('label', { for: 'inc-text', text: 'Объяснительная' }), h('div', null, text, h('div', { class: 'row between' }, h('p', { class: 'help', id: 'inc-text-h', text: 'Минимум ' + CFG.explMin + ' символов.' }), h('p', { class: 'help num' }, count)))));
    ctl = openSheet({ title: 'Сообщить о порче / браке', body: body, footer: h('div', null, sendBtn, why), onClose: function () { Object.keys(slots).forEach(function (k) { slots[k].release(); }); } });
    update();
  }
  function incFilesLine(i) { return 'Фото места: ' + i.scene.length + ' · порча: ' + i.damage.length + ' · акт: ' + i.acts.length; }
  function retBox(reason, tid) {   // причина возврата объяснения (админ обязан её указать; пустая бывает только при ручной правке таблицы)
    return h('div', { class: 'incans warn', role: 'note', 'data-testid': tid }, ico('info', 'sm'),
      h('div', null, h('b', { text: 'Возвращено: что нужно исправить' }), h('span', { text: reason || 'Причина не указана. Уточните у администратора.' })));
  }
  function incAnswer(i, tid) {   // решение администратора: причина возврата/отказа
    if (i.status !== 'returned' && i.status !== 'rejected') return null;
    return h('div', { class: 'incans ' + (i.status === 'returned' ? 'warn' : 'bad'), role: 'note', 'data-testid': tid || 'inc-answer' }, ico(i.status === 'returned' ? 'info' : 'x', 'sm'),
      h('div', null, h('b', { text: i.status === 'returned' ? 'Что нужно исправить' : 'Причина отказа' }), h('span', { text: i.answer || 'Причина не указана — уточните у администратора.' })));
  }
  function incCard(i) {
    var st = INC_ST[i.status] || INC_ST.review;
    return h('article', { class: 'card case incident k-error', 'data-incident': i.id, 'data-status': i.status, 'aria-label': 'Сообщение: ' + INC_TYPES[i.type] + ', ' + i.desc + ', ' + st[0] },
      h('div', { class: 'hd' }, h('div', { class: 'kico' }, ico('alert')), h('div', { class: 'grow' }, h('div', { class: 'tt', text: i.desc }), h('div', { class: 'meta', text: INC_TYPES[i.type] + ' · ' + dmy(i.date) }))),
      h('div', { class: 'ft' }, h('div', { class: 'row between' }, chip(st[0], st[1], INC_ST_IC[i.status] || 'clock'), h('span', { class: 'cap', text: 'Отправлено ' + dmy(i.sentAt) })),
        incAnswer(i, 'inc-answer-card'),
        h('p', { class: 'cap', text: incFilesLine(i) }),
        h('button', { class: i.status === 'returned' ? 'btn' : 'btn ghost', type: 'button', 'data-testid': 'inc-open-' + i.id, onclick: function () { openIncView(i); } }, i.status === 'returned' ? 'Дополнить объяснение' : 'Открыть сообщение')));
  }
  function openIncView(i) {
    var st = INC_ST[i.status] || INC_ST.review, ctl, fix = i.status === 'returned', sending = false;
    function grp(t, a, alt) { var g = h('div', { class: 'photos', role: 'list', 'data-testid': 'view-' + alt }); a.forEach(function (f, k) { g.appendChild(fileTile(f, t + ' ' + (k + 1), null, 'v-' + alt)); }); return h('div', { class: 'sec' }, h('div', { class: 'sec-h', text: t + ' (' + a.length + ')' }), g); }
    var drafts = load('pr.iadd', {}), ta = null, cnt = null, send = null, why = null;
    if (fix) {
      ta = h('textarea', { class: 'inp', id: 'inc-add', 'data-testid': 'inc-add-text', rows: '5', maxlength: String(CFG.explMax), 'aria-required': 'true', 'aria-describedby': 'inc-add-h', placeholder: 'Что вы добавляете или исправляете — с учётом замечания администратора.' });
      ta.value = drafts[i.id] || '';
      cnt = h('p', { class: 'help num', 'data-testid': 'inc-add-count' });
      send = h('button', { class: 'btn', type: 'button', 'data-testid': 'inc-add-send', disabled: true }, ico('send', 'sm'), 'Отправить повторно');
      why = h('p', { class: 'note-s', role: 'status', 'data-testid': 'inc-add-why' });
      var upd = function () { var n = ta.value.trim().length, ok = n >= CFG.explMin; cnt.textContent = ok ? n + ' симв. ✓' : n + ' из ' + CFG.explMin + ' симв. минимум'; send.disabled = !ok || sending; why.textContent = ok ? 'Можно отправлять: статус снова станет «ждёт проверки».' : 'Напишите не меньше ' + CFG.explMin + ' символов.'; };
      ta.addEventListener('input', function () { var d = load('pr.iadd', {}); d[i.id] = ta.value; store('pr.iadd', d); upd(); });
      send.addEventListener('click', function () {
        if (send.disabled || !requireOnline()) return; sending = true; send.disabled = true; clear(send); send.appendChild(h('span', { class: 'spinner' })); send.appendChild(document.createTextNode(' Отправляем…'));
        delay(LAT + 200).then(function () { return backend.resubmitIncident(i.id, ta.value.trim()); }).then(function (r) {
          if (!r.ok) { sending = false; clear(send); send.appendChild(ico('send', 'sm')); send.appendChild(document.createTextNode('Отправить повторно')); upd();
            toast('Не отправлено: ' + (({ text_short: 'текст слишком короткий', text_long: 'текст слишком длинный', not_returned: 'сообщение уже не требует доработки', not_found: 'сообщение не найдено' })[r.error] || netMsg(r.error) || 'ошибка'), 'bad');
            if (r.error === 'not_returned' || r.error === 'not_found') { ctl.close(true); refresh(); } return; }
          var d = load('pr.iadd', {}); delete d[i.id]; store('pr.iadd', d);
          ctl.close(true); toast('Дополнение отправлено. Статус — «Отправлено, ждёт проверки»'); refresh();
        });
      });
      setTimeout(upd, 0);
    }
    ctl = openSheet({ title: 'Сообщение о происшествии', body: h('div', { class: 'gap16', 'data-testid': 'inc-view' },
      h('div', { class: 'casebox' }, h('b', { 'data-testid': 'v-desc', text: i.desc }), h('span', { class: 'num', text: INC_TYPES[i.type] + ' · ' + dmy(i.date) })),
      h('div', { class: 'row between' }, chip(st[0], st[1], INC_ST_IC[i.status] || 'clock'), h('span', { class: 'cap', text: 'Отправлено ' + dmy(i.sentAt) })),
      incAnswer(i, 'inc-answer'),
      grp('Фото места / нарушения', i.scene, 'scene'), grp('Фото порчи имущества', i.damage, 'damage'), grp('Акт', i.acts, 'act'),
      h('div', { class: 'sec' }, h('div', { class: 'sec-h', text: 'Объяснительная' }), h('div', { class: 'quote', 'data-testid': 'v-text', text: i.text })),
      i.addendum ? h('div', { class: 'sec' }, h('div', { class: 'sec-h', text: 'Ваше дополнение' }), h('div', { class: 'quote', 'data-testid': 'v-addendum', text: i.addendum })) : null,
      fix ? h('div', { class: 'sec', 'data-testid': 'inc-fix' }, h('div', { class: 'sec-h' }, h('label', { for: 'inc-add', text: 'Дополнить объяснение' }), h('span', { class: 'req', 'aria-hidden': 'true', text: '*' })), ta,
        h('div', { class: 'row between' }, h('p', { class: 'help', id: 'inc-add-h', text: 'Фото и прежний текст остаются, администратор увидит ваше дополнение.' }), cnt)) : null),
      footer: fix ? h('div', null, send, why, h('button', { class: 'btn ghost mt', type: 'button', onclick: function () { ctl.close(); } }, 'Закрыть')) : h('button', { class: 'btn ghost', type: 'button', onclick: function () { ctl.close(); } }, 'Закрыть') });
  }

  function openExplain(c) {
    if (!requireOnline()) return;
    var needPhoto = needPhotoOf(c), drafts = load('pr.drafts', {}), photos = [], sending = false, ctl;
    var ta = h('textarea', { class: 'inp', id: 'ex-text', 'data-testid': 'ex-text', rows: '5', maxlength: '1000', 'aria-required': 'true', 'aria-describedby': 'ex-hint', placeholder: 'Что произошло, когда и почему. Например: «Короб задел погрузчик при повороте, сообщил бригадиру сразу».' });
    ta.value = drafts[c.id] || '';
    var count = h('span', { id: 'ex-count', 'data-testid': 'ex-count' }), grid = h('div', { class: 'photos', 'data-testid': 'ph-grid', role: 'list', 'aria-label': 'Добавленные фото' });
    var checks = h('ul', { class: 'checks', 'data-testid': 'ex-checks', 'aria-label': 'Что ещё нужно для отправки' });
    var sendBtn = h('button', { class: 'btn', type: 'button', 'data-testid': 'ex-send', 'aria-describedby': 'ex-why', disabled: true });
    function sendLabel() { clear(sendBtn); sendBtn.appendChild(ico('send', 'sm')); sendBtn.appendChild(document.createTextNode('Отправить')); }
    sendLabel();
    var why = h('p', { class: 'note-s', id: 'ex-why', 'data-testid': 'ex-why', role: 'status' });
    var tagPh = h('span', { class: 'tag', 'data-testid': 'tag-photo' }), tagTx = h('span', { class: 'tag', 'data-testid': 'tag-text' });
    var fGal = h('input', { type: 'file', accept: 'image/*', multiple: true, class: 'sr-only', tabindex: '-1', 'aria-hidden': 'true', 'data-testid': 'file-gallery' });
    var fCam = h('input', { type: 'file', accept: 'image/*', capture: 'environment', class: 'sr-only', tabindex: '-1', 'aria-hidden': 'true', 'data-testid': 'file-camera' });
    var btnCam = h('button', { class: 'addbtn', type: 'button', 'data-testid': 'btn-camera', onclick: function () { fCam.click(); } }, ico('camera'), 'Сделать фото');
    var btnGal = h('button', { class: 'addbtn', type: 'button', 'data-testid': 'btn-gallery', onclick: function () { fGal.click(); } }, ico('image'), 'Из галереи');
    function check(ok, t) { return h('li', { class: ok ? 'ok' : '' }, h('span', { class: 'cb' }, ok ? ico('check') : null), h('span', { text: t })); }
    function update() {
      var t = ta.value.trim().length, okT = t >= CFG.explMin, nph = photos.filter(function (p) { return !p.busy; }).length, okP = !needPhoto || nph > 0, busy = photos.some(function (p) { return p.busy; });
      count.textContent = okT ? t + ' симв. ✓' : t + ' из ' + CFG.explMin + ' симв. минимум';
      clear(checks);
      if (needPhoto) checks.appendChild(check(nph > 0, nph > 0 ? 'Фото добавлено (' + nph + ')' : 'Добавьте фото повреждения (минимум 1)'));
      checks.appendChild(check(okT, okT ? 'Объяснительная написана' : 'Напишите объяснительную (ещё ' + (CFG.explMin - t) + ' симв.)'));
      tagPh.className = 'tag ' + (needPhoto ? (nph ? 'done' : 'must') : 'opt'); tagPh.textContent = needPhoto ? (nph ? 'Готово' : 'Обязательно') : 'По желанию';
      tagTx.className = 'tag ' + (okT ? 'done' : 'must'); tagTx.textContent = okT ? 'Готово' : 'Обязательно';
      sendBtn.disabled = !(okT && okP) || busy || sending;
      var miss = []; if (!okP) miss.push('добавьте фото'); if (!okT) miss.push('напишите объяснительную (ещё ' + (CFG.explMin - t) + ' симв.)');
      why.textContent = busy ? 'Обрабатываем фото…' : miss.length ? 'Чтобы отправить: ' + miss.join(' и ') + '.' : 'Всё готово — можно отправлять.';
      ta.setAttribute('aria-invalid', !okT && t > 0 ? 'true' : 'false');
      btnCam.disabled = btnGal.disabled = photos.length >= CFG.maxPhotos;
    }
    function drawPhotos() {
      clear(grid);
      photos.forEach(function (p, i) {
        grid.appendChild(p.busy ? h('div', { class: 'ph-item ph-busy', role: 'listitem', 'aria-label': 'Обработка фото' }, h('span', { class: 'spinner' }))
          : h('figure', { class: 'ph-item', role: 'listitem', 'data-testid': 'ph-item' }, h('img', { src: p.url, alt: 'Фото повреждения ' + (i + 1), 'data-w': p.w, 'data-h': p.h, 'data-size': p.size, 'data-type': p.blob ? p.blob.type : '' }),
            h('span', { class: 'sz num', text: p.w + '×' + p.h + ' · ' + kb(p.size) }),
            h('button', { class: 'rm', type: 'button', 'aria-label': 'Удалить фото ' + (i + 1), 'data-testid': 'ph-remove', onclick: function () { URL.revokeObjectURL(p.url); photos.splice(i, 1); drawPhotos(); update(); } }, h('span', null, ico('x', 'sm')))));
      });
    }
    function addFiles(files) {
      [].slice.call(files).forEach(function (f) {
        if (photos.length >= CFG.maxPhotos) { toast('Не больше ' + CFG.maxPhotos + ' фото', 'warn'); return; }
        var slot = { busy: true }; photos.push(slot); drawPhotos(); update();
        processImage(f).then(function (r) { Object.assign(slot, r); slot.busy = false; drawPhotos(); update(); }, function (e) {
          photos.splice(photos.indexOf(slot), 1); drawPhotos(); update(); toast(e.message === 'notimage' ? 'Это не изображение. Выберите фото.' : 'Не удалось обработать фото', 'bad');
        });
      });
    }
    fGal.addEventListener('change', function () { addFiles(fGal.files); fGal.value = ''; });
    fCam.addEventListener('change', function () { addFiles(fCam.files); fCam.value = ''; });
    ta.addEventListener('input', function () { var d = load('pr.drafts', {}); d[c.id] = ta.value; store('pr.drafts', d); update(); });
    sendBtn.addEventListener('click', function () {
      if (sendBtn.disabled || !requireOnline()) return; sending = true; sendBtn.disabled = true; clear(sendBtn); sendBtn.appendChild(h('span', { class: 'spinner' })); sendBtn.appendChild(document.createTextNode(' Отправляем…'));
      delay(LAT + 200).then(function () { return backend.submitExplanation(c.id, ta.value, photos.filter(function (p) { return !p.busy; })); }).then(function (r) {
        if (!r.ok) { sending = false; sendLabel(); update(); toast('Не отправлено: ' + ({ text_short: 'объяснительная слишком короткая', photo_required: 'нужно фото повреждения', already: 'уже отправлено', rate_limit: 'слишком много отправок за час', bad_file: 'файл не подошёл (нужны фото JPG/PNG)', too_big: 'файл слишком большой' }[r.error] || netMsg(r.error) || 'ошибка'), 'bad'); return; }
        var d = load('pr.drafts', {}); delete d[c.id]; store('pr.drafts', d);
        photos.forEach(function (p) { if (p.url) URL.revokeObjectURL(p.url); });
        ctl.close(true); toast('Объяснительная' + (photos.length ? ' и фото отправлены' : ' отправлена') + ' администратору'); refresh();
      });
    });
    var body = h('div', null,
      h('div', { class: 'casebox' }, h('b', { text: c.title }), h('span', { class: 'num', text: KIND[c.kind].n + ' · ' + dmy(c.date) + ' · ' + minus(c.amount) })),
      c.expl && c.expl.returned ? retBox(c.expl.returnedReason, 'ex-returned') : null,
      h('div', { class: 'reqbanner', 'data-testid': 'req-banner' }, ico('alert'), h('div', null, h('b', { text: needPhoto ? 'Обязательно: фото и объяснительная' : 'Обязательно: объяснительная' }), h('span', { text: needPhoto ? 'Кнопка «Отправить» станет активной, когда приложено хотя бы одно фото повреждения и написано объяснение.' : 'Фото можно приложить по желанию.' }))),
      checks,
      h('div', { class: 'sec' }, h('div', { class: 'sec-h' }, h('span', { text: needPhoto ? 'Фото повреждения' : 'Фото' }), needPhoto ? h('span', { class: 'req', 'aria-hidden': 'true', text: '*' }) : null, tagPh),
        grid, h('div', { class: 'addrow' }, btnCam, btnGal), fCam, fGal, h('p', { class: 'help', text: 'Снимите повреждение крупным планом. Фото уменьшается автоматически (до 1280 px). Не больше ' + CFG.maxPhotos + ' штук.' })),
      h('div', { class: 'sec' }, h('div', { class: 'sec-h' }, h('label', { for: 'ex-text', text: 'Объяснительная' }), h('span', { class: 'req', 'aria-hidden': 'true', text: '*' }), tagTx), ta,
        h('div', { class: 'row between' }, h('p', { class: 'help', id: 'ex-hint', text: 'Минимум ' + CFG.explMin + ' символов: что случилось и почему.' }), h('p', { class: 'help num' }, count))));
    ctl = openSheet({ title: 'Объяснить / приложить фото', body: body, footer: h('div', null, sendBtn, why), focus: function () { ta.value ? ta.focus() : (needPhoto ? btnCam.focus() : ta.focus()); } });
    drawPhotos(); update();
  }
  function openExplView(c) {
    var e = c.expl, st = EX_ST[e.status], ctl;
    var ph = h('div', { class: 'photos', role: 'list' });
    (e.photos || []).forEach(function (p, i) { ph.appendChild(h('figure', { class: 'ph-item', role: 'listitem' }, h('img', { src: p.thumb, alt: 'Приложенное фото ' + (i + 1) }), h('span', { class: 'sz num', text: p.w + '×' + p.h }))); });
    if (!(e.photos || []).length && e.photoCount) ph.appendChild(h('p', { class: 'cap', 'data-testid': 'expl-photo-count', text: 'Приложено фото: ' + e.photoCount + ' (хранятся у администратора).' }));
    ctl = openSheet({ title: 'Отправленное объяснение', body: h('div', { class: 'gap16' },
      h('div', { class: 'casebox' }, h('b', { text: c.title }), h('span', { class: 'num', text: KIND[c.kind].n + ' · ' + dmy(c.date) + ' · ' + minus(c.amount) })),
      h('div', { class: 'row between' }, chip(st[0], st[1], 'check'), h('span', { class: 'cap', text: 'Отправлено ' + dmy(e.sentAt) })),
      h('div', { class: 'sec' }, h('div', { class: 'sec-h', text: 'Фото' }), (e.photos || []).length || e.photoCount ? ph : h('p', { class: 'cap', text: 'Фото не прикладывалось (для этого случая не требуется).' })),
      h('div', { class: 'sec' }, h('div', { class: 'sec-h', text: 'Объяснительная' }), h('div', { class: 'quote', 'data-testid': 'expl-quote', text: e.text }))),
      footer: h('button', { class: 'btn ghost', type: 'button', onclick: function () { ctl.close(); } }, 'Закрыть') });
  }

  /* ---------- банк и карта для выплаты аванса ---------- */
  var BANKS = window.BANKS || [], BAPI = window.BANK_API || {}, CARDK = 'pr.card';
  function luhnOk(d) { var sm = 0, alt = false, i, n; if (!/^\d+$/.test(d)) return false; for (i = d.length - 1; i >= 0; i--) { n = d.charCodeAt(i) - 48; if (alt) { n *= 2; if (n > 9) n -= 9; } sm += n; alt = !alt; } return sm % 10 === 0; }
  function bankOk(v) { var t = String(v || '').replace(/\s+/g, ' ').trim().slice(0, 60); return t.length >= 2 && /^[A-Za-z\u0410-\u044f\u0401\u04510-9 .,'\u2019"\u00ab\u00bb&()\/+\u2116\-]+$/.test(t) ? t : ''; }
  function cardFmt(d) { return d.replace(/(\d{4})(?=\d)/g, '$1 '); }
  function bankOther() { return BANKS.filter(function (b) { return b.id === 'other'; })[0] || { id: 'other', name: 'Другой банк', color: '#566074', ini: '…' }; }
  function bankByName(nm) { var b = BAPI.byName ? BAPI.byName(nm) : null; return b || null; }
  function bankMark(b, cls) {   // реальный логотип из banks/ или аккуратный значок с цветом банка и инициалами
    if (b && b.logo) return h('img', { class: 'bk-logo ' + (cls || ''), src: b.logo, alt: '', width: '32', height: '32', decoding: 'async', 'data-bank': b.id });
    var el = h('span', { class: 'bk-ph ' + (cls || ''), 'aria-hidden': 'true', text: (b && b.ini) || '?', 'data-bank': b ? b.id : 'other' });
    if (b && b.color) el.style.background = b.color; return el;
  }
  function payLabel(bank, last4) { return bank + (last4 ? ' •••• ' + last4 : ''); }
  function payLine(a, tid) {   // «Сбербанк •••• 1234» с логотипом; полный номер сотруднику не показывается
    if (!a || !a.bank) return null;
    return h('div', { class: 'payline', 'data-testid': tid || 'pay-line' }, bankMark(bankByName(a.bank) || bankOther(), 'sm'), h('span', { text: 'Выплата на карту: ' + payLabel(a.bank, a.last4) }));
  }
  function payBlock(o) {   // o: { prev:{bank,last4}|null, required, disabled, onChange }
    var sel = null, otherName = '', digits = '', stored = null, touched = false, opened = false, prev = o.prev && o.prev.bank ? o.prev : null;
    try { stored = JSON.parse(localStorage.getItem(CARDK) || 'null'); } catch (e) { stored = null; }
    if (!stored || typeof stored !== 'object' || !luhnOk(String(stored.card || '')) || String(stored.card).length < 16) stored = null;
    function setByName(nm) { var b = bankByName(nm); if (b && b.id !== 'other') { sel = b; otherName = ''; } else if (nm) { sel = bankOther(); otherName = nm; } }
    if (prev) setByName(prev.bank);
    else if (stored) { var sb = BANKS.filter(function (b) { return b.id === stored.id; })[0]; if (sb) { sel = sb; otherName = sb.id === 'other' ? String(stored.other || '') : ''; digits = String(stored.card); } else stored = null; }
    var rem = !!stored && !prev;
    var btn = h('button', { type: 'button', class: 'bankbtn', id: 'pay-bank', 'data-testid': 'bank-btn', 'aria-haspopup': 'listbox', 'aria-expanded': 'false', disabled: !!o.disabled });
    var search = h('input', { class: 'inp bsearch', type: 'search', 'data-testid': 'bank-search', placeholder: 'Найти банк по названию', autocomplete: 'off', 'aria-label': 'Поиск банка' });
    var list = h('div', { class: 'blist', role: 'listbox', 'aria-label': 'Банки', 'data-testid': 'bank-list' });
    var panel = h('div', { class: 'bpanel', hidden: true, 'data-testid': 'bank-panel' }, search, list);
    var other = h('input', { class: 'inp', type: 'text', id: 'pay-other', 'data-testid': 'bank-other', maxlength: '60', autocomplete: 'off', placeholder: 'Название банка', 'aria-label': 'Название банка', disabled: !!o.disabled, hidden: true });
    var cardInp = h('input', { class: 'inp cardinp', type: 'text', id: 'pay-card', 'data-testid': 'card-num', inputmode: 'numeric', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', maxlength: '23', placeholder: prev && prev.last4 ? '•••• ' + prev.last4 + ' (оставьте пустым, чтобы не менять)' : '0000 0000 0000 0000', 'aria-describedby': 'card-err card-help', disabled: !!o.disabled });
    var cardErrEl = h('div', { class: 'err', id: 'card-err', role: 'alert', hidden: true, 'data-testid': 'card-err' });
    var bankErrEl = h('div', { class: 'err', role: 'alert', hidden: true, 'data-testid': 'bank-err' });
    var hint = h('div', { class: 'binhint', hidden: true, 'data-testid': 'bank-hint' });
    var chk = h('input', { type: 'checkbox', id: 'pay-rem', 'data-testid': 'card-remember', disabled: !!o.disabled }); chk.checked = rem;
    var need = h('p', { class: 'help', 'data-testid': 'pay-need', hidden: true });
    function bankName() { return !sel ? '' : sel.id === 'other' ? bankOk(otherName) : sel.name; }
    function err() {   // → { bank, card } тексты ошибок ('' = нормально)
      var any = !!sel || !!digits || !!otherName.trim(), must = !!o.required || any, e = { bank: '', card: '' };
      if (!must) return e;
      if (!sel) e.bank = 'Выберите банк'; else if (sel.id === 'other' && !bankOk(otherName)) e.bank = 'Впишите название банка (2–60 знаков, без лишних символов)';
      if (!digits) { if (!(prev && prev.last4)) e.card = 'Введите номер карты'; }
      else if (digits.length < 16) e.card = 'В номере карты от 16 до 19 цифр, сейчас ' + digits.length;
      else if (!luhnOk(digits)) e.card = 'Номер введён с ошибкой: проверьте цифры';
      return e;
    }
    function ok() { var e = err(); return !e.bank && !e.card; }
    function paint() {
      var bkey = sel ? sel.id : '';
      if (btn.getAttribute('data-key') !== bkey || !btn.firstChild) {   // кнопку перерисовываем только при смене банка: иначе тап, начатый во время blur поля карты, теряется
        clear(btn); btn.setAttribute('data-key', bkey); btn.appendChild(sel ? bankMark(sel) : h('span', { class: 'bk-ph empty', 'aria-hidden': 'true', text: '?' }));
        btn.appendChild(h('span', { class: 'bn', 'data-testid': 'bank-sel', text: sel ? (sel.id === 'other' ? 'Другой банк' : sel.name) : 'Выберите банк' })); btn.appendChild(ico('cd', 'sm'));
      }
      btn.setAttribute('aria-expanded', opened ? 'true' : 'false'); panel.hidden = !opened;
      other.hidden = !(sel && sel.id === 'other');
      var e = err(), showC = (touched || digits.length >= 16) && !!e.card, showB = touched && !!e.bank;
      cardErrEl.hidden = !showC; clear(cardErrEl); if (showC) { cardErrEl.appendChild(ico('alert', 'sm')); cardErrEl.appendChild(document.createTextNode(e.card)); }
      bankErrEl.hidden = !showB; clear(bankErrEl); if (showB) { bankErrEl.appendChild(ico('alert', 'sm')); bankErrEl.appendChild(document.createTextNode(e.bank)); }
      cardInp.setAttribute('aria-invalid', showC ? 'true' : 'false');
      var g = BAPI.byBin ? BAPI.byBin(digits) : null, hk = g && !(sel && sel.id === g.id) ? g.id : '';
      if (hint.getAttribute('data-key') !== hk) {   // подсказку не перерисовываем зря: тап по «Выбрать» во время blur поля карты не должен теряться
        clear(hint); hint.setAttribute('data-key', hk);
        if (hk) {
          hint.appendChild(bankMark(g, 'sm')); hint.appendChild(h('span', { text: 'Похоже на карту банка «' + g.name + '». Это только подсказка, проверьте.' }));
          hint.appendChild(h('button', { type: 'button', class: 'qbtn', 'data-testid': 'bank-hint-pick', onclick: function () { pick(g); } }, 'Выбрать'));
        }
      }
      hint.hidden = !hk;
      var msg = ok() ? '' : (!sel && !digits ? 'Чтобы отправить заказ, выберите банк и введите номер карты.' : !sel ? 'Выберите банк.' : !digits && !(prev && prev.last4) ? 'Введите номер карты.' : 'Проверьте данные карты.');
      need.hidden = !msg; need.textContent = msg;
    }
    function changed() { paint(); if (o.onChange) o.onChange(); }
    function pick(b) { sel = b; if (b.id !== 'other') otherName = ''; opened = false; paint(); if (o.onChange) o.onChange(); if (b.id === 'other') other.focus(); else btn.focus(); }
    function renderList() {
      var q = search.value, n = 0; clear(list);
      BANKS.forEach(function (b) {
        if (b.id === 'other' || (BAPI.match && !BAPI.match(b, q))) return; n++;
        list.appendChild(h('button', { type: 'button', role: 'option', class: 'bopt', 'aria-selected': sel && sel.id === b.id ? 'true' : 'false', 'data-testid': 'bank-opt-' + b.id, onclick: function () { pick(b); } }, bankMark(b), h('span', { class: 'bn', text: b.name })));
      });
      if (!n) list.appendChild(h('p', { class: 'help', 'data-testid': 'bank-none', text: 'Такого банка нет в списке. Выберите «Другой банк» и впишите название.' }));
      var ot = bankOther(); list.appendChild(h('button', { type: 'button', role: 'option', class: 'bopt other', 'aria-selected': sel && sel.id === 'other' ? 'true' : 'false', 'data-testid': 'bank-opt-other', onclick: function () { pick(ot); } }, bankMark(ot), h('span', { class: 'bn', text: 'Другой банк (впишу название)' })));
    }
    btn.addEventListener('click', function () { opened = !opened; paint(); if (opened) { search.value = ''; renderList(); search.focus(); } });
    search.addEventListener('input', renderList);
    panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); opened = false; paint(); btn.focus(); } });
    other.value = otherName; other.addEventListener('input', function () { otherName = other.value; changed(); });
    cardInp.value = cardFmt(digits);
    cardInp.addEventListener('input', function () {
      var pos = cardInp.selectionStart || 0, before = cardInp.value.slice(0, pos).replace(/\D/g, '').length;
      digits = cardInp.value.replace(/\D/g, '').slice(0, 19); var f = cardFmt(digits); cardInp.value = f;
      var np = 0, c = 0; while (np < f.length && c < before) { if (/\d/.test(f.charAt(np))) c++; np++; } try { cardInp.setSelectionRange(np, np); } catch (e) { /* не поддерживается */ }
      changed();
    });
    cardInp.addEventListener('blur', function () { touched = true; paint(); if (o.onChange) o.onChange(); });
    var wrap = h('div', { class: 'paybox gap12', 'data-testid': 'pay-box' },
      h('div', { class: 'field' }, h('label', { class: 'l', for: 'pay-bank' }, 'Банк для выплаты ', h('span', { text: o.required ? 'обязательно' : 'необязательно' })), btn, panel, h('div', { class: 'mt8' }, other), bankErrEl),
      h('div', { class: 'field' }, h('label', { class: 'l', for: 'pay-card' }, 'Номер карты ', h('span', { text: '16–19 цифр' })), cardInp, cardErrEl, hint,
        h('p', { class: 'help', id: 'card-help', text: prev && prev.last4 ? 'Сейчас указана карта •••• ' + prev.last4 + '. Введите новый номер, только если хотите её заменить.' : 'Только ваша карта. После отправки в приложении будут видны лишь последние 4 цифры.' })),
      h('label', { class: 'agree', for: 'pay-rem' }, chk, h('span', { text: 'Запомнить на этом телефоне' })),
      h('p', { class: 'help', 'data-testid': 'card-remember-note', text: 'Банк и номер карты сохранятся в памяти этого телефона, чтобы подставляться в новые заявки. Не включайте на чужом или общем телефоне. Снять запоминание: уберите галочку и отправьте заявку, либо выйдите из кабинета.' }), need);
    paint();
    return {
      el: wrap, ok: ok,
      value: function () { return { bank: bankName(), card: digits }; },
      label: function () { var b = bankName() || (prev && prev.bank) || ''; var l4 = digits ? digits.slice(-4) : (prev && prev.last4) || ''; return b ? payLabel(b, l4) : ''; },
      persist: function () {   // после успешной отправки: запомнить или стереть
        try {
          if (chk.checked && sel && digits) localStorage.setItem(CARDK, JSON.stringify({ id: sel.id, other: sel.id === 'other' ? otherName : '', card: digits }));
          else if (!chk.checked) localStorage.removeItem(CARDK);
        } catch (e) { /* хранилище недоступно */ }
      }
    };
  }

  /* ---------- аванс (еженедельный) ---------- */
  function whyLines(i) {
    var L = [];
    if (i.earned === 0) L.push(['Ещё не заработано', 'Доступная сумма растёт с каждой отработанной сменой.']);
    if (i.riskN) L.push(['Удержано под ' + i.riskN + ' ' + plural(i.riskN, ['незакрытый случай', 'незакрытых случая', 'незакрытых случаев']) + ': −' + money(i.risk), 'Случаи порчи/брака без объяснения или без проверки резервируются, пока не закрыты.']);
    if (i.carry) L.push(['Перенос долга с прошлого периода: −' + money(i.carry), 'Он сначала погашается из аванса.']);
    if (i.binding === 'limit' && i.capLimit <= 0) L.push(['Лимит недели исчерпан', 'Новый лимит откроется в понедельник.']);
    else if (i.binding === 'limit' && i.available > 0) L.push(['Упёрлись в лимит недели ' + money(i.limit), 'Заработано достаточно, но недельный потолок ограничивает сумму.']);
    if (i.earned > 0 && i.capEarn > 0 && i.binding === 'earn' && !i.riskN && !i.carry) L.push(['Аванс — ' + Math.round(CFG.advShare * 100) + '% от заработанного за неделю', 'Остальное выплатят при расчёте за период.']);
    return L;
  }
  function advMoneyRow(k, v, tid, strong) { return h('div', { class: 'arow' + (strong ? ' strong' : '') }, h('span', { text: k }), h('b', { class: 'num', 'data-testid': tid, text: v })); }
  function advSummary(i, compact) {
    var w = i.w, lim = i.limit, avW = Math.min(i.available, Math.max(0, lim - i.ordered));
    var bar = h('div', { class: 'stackbar adv', role: 'img', 'aria-label': 'Лимит недели ' + money(lim) + ': заказано ' + money(i.ordered) + ', доступно ' + money(avW) }, i.ordered ? h('i', { class: 'seg-ord', 'data-w': i.ordered }) : null, avW ? h('i', { class: 'seg-av', 'data-w': avW }) : null, lim - i.ordered - avW > 0 ? h('i', { class: 'seg-rest', 'data-w': lim - i.ordered - avW }) : null);
    var el = h('div', null,
      h('div', { class: 'avail num', 'data-testid': 'available', text: money(i.available) }),
      h('p', { class: 'cap', text: 'доступно к заказу сейчас' }),
      bar,
      h('div', { class: 'legend' }, h('span', null, h('i', { class: 'lg-ord' }), 'заказано ' + money(i.ordered)), h('span', null, h('i', { class: 'lg-av' }), 'доступно ' + money(avW)), h('span', null, h('i', { class: 'lg-rest' }), 'недоступно')));
    if (!compact) {
      el.appendChild(h('div', { class: 'arows' }, advMoneyRow('Заработано за неделю', money(i.earned), 'adv-earned'), advMoneyRow('Лимит недели', money(lim), 'adv-limit'), advMoneyRow('Уже заказано', money(i.ordered), 'adv-ordered'), advMoneyRow('Доступно сейчас', money(i.available), 'adv-avail-row', true)));
    }
    el.appendChild(h('div', { class: 'dates' }, h('div', null, ico('wallet', 'sm'), h('span', { 'data-testid': 'adv-pay', text: 'Выдача: суббота, ' + dlong(w.pay) })), h('div', null, ico('clock', 'sm'), h('span', { 'data-testid': 'adv-deadline', text: 'Заказ принимается до пятницы ' + hh(CFG.advDeadlineHour) + (compact ? '' : ' (' + dlong(w.deadline) + ')') }))));
    return el;
  }
  function advHomeCard() {
    var i = advInfo(S.data, S.calc);
    return h('section', { class: 'card advhome', 'aria-labelledby': 'ah-h', 'data-testid': 'adv-home' }, h('div', { class: 'card-h' }, h('h2', { id: 'ah-h', text: 'Аванс на неделю' }), chip(dm(i.w.wk) + ' – ' + dm(i.w.wkEnd), 'gray')),
      advSummary(i, true),
      h('div', { class: 'row adv-foot' }, h('span', { class: 'cap grow num', text: 'Заработано за неделю ' + money(i.earned) + ' · лимит ' + money(i.limit) }), h('a', { class: 'link', href: '#/adv', 'data-testid': 'adv-home-link' }, i.closed ? 'Подробнее' : 'Заказать')));
  }
  function viewAdv() {
    var d = S.data, info = advInfo(d, S.calc), v = h('main', { class: 'view stack', id: 'main' }), online = navigator.onLine !== false, w = info.w;
    var active = info.active, editing = !!S.advEdit && !!active && !info.closed;
    var fi = editing ? advInfo(d, S.calc, active.id) : info;      // при изменении заказа его сумма возвращается в доступное
    v.appendChild(pageTop('Аванс', 'Еженедельный, выдача по субботам'));
    var card = h('section', { class: 'card', 'aria-labelledby': 'av-h', 'data-testid': 'adv-card' }, h('div', { class: 'card-h' }, h('h2', { id: 'av-h', text: 'Неделя ' + dm(w.wk) + ' – ' + dm(w.wkEnd) }), chip(info.closed ? 'Приём закрыт' : 'Приём открыт', info.closed ? 'bad' : 'ok', info.closed ? 'lock' : 'check')), advSummary(info, false));
    var why = whyLines(info);
    if (why.length) { var wb = h('div', { class: 'why', 'data-testid': 'adv-why' }, h('div', { class: 't' }, ico('info', 'sm'), info.available < info.limit ? 'Почему доступно меньше лимита' : 'Как это считается'));
      why.forEach(function (x) { wb.appendChild(h('p', null, h('b', { text: x[0] }), h('span', { text: x[1] }))); }); card.appendChild(wb); }
    card.appendChild(h('details', { class: 'calc', 'data-testid': 'adv-calc' }, h('summary', { text: 'Расчёт по шагам' }),
      h('div', { class: 'arows num' }, advMoneyRow('Заработано за неделю × ' + Math.round(CFG.advShare * 100) + '%', money(info.earnCap)), advMoneyRow('− резерв под незакрытые случаи', minus(info.risk)), advMoneyRow('− перенос долга', minus(info.carry)), advMoneyRow('− уже заказано', minus(info.ordered)), advMoneyRow('= по выработке', money(Math.max(0, info.capEarn))),
        advMoneyRow('Лимит недели − заказано', money(Math.max(0, info.capLimit))), advMoneyRow('Меньшее, вниз до ' + CFG.advStep + ' ₽', money(info.available), 'adv-calc-final', true))));
    v.appendChild(card);
    // --- активная заявка ---
    if (active && !editing) {
      var st = ADV_ST[active.status];
      v.appendChild(h('section', { class: 'card', 'aria-labelledby': 'ac-h', 'data-testid': 'adv-active' }, h('div', { class: 'card-h' }, h('h2', { id: 'ac-h', text: 'Ваш заказ на неделю' }), chip(st[0], st[1], 'clock')),
        h('div', { class: 'avail num', text: money(active.amount) }), h('p', { class: 'cap', text: 'Выдача в субботу, ' + dlong(active.payDate || w.pay) + (active.comment ? ' · «' + active.comment + '»' : '') }), payLine(active, 'adv-active-pay'),
        info.closed ? h('p', { class: 'help', text: 'Приём закрыт — изменить или отменить заказ уже нельзя.' })
          : h('div', { class: 'btnrow mt' }, h('button', { class: 'btn secondary', type: 'button', 'data-testid': 'adv-edit', onclick: function () { S.advEdit = true; render(); } }, 'Изменить'), h('button', { class: 'btn danger', type: 'button', 'data-testid': 'adv-cancel', onclick: function () {
            confirmDlg({ title: 'Отменить заказ аванса?', yes: 'Да, отменить', no: 'Нет, оставить', danger: true, body: [h('p', { class: 'cap', text: 'Заказ на ' + money(active.amount) + ' будет отменён. Новый можно оформить до пятницы ' + hh(CFG.advDeadlineHour) + '.' })] }).then(function (ok) {
              if (!ok) return; delay(LAT).then(function () { return backend.cancelAdvance(active.id); }).then(function (r) { toast(r.ok ? 'Заказ отменён' : 'Не удалось отменить: ' + (r.error === 'closed' ? 'приём закрыт' : netMsg(r.error) || 'ошибка' + (r.error ? ' (' + r.error + ')' : '')), r.ok ? 'ok' : 'bad'); refresh(); }); }); } }, 'Отменить заказ'))));
    }
    // --- форма / закрыто ---
    if (info.closed) {
      v.appendChild(h('section', { class: 'card closed', 'aria-labelledby': 'cl-h', 'data-testid': 'adv-closed' }, h('div', { class: 'card-h' }, h('h2', { id: 'cl-h', text: 'Приём заказов закрыт' }), ico('lock')),
        h('p', { class: 'cap', text: 'Заказы на эту неделю принимались до пятницы ' + dlong(w.deadline) + ', ' + hh(CFG.advDeadlineHour) + '.' + (active ? ' Ваш заказ на ' + money(active.amount) + ' будет обработан к выдаче в субботу.' : ' Заказа на эту неделю не было.') }),
        h('div', { class: 'tipbox' }, ico('clock', 'sm'), h('span', { 'data-testid': 'adv-next', text: 'Следующее окно: с понедельника ' + dlong(w.nextWk) + ' до пятницы ' + dlong(w.nextDeadline) + ', ' + hh(CFG.advDeadlineHour) + '. Выдача в субботу, ' + dlong(w.nextPay) + '.' }))));
    } else if (!active || editing) {
      var blocked = !online ? 'Нет сети — заказать аванс можно только онлайн.' : fi.available < CFG.advMin ? (fi.earned === 0 ? 'Пока ничего не заработано за эту неделю — аванс станет доступен после первой смены.' : 'Сейчас доступно меньше ' + money(CFG.advMin) + ' — причины указаны выше. Сумма вырастет после новых смен или закрытия случаев.') : null;
      var pay, form = h('form', { class: 'card gap16', novalidate: true, 'aria-labelledby': 'rq-h', 'data-testid': 'adv-form' });
      form.appendChild(h('h2', { id: 'rq-h', text: editing ? 'Изменить заказ' : 'Заказать аванс' }));
      var inp = h('input', { class: 'inp', id: 'adv-amt', 'data-testid': 'adv-amount', type: 'text', inputmode: 'numeric', autocomplete: 'off', placeholder: '0', 'aria-describedby': 'adv-err adv-help', disabled: !!blocked });
      var err = h('div', { class: 'err', id: 'adv-err', role: 'alert', hidden: true, 'data-testid': 'adv-err' });
      var rng = !blocked ? h('input', { class: 'range', type: 'range', min: String(CFG.advMin), max: String(fi.available), step: String(CFG.advStep), value: String(editing ? Math.min(active.amount, fi.available) : CFG.advMin), 'aria-label': 'Сумма аванса, ползунок', 'data-testid': 'adv-range' }) : null;
      var left = h('b', { class: 'num', 'data-testid': 'adv-left' });
      var ta = h('textarea', { class: 'inp', id: 'adv-cm', 'data-testid': 'adv-comment', rows: '2', maxlength: String(CFG.commentMax), placeholder: 'Например: на оплату жилья', disabled: !!blocked }); if (editing) ta.value = active.comment || '';
      var cnt = h('span', { class: 'num', text: ta.value.length + ' / ' + CFG.commentMax });
      var btn = h('button', { class: 'btn', type: 'submit', 'data-testid': 'adv-submit', disabled: true }, ico('wallet', 'sm'), editing ? 'Сохранить изменения' : 'Заказать аванс');
      function amt() { return +(inp.value.replace(/\D/g, '') || 0); }
      function validate(show) {
        var a = amt(), e = '';
        if (!a) e = 'Введите сумму'; else if (a < CFG.advMin) e = 'Минимальная сумма — ' + money(CFG.advMin); else if (a % CFG.advStep) e = 'Сумма кратна ' + CFG.advStep + ' ₽ (например ' + money(Math.floor(a / CFG.advStep) * CFG.advStep || CFG.advStep) + ')'; else if (a > fi.available) e = 'Нельзя больше доступного: ' + money(fi.available);
        var vis = show && !!e && a > 0; err.hidden = !vis; clear(err); if (e) { err.appendChild(ico('alert', 'sm')); err.appendChild(document.createTextNode(e)); }
        inp.setAttribute('aria-invalid', vis ? 'true' : 'false'); btn.disabled = !!e || !!blocked || !(typeof pay === 'undefined' || pay.ok());
        left.textContent = money(Math.max(0, fi.available - (e ? 0 : a))); if (rng && a >= CFG.advMin && a <= fi.available) rng.value = String(a); return !e;
      }
      inp.addEventListener('input', function () { var a = amt(); inp.value = a ? num(a).replace(/\u00a0/g, ' ') : ''; validate(true); });
      if (rng) rng.addEventListener('input', function () { inp.value = num(+rng.value).replace(/\u00a0/g, ' '); validate(true); });
      ta.addEventListener('input', function () { cnt.textContent = ta.value.length + ' / ' + CFG.commentMax; });
      var quick = h('div', { class: 'quick', role: 'group', 'aria-label': 'Быстрый выбор суммы' });
      [1000, 2000, 5000].filter(function (x) { return x < fi.available; }).concat(fi.available >= CFG.advMin ? [fi.available] : []).forEach(function (x) {
        quick.appendChild(h('button', { class: 'qbtn', type: 'button', disabled: !!blocked, 'data-testid': 'quick-' + x, onclick: function () { inp.value = num(x).replace(/\u00a0/g, ' '); validate(true); inp.focus(); } }, x === fi.available ? 'Максимум ' + num(x) : num(x)));
      });
      form.appendChild(h('div', { class: 'field' }, h('label', { class: 'l', for: 'adv-amt', text: 'Сумма' }), h('div', { class: 'amount' }, inp, h('span', { class: 'cur', 'aria-hidden': 'true', text: '₽' })), err,
        rng ? h('div', { class: 'rangew' }, h('span', { class: 'num', text: num(CFG.advMin) }), rng, h('span', { class: 'num', text: num(fi.available) })) : null,
        h('p', { class: 'help', id: 'adv-help' }, 'Шаг ' + CFG.advStep + ' ₽, не больше ' + money(fi.available) + '. Останется доступно после заказа: ', left), quick));
      form.appendChild(h('div', { class: 'field' }, h('label', { class: 'l', for: 'adv-cm' }, 'Комментарий ', h('span', { text: 'необязательно' })), ta, h('div', { class: 'help row between' }, h('span', { text: 'Для чего нужны деньги' }), cnt)));
      var pay = payBlock({ prev: editing ? active : null, required: !!CFG.cardRequired, disabled: !!blocked, onChange: function () { validate(false); } });
      form.appendChild(pay.el);
      if (blocked) form.appendChild(h('div', { class: 'alert info', 'data-testid': 'adv-blocked' }, ico('info'), h('div', null, h('span', { text: blocked }))));
      if (editing) form.appendChild(h('button', { class: 'btn ghost', type: 'button', 'data-testid': 'adv-edit-cancel', onclick: function () { S.advEdit = false; render(); } }, 'Не менять'));
      form.appendChild(btn);
      if (editing) { inp.value = num(active.amount).replace(/\u00a0/g, ' '); }
      validate(false);
      form.addEventListener('submit', function (e) {
        e.preventDefault(); if (!validate(true) || !requireOnline()) return;
        var a = amt();
        confirmDlg({ title: editing ? 'Изменить заказ аванса?' : 'Отправить заказ на аванс?', yes: editing ? 'Да, изменить' : 'Да, заказать', no: 'Отмена', body: [
          h('div', { class: 'casebox' }, h('b', { class: 'num', 'data-testid': 'confirm-amount', text: money(a) }), h('span', { text: 'Выдача в субботу, ' + dlong(w.pay) + (ta.value.trim() ? ' · ' + ta.value.trim() : '') })),
          pay.label() ? h('p', { class: 'cap', 'data-testid': 'confirm-pay', text: 'Выплата на карту: ' + pay.label() }) : null,
          h('p', { class: 'cap num', 'data-testid': 'confirm-left', text: 'После заказа останется доступно: ' + money(fi.available - a) + '.' }),
          h('p', { class: 'cap', text: 'Заказ можно изменить или отменить до пятницы ' + hh(CFG.advDeadlineHour) + '. Аванс не гарантирован: итог сверяется при расчёте.' })] })
          .then(function (ok) {
            if (!ok) return; btn.disabled = true;
            delay(LAT).then(function () { return editing ? backend.updateAdvance(active.id, a, ta.value.trim(), pay.value()) : backend.createAdvance(a, ta.value.trim(), pay.value()); }).then(function (r) {
              if (!r.ok) { toast('Не отправлено: ' + ({ active: 'на этой неделе уже есть заказ', bad_amount: 'неверная сумма', over_limit: 'сумма больше доступной', closed: 'приём на неделю закрыт', not_found: 'заказ не найден', bad_bank: 'проверьте название банка', bad_card: 'проверьте номер карты' }[r.error] || netMsg(r.error) || 'ошибка'), 'bad'); S.advEdit = false; return refresh(); }
              pay.persist(); S.advEdit = false; toast(editing ? 'Заказ изменён — «На рассмотрении»' : 'Заказ на ' + money(a) + ' отправлен — «На рассмотрении»'); refresh();
            });
          });
      });
      v.appendChild(form);
    }
    v.appendChild(h('p', { class: 'fine', 'data-testid': 'adv-fine', text: 'Аванс не гарантирован: итоговая сумма сверяется при расчёте, вычеты за брак и ущерб удерживаются.' }));
    var hist = h('section', { class: 'card', 'aria-labelledby': 'hs-h', 'data-testid': 'adv-history' }, h('div', { class: 'card-h' }, h('h2', { id: 'hs-h', text: 'История заказов' })));
    if (!d.advances.length) hist.appendChild(emptyState('wallet', 'Заказов пока нет', 'Когда закажете аванс, он появится здесь.'));
    else { var ul = h('div', { class: 'gap16', role: 'list' });
      d.advances.slice().sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? 1 : -1; }).forEach(function (a) {
        var st = ADV_ST[a.status];
        ul.appendChild(h('div', { class: 'hist', role: 'listitem', 'data-status': a.status }, h('div', { class: 'grow' }, h('div', { class: 'row between' }, h('span', { class: 'am num', 'data-testid': 'adv-hist-amt', text: money(a.amount) }), chip(a.status === 'issued' ? 'Выдан в субботу' : st[0], st[1], a.status === 'issued' ? 'check' : a.status === 'rejected' || a.status === 'cancelled' ? 'x' : 'clock')),
          h('div', { class: 'cap', text: 'Заказ ' + dmy(a.date) + ' в ' + a.time + (a.payDate ? ' · выдача ' + dm(a.payDate) : '') }), a.status === 'issued' && a.requested > 0 && a.requested !== a.amount ? h('div', { class: 'cap', 'data-testid': 'adv-hist-req', text: 'Выдано ' + money(a.amount) + ', вы запрашивали ' + money(a.requested) }) : null, a.comment ? h('div', { class: 'cm', text: '«' + a.comment + '»' }) : null, payLine(a, 'adv-hist-pay'), a.answer || a.status === 'rejected' ? h('div', { class: 'ans', 'data-testid': 'adv-answer', text: (a.status === 'rejected' ? 'Причина: ' : 'Ответ: ') + (a.answer || 'не указана, уточните у администратора') }) : null)));
      }); hist.appendChild(ul); }
    v.appendChild(hist);
    applyWidths(v); return v;
  }

  /* ---------- профиль ---------- */
  function viewMe() {
    var u = S.data.user, pref = load('pr.theme', 'auto'), v = h('main', { class: 'view stack', id: 'main' });
    v.appendChild(pageTop('Профиль'));
    v.appendChild(h('section', { class: 'card', 'aria-label': 'Данные исполнителя' }, h('div', { class: 'row prof' }, h('div', { class: 'avatar', 'aria-hidden': 'true', text: u.name.split(' ').slice(0, 2).map(function (x) { return x[0]; }).join('') }), h('div', { class: 'grow' }, h('h2', { 'data-testid': 'me-name', text: u.name }), h('p', { class: 'cap', text: u.position }))),
      h('div', null, h('div', { class: 'line' }, h('div', { class: 'nm', text: 'Табельный №' }), h('div', { class: 'am num', text: u.id })),
        h('div', { class: 'line' }, h('div', { class: 'nm', text: 'Телефон' }), h('div', { class: 'am num', text: maskPhone(u.phone) })),
        h('div', { class: 'line' }, h('div', { class: 'nm', text: 'Объект' }), h('div', { class: 'am', text: u.site })),
        h('div', { class: 'line' }, h('div', { class: 'nm', text: 'Работодатель' }), h('div', { class: 'am', text: u.employer })))));
    var seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Тема оформления' });
    [['auto', 'Авто'], ['light', 'Светлая'], ['dark', 'Тёмная']].forEach(function (x) { seg.appendChild(h('button', { type: 'button', 'aria-pressed': pref === x[0] ? 'true' : 'false', 'data-theme-set': x[0], onclick: function () { setTheme(x[0]); render(); } }, x[1])); });
    v.appendChild(moreTiles());
    v.appendChild(h('a', { class: 'btn ghost mydata-link', href: '#/mydata', 'data-testid': 'open-mydata' }, ico('lock', 'sm'), 'Мои данные и согласие'));
    v.appendChild(h('section', { class: 'card gap12', 'aria-labelledby': 'th-h' }, h('h2', { id: 'th-h', text: 'Оформление' }), seg));
    v.appendChild(h('section', { class: 'card gap8', 'aria-labelledby': 'ds-h' }, h('h2', { id: 'ds-h', text: 'Данные' }),
      h('p', { class: 'cap', 'data-testid': 'synced', text: (S.stale ? 'Показаны сохранённые данные (нет сети). ' : 'Данные актуальны. ') + 'Обновлено: ' + stamp(S.data.fetchedAt) + '. Просмотр работает без интернета.' }),
      h('p', { class: 'cap', text: 'Вы видите только свои данные. Доступ выдан администратором по вашему номеру.' })));
    v.appendChild(h('button', { class: 'btn danger', type: 'button', 'data-testid': 'logout', onclick: function () {
      confirmDlg({ title: 'Выйти из кабинета?', yes: 'Выйти', danger: true, body: [h('p', { class: 'cap', text: 'Сохранённые на телефоне данные будут удалены. Чтобы войти снова, понадобится новый код от администратора.' })] }).then(function (ok) { if (ok) logout(); });
    } }, ico('logout', 'sm'), 'Выйти'));
    v.appendChild(h('p', { class: 'note-s', text: 'Мои выплаты · прототип v0.1 · демо-данные' }));
    return v;
  }
  function logout(notice) {   // notice (строка) - автовыход с сообщением на экране входа; без неё - обычный выход
    clearTimeout(autoT); clearInterval(L.timer);
    localStorage.removeItem(SESSK); localStorage.removeItem(CK); localStorage.removeItem('pr.drafts'); localStorage.removeItem('pr.idraft'); localStorage.removeItem('pr.card'); localStorage.removeItem('pr.iadd');   // сессия, кэш данных, черновики
    openStack.slice().forEach(function (c) { c.close(true); });
    S.data = null; S.calc = null; S.stale = false; S.consent = null; L = { step: 'phone', phone: '', timer: null, readyAt: 0, notice: typeof notice === 'string' ? notice : '' };
    location.hash = '#/login'; boot(); if (typeof notice !== 'string') toast('Вы вышли из кабинета');
  }


  /* ---------- согласие и «Мои данные» ---------- */
  function renderConsent() {
    tabbar.hidden = true; $('#offline').hidden = true; clear(root); clearInterval(L.timer);
    document.title = CONSENT_TITLE + ' · Мои выплаты';
    var stale = !!(S.consent && S.consent.version && S.consent.version !== CONSENT_VERSION);   // сервер ждёт более новый текст, чем в этой версии приложения
    var v = h('main', { class: 'login consent', id: 'main', 'data-testid': 'consent-screen' }); root.appendChild(v);
    v.appendChild(h('div', { class: 'brand' }, h('div', { class: 'logo' }, ico('lock', 'lg')), h('div', null, h('b', { text: 'Персональное Решение' }), h('span', { text: 'Кабинет исполнителя' }))));
    v.appendChild(h('h1', { text: CONSENT_TITLE, 'data-testid': 'consent-title' }));
    v.appendChild(h('p', { class: 'lead', text: 'Без вашего согласия показывать выплаты и принимать заявки нельзя.' }));
    var card = h('section', { class: 'card consent-text', 'aria-label': 'Текст согласия', 'data-testid': 'consent-text', tabindex: '0' });
    CONSENT_TEXT.forEach(function (t) { card.appendChild(h('p', { text: t })); });
    card.appendChild(h('p', { class: 'cap', 'data-testid': 'consent-version', text: 'Версия текста: ' + CONSENT_VERSION + (LIVE ? '' : ' (демо, черновик)') }));
    v.appendChild(card);
    if (stale) {
      v.appendChild(h('div', { class: 'tipbox warn', role: 'alert', 'data-testid': 'consent-stale' }, ico('info', 'sm'), h('span', { text: 'Текст согласия обновился. Закройте приложение и откройте его заново.' })));
      v.appendChild(h('button', { class: 'btn', type: 'button', 'data-testid': 'consent-reload', onclick: function () { location.reload(); } }, 'Обновить'));
      return;
    }
    var chk = h('input', { type: 'checkbox', id: 'consent-chk', 'data-testid': 'consent-check' }), go = h('button', { class: 'btn', type: 'button', 'data-testid': 'consent-yes', disabled: true }, ico('check', 'sm'), 'Согласен и продолжить');
    chk.addEventListener('change', function () { go.disabled = !chk.checked; });
    v.appendChild(h('label', { class: 'agree', for: 'consent-chk' }, chk, h('span', { text: 'Я прочитал(а) текст выше и согласен(на) на обработку моих персональных данных' })));
    go.addEventListener('click', function () {
      if (!chk.checked || !requireOnline()) return; go.disabled = true;
      backend.consentAccept(CONSENT_VERSION).then(function (r) {
        if (r && r.ok) { toast('Спасибо, согласие сохранено'); S.consent = null; S.data = null; render(); refresh(); return; }
        if (r && r.error === 'consent_version') { S.consent = { ok: false, version: r.version, required: true }; render(); return; }
        if (r && r.error === 'network') { toast('Нет связи с сервером, повторите', 'bad'); go.disabled = !chk.checked; return; }
        toast('Не удалось сохранить согласие, повторите', 'bad'); go.disabled = !chk.checked;
      });
    });
    v.appendChild(go);
    v.appendChild(h('button', { class: 'btn ghost', type: 'button', 'data-testid': 'consent-no', onclick: function () { logout('Без согласия показать выплаты нельзя. Если передумаете, войдите снова.'); } }, 'Не согласен(на), выйти'));
    v.appendChild(h('p', { class: 'foot', text: LIVE ? 'Данные видны только вам' : 'Демо-прототип · все данные вымышлены' }));
  }
  function viewMyData() {
    var v = h('main', { class: 'view stack', id: 'main', 'data-testid': 'mydata' }), cs = (S.data && S.data.consent) || { ok: true, required: false };
    v.appendChild(backTop('Мои данные', 'Что хранится о вас и как это изменить', '#/me'));
    var ul = h('ul', { class: 'plainlist', 'data-testid': 'mydata-list' }); MYDATA_ITEMS.forEach(function (t) { ul.appendChild(h('li', { text: t })); });
    v.appendChild(h('section', { class: 'card gap8', 'aria-labelledby': 'md1' }, h('h2', { id: 'md1', text: 'Что хранится' }), ul,
      h('p', { class: 'cap', text: 'На телефоне лежит только копия для просмотра без интернета. При выходе из кабинета она стирается.' })));
    v.appendChild(h('section', { class: 'card gap8', 'aria-labelledby': 'md2' }, h('h2', { id: 'md2', text: 'Срок хранения' }),
      h('p', { 'data-testid': 'mydata-term', text: 'Фото и файлы хранятся 12 месяцев с даты записи, затем переносятся в архив для удаления. Остальные данные хранятся, пока вы работаете у оператора.' })));
    v.appendChild(h('section', { class: 'card gap8', 'aria-labelledby': 'md3' }, h('h2', { id: 'md3', text: 'Как отозвать согласие или удалить данные' }),
      h('p', { 'data-testid': 'mydata-revoke', text: 'Обратитесь к бригадиру склада. Он примет заявку на отзыв согласия или удаление ваших данных.' })));
    var st = cs.required ? (cs.ok ? 'Вы дали согласие (версия текста ' + cs.version + (cs.at ? ', ' + dmy(cs.at) : '') + ').' : 'Согласие не дано.') : 'Сейчас приложение не запрашивает согласие.';
    v.appendChild(h('section', { class: 'card gap8', 'aria-labelledby': 'md4' }, h('h2', { id: 'md4', text: 'Ваше согласие' }), h('p', { 'data-testid': 'mydata-status', text: st }),
      (function () { var d = h('details', { class: 'consent-details', 'data-testid': 'mydata-text' }, h('summary', { text: 'Показать текст согласия' })); CONSENT_TEXT.forEach(function (t) { d.appendChild(h('p', { class: 'cap', text: t })); }); return d; })()));
    return v;
  }

  /* ---------- роутер ---------- */
  var VIEWS = { home: viewHome, ops: viewOps, cal: viewCal, ded: viewDed, adv: viewAdv, me: viewMe, promo: viewPromo, jobs: viewJobs, mydata: viewMyData };
  var TITLES = { promo: 'Акции и бонусы', jobs: 'Вакансии', mydata: 'Мои данные' };
  function render() {
    if (!session()) return renderLogin();
    if (S.consent && !S.consent.ok) return renderConsent();
    var r = (location.hash.replace(/^#\//, '') || 'home'); if (!VIEWS[r]) r = 'home'; S.route = r;
    document.title = (TITLES[r] || TABS.filter(function (t) { return t[0] === r; })[0][1]) + ' · Мои выплаты';
    tabbar.hidden = false; offlineBanner();
    var y = window.scrollY; clear(root);
    if (!S.data) { root.appendChild(h('div', { class: 'view', id: 'main' }, skeleton(r))); renderTabs(); devRender(); return; }
    root.appendChild(VIEWS[r]()); renderTabs(); devRender();
    window.scrollTo(0, S.lastRoute === r ? y : 0); S.lastRoute = r;
  }
  window.addEventListener('hashchange', function () { if (session()) render(); });
  window.addEventListener('online', function () { refresh(); toast('Связь восстановлена'); });
  window.addEventListener('offline', function () { render(); toast('Нет сети — работаем с сохранёнными данными', 'warn'); });

  function boot() {
    var se0 = session();
    if (se0) { var ck = clockState(se0); if (ck) { logout(ck === 'closed' ? closedNotice() : staleNotice()); return; } }   // запуск после 22:00 или со вчерашней сессией: сразу выход, данные не рисуем
    if (!session()) { renderLogin(); return; }
    S.blocked = false; armAuto();
    if (!/^#\/(home|cal|ops|ded|adv|me|promo|jobs|mydata)$/.test(location.hash)) location.hash = '#/home';
    S.data = null; render();
    fetchMe().then(function (r) { applyMe(r); render(); }, function () { if (S.blocked || !session()) return; clear(root); root.appendChild(h('div', { class: 'view', id: 'main' }, emptyState('wifioff', 'Нет данных', 'Подключитесь к интернету, чтобы загрузить данные.'), h('button', { class: 'btn', type: 'button', 'data-testid': 'retry-load', onclick: boot }, 'Повторить'))); });
  }

  /* ---------- панель разработчика: «Telegram администратора» ---------- */
  var devOpen = false;
  function devRender() {
    var host = $('#dev-root'); clear(host); if (LIVE || qs.get('nodev') === '1') return;
    var s = srv();
    var wrap = h('div', { class: 'dev' + (session() ? '' : ' nt'), 'data-testid': 'dev' });
    if (devOpen) {
      var box = h('div', { class: 'devbox', 'data-testid': 'dev-box', role: 'region', 'aria-label': 'Панель разработчика' });
      box.appendChild(h('h3', { text: 'Демо Telegram · личный чат с ' + BOT_NAME + ' и чат админа' }));
      if (!s.tg.length) box.appendChild(h('div', { text: 'Пока пусто. Демо-номер: +7 900 000-00-01' }));
      s.tg.slice(0, 3).forEach(function (m) {
        var t = new Date(m.t).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        box.appendChild(m.kind === 'code' ? h('div', { class: 'tgmsg', 'data-testid': 'tg-msg' }, h('time', { text: t }), 'Личное сообщение · ' + BOT_NAME, h('br'), '🔑 Код для входа в «Мои выплаты»: ', h('b', { class: 'code', 'data-testid': 'tg-code', text: m.code }), '. Действует ' + (m.ttl || CFG.codeTtlMin) + ' минут. Никому не сообщайте.')
          : m.kind === 'feedback' ? h('div', { class: 'tgmsg', 'data-testid': 'tg-msg-feedback' }, h('time', { text: t }), '📣 Анонимная обратная связь', h('br'), 'Тема: ' + ANON_TOPICS[m.topic], h('br'), 'Автор неизвестен')
          : m.kind === 'incident-add' ? h('div', { class: 'tgmsg', 'data-testid': 'tg-msg-incident-add' }, h('time', { text: t }), '↩️ Дополнение к происшествию', h('br'), '👤 ' + m.name, h('br'), 'Статус снова «ждёт проверки»')
          : m.kind === 'application' ? h('div', { class: 'tgmsg', 'data-testid': 'tg-msg-application' }, h('time', { text: t }), '💼 Отклик на вакансию', h('br'), '👤 ' + m.name, h('br'), m.job)
          : m.kind === 'incident' ? h('div', { class: 'tgmsg', 'data-testid': 'tg-msg-incident' }, h('time', { text: t }), '🚨 Новое происшествие', h('br'), '👤 ' + m.name, h('br'), INC_TYPES[m.type] + ' · ' + dmy(m.date) + ' · файлы в Drive')
          : h('div', { class: 'tgmsg', 'data-testid': 'tg-msg-unknown' }, h('time', { text: t }), '⚠️ Номер ' + fmtPhone(m.phone) + ' не найден в CRM — код не создан'));
      });
      box.appendChild(h('h3', { text: 'Действия админа (демо)' }));
      if (session()) s.advances.filter(function (a) { return a.status === 'pending' || a.status === 'approved'; }).forEach(function (a) {
        box.appendChild(h('div', { class: 'devrow' }, money(a.amount) + ' · ' + ADV_ST[a.status][0], h('br'),
          a.status === 'pending' ? [h('button', { class: 'devbtn', type: 'button', 'data-testid': 'adm-approve', onclick: function () { admin.advance(a.id, 'approved'); } }, 'Одобрить'), h('button', { class: 'devbtn', type: 'button', 'data-testid': 'adm-reject', onclick: function () { admin.advance(a.id, 'rejected'); } }, 'Отклонить')] : null,
          h('button', { class: 'devbtn', type: 'button', 'data-testid': 'adm-issue', onclick: function () { admin.advance(a.id, 'issued'); } }, 'Выдать')));
      });
      if (session()) s.advances.filter(function (a) { return a.status === 'issued'; }).slice(0, 2).forEach(function (a) {
        box.appendChild(h('div', { class: 'devrow' }, 'Выдано ' + money(a.amount) + (a.requested > 0 && a.requested !== a.amount ? ' (просили ' + money(a.requested) + ')' : ''), h('br'),
          h('button', { class: 'devbtn', type: 'button', 'data-testid': 'adm-paid-less', onclick: function () { admin.paid(a.id, Math.max(100, a.amount - 500)); } }, 'Выдано на 500 ₽ меньше')));
      });
      if (session()) s.cases.filter(function (c) { return c.expl && c.expl.status === 'sent'; }).forEach(function (c) { box.appendChild(h('div', { class: 'devrow' }, 'Объяснение: ' + c.title.slice(0, 28), h('br'), h('button', { class: 'devbtn', type: 'button', 'data-testid': 'adm-accept', onclick: function () { admin.accept(c.id); } }, 'Принять'), h('button', { class: 'devbtn', type: 'button', 'data-testid': 'adm-return', onclick: function () { admin.returnExpl(c.id, 'Фото нечёткое. Снимите повреждение крупнее и приложите ещё одно.'); } }, 'Вернуть'))); });
      if (session()) s.incidents.filter(function (i) { return i.status === 'review'; }).forEach(function (i) { box.appendChild(h('div', { class: 'devrow' }, 'Происшествие: ' + i.desc.slice(0, 26), h('br'), h('button', { class: 'devbtn', type: 'button', 'data-testid': 'adm-inc-accept', onclick: function () { admin.acceptIncident(i.id); } }, 'Принять'), h('button', { class: 'devbtn', type: 'button', 'data-testid': 'adm-inc-return', onclick: function () { admin.decideIncident(i.id, 'returned', 'Не видно номер паллеты на фото. Добавьте, когда и кого вы уведомили.'); } }, 'Вернуть'), h('button', { class: 'devbtn', type: 'button', 'data-testid': 'adm-inc-reject', onclick: function () { admin.decideIncident(i.id, 'rejected', 'Это не ваша смена, случай передан другому сотруднику.'); } }, 'Отклонить'))); });
      if (session()) s.applications.filter(function (x) { return x.status === 'sent' || x.status === 'viewed'; }).slice(0, 2).forEach(function (x) { box.appendChild(h('div', { class: 'devrow' }, 'Отклик: ' + x.jobId, h('br'), h('button', { class: 'devbtn', type: 'button', 'data-testid': 'adm-app-invite', onclick: function () { admin.application(x.id, 'invited'); } }, 'Пригласить'))); });
      box.appendChild(h('div', { class: 'devrow' }, h('button', { class: 'devbtn', type: 'button', 'data-testid': 'adm-block', onclick: function () { admin.block(); refresh(); } }, 'Заблокировать доступ'), h('button', { class: 'devbtn', type: 'button', 'data-testid': 'adm-unblock', onclick: function () { admin.unblockAll(); toast('Доступ возвращён'); } }, 'Вернуть доступ')));
      box.appendChild(h('div', { class: 'devrow' }, h('button', { class: 'devbtn', type: 'button', 'data-testid': 'adm-unlock', onclick: function () { admin.unlock(); toast('Лимиты входа сброшены'); } }, 'Сбросить лимиты входа'), h('button', { class: 'devbtn', type: 'button', 'data-testid': 'adm-reset', onclick: function () { admin.reset(); } }, 'Сбросить демо')));
      wrap.appendChild(box);
    }
    wrap.appendChild(h('button', { class: 'devpill', type: 'button', 'aria-expanded': devOpen ? 'true' : 'false', 'data-testid': 'dev-toggle', onclick: function () { devOpen = !devOpen; devRender(); } }, ico('paper', 'sm'), devOpen ? 'Скрыть DEV' : 'DEV: Telegram админа'));
    host.appendChild(wrap);
  }
  window.__dev = { periodOf: M.periodOf, buildPeriods: M.buildPeriods, anonChallenge: function () { return server.anonChallenge(); }, anonSubmit: function (p) { return server.anonSubmit(p); }, anonBuild: anonBuildRequest, applyJob: function (p) { return server.applyJob(session().phone, p); }, promoState: promoState, photosOf: photosOf, validate: incidentErrors, advInfo: function () { return advInfo(S.data, S.calc); }, advCheck: function (x) { return server._advCheck(x); }, advInfoFor: function (d) { var i = advInfo(d, calcAll(d)); i.w = null; return i; }, weekInfo: weekInfo, open: function (v) { devOpen = v !== false; devRender(); } };

  /* ---------- старт ---------- */
  setTheme(load('pr.theme', 'auto'));
  function updateBar() {   // новая версия оболочки встала в кэш: предложить перезапуск, ничего не перезагружая само (в форме может быть черновик)
    if (document.querySelector('[data-testid="update-bar"]')) return;
    var bar = h('div', { class: 'updbar', role: 'status', 'data-testid': 'update-bar' }, h('span', { text: 'Вышла новая версия приложения.' }),
      h('button', { class: 'btn', type: 'button', 'data-testid': 'update-now', onclick: function () { location.reload(); } }, 'Обновить'),
      h('button', { class: 'btn ghost', type: 'button', 'data-testid': 'update-later', onclick: function () { bar.remove(); } }, 'Позже'));
    document.body.appendChild(bar);
  }
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    var hadCtl = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js').catch(function () { /* офлайн-оболочка необязательна */ });
    navigator.serviceWorker.addEventListener('controllerchange', function () { if (hadCtl) updateBar(); hadCtl = true; });   // первая установка (контроллера не было) не считается обновлением
  }
  if (!location.hash) location.hash = session() ? '#/home' : '#/login';
  boot(); devRender();
})();
