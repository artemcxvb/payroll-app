/* Кабинет админа «Мои выплаты». Отдельная страница admin.html (прямой адрес, ссылки из приложения исполнителей нет).
   Безопасность вывода: любой текст из таблиц попадает в DOM только через textContent (функция h()); inline-скриптов и стилей нет (CSP).
   Демо (config.js без реального API): вымышленные данные в localStorage браузера, код входа показывается на экране. Live: Apps Script, действия admin*. */
(function () {
  'use strict';
  var APPC = window.APP_CONFIG || {}, LIVE = APPC.mode === 'live' && /^https:\/\//.test(APPC.backendUrl || '');
  var qs = new URLSearchParams(location.search), LAT = LIVE ? 0 : qs.has('lat') ? +qs.get('lat') : 150;
  var SESSK = 'pr.admin.session', DEMOK = 'pr.admin.demo', THEMEK = 'pr.theme', NBSP = '\u00a0';
  var REASON_MIN = 3, REASON_MAX = 300;

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
  function money(n) { return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP) + NBSP + '₽'; }
  function normPhone(v) { var d = String(v || '').replace(/\D/g, ''); if (d.length === 11 && (d[0] === '7' || d[0] === '8')) d = d.slice(1); return d.length === 10 ? '7' + d : ''; }
  function fmtPhone(d) { d = String(d || ''); return /^7\d{10}$/.test(d) ? '+7 ' + d.slice(1, 4) + ' ' + d.slice(4, 7) + '-' + d.slice(7, 9) + '-' + d.slice(9, 11) : d; }
  function dmy(s) { var a = String(s || '').slice(0, 10).split('-'); return a.length === 3 ? a[2] + '.' + a[1] + '.' + a[0] : String(s || ''); }
  function dmyT(s) { s = String(s || ''); return s ? dmy(s) + (s.length > 10 ? ' ' + s.slice(11, 16) : '') : ''; }
  function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* квота */ } }
  function load(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function nowMsk() { return new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 16).replace('T', ' '); }
  function plural(n, f) { var a = Math.abs(n) % 100, b = a % 10; return f[(a > 10 && a < 20) ? 2 : b > 1 && b < 5 ? 1 : b === 1 ? 0 : 2]; }
  var IC = {
    home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
    wallet: '<path d="M3 7a2 2 0 0 1 2-2h12v3"/><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M16 13.5h2"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
    alert: '<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    refresh: '<path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    check: '<path d="M20 6L9 17l-5-5"/>', x: '<path d="M18 6L6 18M6 6l12 12"/>',
    send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>', clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    wifioff: '<path d="M1 1l22 22M16.7 11.1A11 11 0 0 1 22.6 9M5 12.6a11 11 0 0 1 5.2-2.6M8.5 16.4a6 6 0 0 1 7 0M12 20h.01"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1z"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'
  };
  function ico(n, cls) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'ico' + (cls ? ' ' + cls : '')); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false'); s.innerHTML = IC[n] || ''; return s;
  }
  function chip(t, tone, ic) { return h('span', { class: 'chip ' + tone }, ic ? ico(ic, 'sm') : null, t); }

  /* ---------- темы (общая настройка с приложением: pr.theme) ---------- */
  function applyTheme() {
    var pref = load(THEMEK, 'auto'), dark = matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', pref === 'auto' ? (dark ? 'dark' : 'light') : pref);
  }
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  function toggleTheme() { var cur = document.documentElement.getAttribute('data-theme'); store(THEMEK, cur === 'dark' ? 'light' : 'dark'); applyTheme(); render(); }
  applyTheme();

  /* ---------- справочник действий (общий для кнопок и демо) ---------- */
  var KINDS = {
    adv: { action: 'adminAdvanceDecide', label: 'Аванс', st: { pending: ['На рассмотрении', 'warn'], approved: ['Одобрен', 'info'], issued: ['Выдан', 'ok'], rejected: ['Отклонён', 'bad'], cancelled: ['Отменён', 'gray'] },
      acts: [ { to: 'approved', label: 'Одобрить', cls: 'ok', from: ['pending'], text: 'Одобрен' },
              { to: 'issued', label: 'Выдан', cls: 'ok', from: ['approved'], text: 'Выдан', confirm: 'Подтвердите, что деньги выданы сотруднику. Статус «Выдан» увидит сотрудник.' },
              { to: 'rejected', label: 'Отклонить', cls: 'danger', from: ['pending', 'approved'], text: 'Отклонён', reason: true, confirm: 'Сотрудник увидит причину отказа.' } ] },
    expl: { action: 'adminExplDecide', label: 'Объяснение', st: { sent: ['Ждёт проверки', 'warn'], accepted: ['Принято', 'ok'], returned: ['Возвращено', 'info'] },
      acts: [ { to: 'accepted', label: 'Принять', cls: 'ok', from: ['sent'], text: 'Принято' },
              { to: 'returned', label: 'Вернуть', cls: 'warnb', from: ['sent'], text: 'Возвращено', reason: true, confirm: 'Сотрудник увидит причину и сможет отправить объяснение заново.' } ] },
    inc: { action: 'adminIncidentDecide', label: 'Происшествие', st: { review: ['Ждёт проверки', 'warn'], accepted: ['Принято', 'ok'], returned: ['На доработке', 'info'], rejected: ['Отклонено', 'bad'] },
      acts: [ { to: 'accepted', label: 'Принять', cls: 'ok', from: ['review'], text: 'Принято' },
              { to: 'returned', label: 'На доработку', cls: 'warnb', from: ['review'], text: 'Возвращено', reason: true, confirm: 'Сотрудник увидит, что нужно исправить, и сможет дополнить объяснение.' },
              { to: 'rejected', label: 'Отклонить', cls: 'danger', from: ['review'], text: 'Отклонено', reason: true, confirm: 'Сотрудник увидит причину отказа.' } ] },
    apps: { action: 'adminAppMark', label: 'Отклик', st: { sent: ['Новый', 'warn'], viewed: ['Просмотрен', 'info'], invited: ['Приглашён', 'ok'], declined: ['Закрыт', 'gray'] },
      acts: [ { to: 'viewed', label: 'Просмотрен', cls: 'secondary', from: ['sent'], text: 'Просмотрен' },
              { to: 'invited', label: 'Приглашён', cls: 'ok', from: ['sent', 'viewed'], text: 'Приглашён на собеседование' },
              { to: 'closed', label: 'Обработан', cls: 'ghost', from: ['sent', 'viewed', 'invited'], text: 'Закрыто' } ] }
  };
  var CLOSED_CODE = { closed: 'declined' };   // код в ответе сервера для статуса «Закрыто» — declined
  var TABS = [['sum', 'Сводка', 'home'], ['adv', 'Авансы', 'wallet'], ['expl', 'Объяснения', 'file'], ['inc', 'Происшествия', 'alert'], ['apps', 'Отклики', 'briefcase'], ['acc', 'Доступ', 'lock']];
  var LIST_ACTION = { adv: 'adminAdvances', expl: 'adminExplanations', inc: 'adminIncidents', apps: 'adminApplications', acc: 'adminAccess' };

  /* ---------- демо-«сервер» (вымышленные данные) ---------- */
  var DEMO_CODE = '4821';
  function demoSeed() {
    var n = nowMsk();
    return { adv: [
        { id: 'A1', created: n, week: '2026-09-28', payDate: '2026-10-03', phone: '79000000001', name: 'Тестов Иван Петрович', amount: 3000, comment: 'На проезд и продукты', status: 'pending', statusText: 'Новая', answer: '', available: 5500, reserve: 1500 },
        { id: 'A2', created: n, week: '2026-09-28', payDate: '2026-10-03', phone: '79000000002', name: 'Образцова Мария Сергеевна', amount: 5000, comment: '', status: 'approved', statusText: 'Одобрен', answer: '', available: 7000, reserve: 0 },
        { id: 'A3', created: n, week: '2026-09-21', payDate: '2026-09-26', phone: '79000000003', name: 'Демов Олег Викторович', amount: 2000, comment: '', status: 'issued', statusText: 'Выдан', answer: '', available: 4000, reserve: 0 } ],
      expl: [ { id: 'X1', created: n, phone: '79000000001', name: 'Тестов Иван Петрович', caseId: 's7', kind: 'брак', caseDate: '2026-09-17', amount: 3000, text: 'Задел стеллаж погрузчиком при развороте, сразу сообщил бригадиру и сфотографировал повреждения.', files: ['app:/Объяснения/2026-09/E1/s7_1.jpg', 'app:/Объяснения/2026-09/E1/s7_2.jpg'], status: 'sent', statusText: 'Отправлено', answer: '' } ],
      inc: [ { id: 'I1', created: n, date: '2026-09-29', phone: '79000000002', name: 'Образцова Мария Сергеевна', type: 'Порча имущества', desc: 'Разбит защитный борт стеллажа', text: 'При разгрузке паллеты погрузчик задел борт. Сообщила бригадиру, борт заменён.', scene: ['app:/Происшествия/2026-09/E2/I1/scene_1.jpg'], damage: ['app:/Происшествия/2026-09/E2/I1/damage_1.jpg'], acts: ['app:/Происшествия/2026-09/E2/I1/act_1.pdf'], status: 'review', statusText: 'Отправлено, ждёт проверки', answer: '', addendum: '[2026-09-30 10:15] Дополнение: акт подписан начальником смены.' } ],
      apps: [ { id: 'J1', created: n, jobId: 'j1', title: 'Бригадир смены', phone: '79000000003', name: 'Демов Олег Викторович', tab: '', comment: 'Есть опыт 3 года', status: 'sent', statusText: 'Отправлен', answer: '' } ],
      acc: [ { phone: '79000000009', name: 'Пример Блокированный', status: 'blocked', statusText: 'Заблокирован', reason: 'Уволен (демо)', at: '2026-09-25 12:00', by: 'админ (кабинет)' } ],
      jobs: [ { cols: [{ k: 'ID', v: 'j1' }, { k: 'Должность', v: 'Бригадир смены' }, { k: 'Участок', v: 'WH' }, { k: 'Статус', v: 'Открыта' }] } ],
      promos: [ { cols: [{ k: 'ID', v: 'p1' }, { k: 'Название', v: 'Бонус за выходные' }, { k: 'Бонус', v: '+10%' }, { k: 'Показывать', v: 'да' }] } ],
      log: [] };
  }
  function demoState() { var s = load(DEMOK, null); if (!s) { s = demoSeed(); store(DEMOK, s); } return s; }
  function demoRes(o) { return Promise.resolve(o); }
  var demoCodeAt = 0;
  function demoCall(action, d) {
    var s = demoState(), tok = (load(SESSK, null) || {}).token;
    if (action === 'adminCodeRequest') { if (Date.now() - demoCodeAt < 30000 && demoCodeAt) return demoRes({ ok: true, throttled: true, wait: 30 }); demoCodeAt = Date.now(); return demoRes({ ok: true }); }
    if (action === 'adminCodeVerify') return demoRes(String(d.code) === DEMO_CODE ? { ok: true, token: 'demo-admin', expiresAt: Date.now() + 12 * 3600000 } : { ok: false, error: 'wrong', left: 4 });
    if (tok !== 'demo-admin') return demoRes({ ok: false, error: 'auth' });
    function counts(l, st) { return l.filter(function (x) { return x.status === st; }).length; }
    function needs(l, st) { return l.map(function (x) { var c = JSON.parse(JSON.stringify(x)); c.needs = st.indexOf(x.status) >= 0; return c; }); }
    if (action === 'adminSummary') {
      var pe = s.adv.filter(function (a) { return a.status === 'pending'; }), ap = s.adv.filter(function (a) { return a.status === 'approved'; });
      function sm(l) { return l.reduce(function (t, x) { return t + x.amount; }, 0); }
      return demoRes({ ok: true, today: nowMsk().slice(0, 10), payDate: '2026-10-03', advances: { pending: pe.length, pendingSum: sm(pe), approved: ap.length, approvedSum: sm(ap), approvedForPay: ap.length, approvedForPaySum: sm(ap) },
        explanations: { sent: counts(s.expl, 'sent') }, incidents: { review: counts(s.inc, 'review') }, applications: { sent: counts(s.apps, 'sent') }, blocked: counts(s.acc, 'blocked') });
    }
    if (action === 'adminAdvances') return demoRes({ ok: true, items: needs(s.adv, ['pending', 'approved']) });
    if (action === 'adminExplanations') return demoRes({ ok: true, items: needs(s.expl, ['sent']) });
    if (action === 'adminIncidents') return demoRes({ ok: true, items: needs(s.inc, ['review']) });
    if (action === 'adminApplications') return demoRes({ ok: true, items: needs(s.apps, ['sent']) });
    if (action === 'adminAccess') return demoRes({ ok: true, items: s.acc });
    if (action === 'adminJobs') return demoRes({ ok: true, items: s.jobs });
    if (action === 'adminPromos') return demoRes({ ok: true, items: s.promos });
    if (action === 'adminLog') return demoRes({ ok: true, items: s.log.slice().reverse().slice(0, 50) });
    if (action === 'adminFileLink') return demoRes({ ok: false, error: 'demo' });
    function logit(a, o, t) { s.log.push({ at: nowMsk(), action: a, object: o, details: t }); }
    var key = { adminAdvanceDecide: 'adv', adminExplDecide: 'expl', adminIncidentDecide: 'inc', adminAppMark: 'apps' }[action];
    if (key) {
      var K = KINDS[key], act = K.acts.filter(function (x) { return x.to === d.to; })[0]; if (!act) return demoRes({ ok: false, error: 'bad_action' });
      var reason = String(d.reason || '').trim(); if (act.reason && reason.length < REASON_MIN) return demoRes({ ok: false, error: 'reason_required' });
      var it = s[key].filter(function (x) { return x.id === d.id; })[0]; if (!it) return demoRes({ ok: false, error: 'not_found' });
      if (act.from.indexOf(it.status) < 0) return demoRes({ ok: false, error: 'state', status: it.status, statusText: it.statusText });
      it.status = CLOSED_CODE[d.to] || d.to; it.statusText = act.text; if (reason) it.answer = reason;
      logit(K.label + ': ' + act.text, it.id, it.name + (reason ? ' | причина: ' + reason : '')); store(DEMOK, s); return demoRes({ ok: true, status: it.status, statusText: act.text });
    }
    if (action === 'adminBlock' || action === 'adminUnblock') {
      var ph = String(d.phone || '').replace(/\D/g, '').replace(/^8(?=\d{10}$)/, '7'); if (ph.length === 10) ph = '7' + ph; if (!/^79\d{9}$/.test(ph)) return demoRes({ ok: false, error: 'bad_phone' });
      var row = s.acc.filter(function (x) { return x.phone === ph; })[0];
      if (action === 'adminBlock') {
        var why = String(d.reason || '').trim(); if (why.length < REASON_MIN) return demoRes({ ok: false, error: 'reason_required' });
        if (row && row.status === 'blocked') return demoRes({ ok: false, error: 'state', status: 'blocked' });
        if (row) { row.status = 'blocked'; row.statusText = 'Заблокирован'; row.reason = why; row.at = nowMsk(); row.by = 'админ (кабинет)'; } else s.acc.unshift({ phone: ph, name: '', status: 'blocked', statusText: 'Заблокирован', reason: why, at: nowMsk(), by: 'админ (кабинет)' });
        logit('Доступ: заблокирован', fmtPhone(ph), 'причина: ' + why); store(DEMOK, s); return demoRes({ ok: true, status: 'blocked' });
      }
      if (!row || row.status !== 'blocked') return demoRes({ ok: false, error: 'state', status: 'allowed' });
      row.status = 'allowed'; row.statusText = 'Разрешён'; row.by = 'админ (кабинет)'; logit('Доступ: разрешён', fmtPhone(ph), row.name); store(DEMOK, s); return demoRes({ ok: true, status: 'allowed' });
    }
    return demoRes({ ok: false, error: 'unknown_action' });
  }

  /* ---------- связь с бэкендом ---------- */
  function post(body) {
    return fetch(APPC.backendUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', redirect: 'follow' })
      .then(function (r) { return r.json(); }).then(function (r) { return r && typeof r === 'object' ? r : { ok: false, error: 'server' }; }).catch(function () { return { ok: false, error: 'network' }; });
  }
  var session = function () { var s = load(SESSK, null); return s && s.token && (!s.exp || s.exp > Date.now()) ? s : null; };
  function call(action, body) {
    var b = {}, k, se = session(); for (k in (body || {})) b[k] = body[k]; b.action = action; if (se && action.indexOf('adminCode') !== 0) b.token = se.token;
    var p = LIVE ? post(b) : delay(LAT).then(function () { return demoCall(action, b); });
    return p.then(function (r) {
      if (r && r.error === 'auth' && session()) { endSession(); toast('Сессия закончилась — войдите снова', 'warn'); }
      if (r && r.error === 'disabled') { endSession(); S.disabled = true; render(); }
      return r;
    });
  }
  function endSession() { localStorage.removeItem(SESSK); S.sum = null; S.log = null; S.data = {}; S.err = {}; L = { step: 'start', readyAt: 0, lockUntil: 0, wait: false }; render(); }
  var ERR = { network: 'Нет связи с сервером. Проверьте интернет и повторите.', server: 'Сервер ответил ошибкой. Повторите через минуту.', busy: 'Таблица занята другим действием. Повторите через несколько секунд.', disabled: 'Кабинет админа выключен (ADMIN_ENABLED=0).', unknown_action: 'Сервер не знает этого действия: обновите Code.gs (см. DEPLOY.md).', not_found: 'Запись не найдена — возможно, строку удалили в таблице.', bad_phone: 'Нужен мобильный номер РФ, например +7 900 123-45-67.', reason_required: 'Укажите причину (не короче 3 символов).', reason_long: 'Причина слишком длинная (до 300 символов).', unavailable: 'Файл сейчас недоступен на Яндекс Диске.', demo: 'В демо файлы не открываются.' };
  function errText(r) { return ERR[r && r.error] || 'Не получилось выполнить действие. Повторите.'; }

  /* ---------- состояние ---------- */
  var S = { tab: 'sum', sum: null, log: null, data: {}, err: {}, filter: {}, q: {}, loading: {}, disabled: false };
  var L = { step: 'start', readyAt: 0, lockUntil: 0, wait: false, timer: null };
  var root = $('#view-root'), tabbar = $('#tabbar'), overlayRoot = $('#overlay-root'), toasts = $('#toasts');

  function toast(msg, tone) {
    var t = h('div', { class: 'toast ' + (tone || 'ok'), role: tone === 'bad' ? 'alert' : null }, ico(tone === 'bad' ? 'alert' : tone === 'warn' ? 'info' : 'check'), h('span', { text: msg }));
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
        var f = [].filter.call(sheet.querySelectorAll('button, [href], input, textarea, [tabindex]:not([tabindex="-1"])'), function (x) { return !x.disabled && x.offsetParent !== null; });
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
  /* подтверждение; с reason — ещё и ввод причины в диалоге. Результат: { reason } или null */
  function confirmAct(o) {
    return new Promise(function (res) {
      var done = false, ctl, ta = null, yes, cnt = null;
      function fin(v) { if (done) return; done = true; ctl.close(true); res(v); }
      function upd() { if (!ta) return; var n = ta.value.trim().length; yes.disabled = o.reason && n < REASON_MIN; cnt.textContent = ta.value.length + ' / ' + REASON_MAX; }
      var body = h('div', { class: 'gap12' }, o.text ? h('p', { class: 'cap', text: o.text }) : null);
      if (o.who) body.insertBefore(h('p', { class: 'nm', 'data-testid': 'dlg-who', text: o.who }), body.firstChild);
      if (o.reason) {
        ta = h('textarea', { class: 'inp', maxlength: String(REASON_MAX), 'data-testid': 'dlg-reason', 'aria-label': o.reasonLabel || 'Причина', placeholder: o.reasonLabel || 'Причина', oninput: upd });
        cnt = h('div', { class: 'cnt2', 'aria-hidden': 'true' });
        body.appendChild(h('div', { class: 'reasonbox' }, h('label', { class: 'l', text: o.reasonLabel || 'Причина' }), ta, cnt, h('p', { class: 'help', text: 'Сотрудник увидит причину в приложении.' })));
      }
      yes = h('button', { class: 'btn' + (o.danger ? ' danger' : ''), type: 'button', 'data-testid': 'dlg-yes', onclick: function () { if (yes.disabled) return; fin({ reason: ta ? ta.value.trim() : '' }); } }, o.yes || 'Да');
      ctl = openDialog({ title: o.title, dialog: true, alert: true, focus: function () { (ta || yes).focus(); }, onClose: function () { fin(null); }, body: body,
        footer: h('div', { class: 'btnrow' }, h('button', { class: 'btn ghost', type: 'button', 'data-testid': 'dlg-no', onclick: function () { fin(null); } }, 'Отмена'), yes) });
      upd();
    });
  }

  /* ---------- вход ---------- */
  function renderLogin() {
    tabbar.hidden = true; $('#offline').hidden = true; clear(root); clearInterval(L.timer);
    var v = h('main', { class: 'login adm-login', id: 'main' }); root.appendChild(v);
    if (S.disabled) {
      v.appendChild(h('h1', { text: 'Кабинет выключен' })); v.appendChild(h('p', { class: 'lead', text: 'Админ-вход отключён на сервере (ADMIN_ENABLED=0). Включите его в Script Properties.' }));
      v.appendChild(h('button', { class: 'btn ghost', type: 'button', 'data-testid': 'retry', onclick: function () { S.disabled = false; renderLogin(); } }, 'Проверить ещё раз')); return;
    }
    if (L.step === 'code' && L.lockUntil > Date.now()) return loginLocked(v);
    v.appendChild(h('h1', null, 'Кабинет админа', LIVE ? null : h('span', { class: 'demobadge', 'data-testid': 'demo-badge', text: 'ДЕМО' })));
    v.appendChild(h('p', { class: 'lead', text: 'Здесь видно всё, что присылают сотрудники, и можно подтверждать или отклонять. Вход — по коду из Telegram.' }));
    if (L.step === 'start') loginStart(v); else loginCode(v);
    v.appendChild(h('p', { class: 'foot', text: LIVE ? 'Код приходит в админский чат Telegram. Сотрудникам в кабинет вход закрыт.' : 'Демо-режим · все данные вымышлены' }));
  }
  function loginStart(v) {
    var btn = h('button', { class: 'btn', type: 'button', 'data-testid': 'req-code' }, ico('send', 'sm'), 'Получить код в Telegram'), err = h('div', { class: 'err', role: 'alert', hidden: true, 'data-testid': 'login-err' });
    btn.addEventListener('click', function () {
      if (navigator.onLine === false) { err.textContent = ERR.network; err.hidden = false; return; }
      btn.disabled = true; clear(btn); btn.appendChild(h('span', { class: 'spinner' })); btn.appendChild(document.createTextNode(' Отправляем…'));
      call('adminCodeRequest').then(function (r) {
        if (r.error === 'locked') { L.step = 'code'; L.lockUntil = r.until; return renderLogin(); }
        if (!r.ok) { clear(btn); btn.appendChild(ico('send', 'sm')); btn.appendChild(document.createTextNode('Получить код в Telegram')); btn.disabled = false; err.textContent = errText(r); err.hidden = false; return; }
        L.step = 'code'; L.readyAt = Date.now() + (r.throttled ? (r.wait || 30) : 30) * 1000; renderLogin();
      });
    });
    v.appendChild(h('div', { class: 'gap12' }, btn, err));
    v.appendChild(h('div', { class: 'steps' }, h('div', { class: 'stepi' }, h('i', { text: '1' }), h('span', { text: 'Нажмите «Получить код в Telegram» — 4 цифры придут в ваш админский чат.' })), h('div', { class: 'stepi' }, h('i', { text: '2' }), h('span', { text: 'Введите код. Он действует 10 минут, вход держится 12 часов.' }))));
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
      call('adminCodeVerify', { code: c }).then(function (r) {
        busy = false;
        if (r.ok && r.token) { store(SESSK, { token: r.token, exp: r.expiresAt, at: Date.now() }); clearInterval(L.timer); L = { step: 'start', readyAt: 0, lockUntil: 0 }; location.hash = '#/sum'; boot(); return; }
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
      call('adminCodeRequest').then(function (r) {
        if (r.error === 'locked') { L.lockUntil = r.until; return renderLogin(); }
        if (!r.ok) { toast(errText(r), 'bad'); return; }
        L.readyAt = Date.now() + (r.throttled ? (r.wait || 30) : 30) * 1000; tick(); toast('Код запрошен повторно — проверьте Telegram'); boxes.forEach(function (b) { b.value = ''; }); boxes[0].focus();
      });
    });
    tick(); L.timer = setInterval(function () { if (!resend.isConnected) return clearInterval(L.timer); tick(); }, 1000);
    v.appendChild(h('div', { class: 'waitbox', role: 'status', 'data-testid': 'wait-admin' }, ico('send'), h('div', null, h('b', { text: 'Проверьте Telegram' }), h('span', { text: 'Код пришёл в админский чат. Введите 4 цифры.' }))));
    if (!LIVE) v.appendChild(h('div', { class: 'demohint', 'data-testid': 'demo-code', text: 'Демо: код входа — ' + DEMO_CODE }));
    v.appendChild(h('div', { class: 'gap16' }, h('div', { class: 'gap12' }, otp, err), go, h('div', { class: 'row between' }, resend, h('button', { class: 'link', type: 'button', 'data-testid': 'change', onclick: function () { L.step = 'start'; renderLogin(); } }, 'Назад'))));
    setTimeout(function () { boxes[0].focus(); }, 50);
  }
  function loginLocked(v) {
    var t = h('div', { class: 't num', 'data-testid': 'lock-timer' });
    function tick() { var s = Math.max(0, Math.ceil((L.lockUntil - Date.now()) / 1000)); t.textContent = ('0' + Math.floor(s / 60)).slice(-2) + ':' + ('0' + s % 60).slice(-2); if (s <= 0) { clearInterval(L.timer); L.step = 'start'; L.lockUntil = 0; renderLogin(); } }
    v.appendChild(h('h1', { text: 'Вход временно закрыт' }));
    v.appendChild(h('div', { class: 'lockbox', role: 'alert', 'data-testid': 'lockbox' }, ico('lock', 'lg'), h('p', { text: 'Слишком много неверных кодов. Повторить можно через' }), t));
    tick(); L.timer = setInterval(tick, 1000);
  }

  /* ---------- общие блоки ---------- */
  function empty(ic, t, sub, extra) { return h('div', { class: 'empty', 'data-testid': 'empty' }, h('div', { class: 'eic' }, ico(ic, 'lg')), h('b', { text: t }), h('p', { text: sub }), extra || null); }
  function errBox(msg, retry) { return h('div', { class: 'errbox', role: 'alert', 'data-testid': 'err-box' }, ico('wifioff'), h('div', null, h('b', { text: 'Не удалось загрузить' }), h('span', { text: msg }), h('button', { class: 'btn ghost', type: 'button', 'data-testid': 'retry', onclick: retry }, 'Повторить'))); }
  function skeleton() { return h('div', { class: 'stack', 'aria-busy': 'true', role: 'status', 'aria-label': 'Загрузка', 'data-testid': 'skeleton' }, h('div', { class: 'sk c' }), h('div', { class: 'sk c' }), h('div', { class: 'sk c' })); }
  function kv(pairs) { var d = h('div', { class: 'kv' }); pairs.forEach(function (p) { if (p[1] === '' || p[1] == null) return; d.appendChild(h('span', { text: p[0] })); d.appendChild(h('span', { text: p[1] })); }); return d; }
  function txt(label, text, cls) { return text ? h('div', { class: 'txt' + (cls ? ' ' + cls : '') }, h('b', { text: label }), text) : null; }
  function fileBtns(list) {
    if (!list || !list.length) return null;
    return h('div', { class: 'files' }, list.map(function (p) { return h('button', { class: 'btn ghost fbtn', type: 'button', 'data-testid': 'file', 'data-path': p, onclick: function () { openFile(p); } }, ico(/\.pdf$/i.test(p) ? 'file' : 'search', 'sm'), (/\.pdf$/i.test(p) ? 'Акт · ' : 'Фото · ') + p.split('/').pop()); }));
  }
  function openFile(p) {
    if (!requireOnline()) return;
    call('adminFileLink', { path: p }).then(function (r) {
      if (!r.ok) { toast(errText(r), 'bad'); return; }
      var w = null; try { w = window.open(r.href, '_blank', 'noopener,noreferrer'); } catch (e) { w = null; }
      if (!w) { var ctl = openDialog({ title: 'Файл готов', body: h('div', { class: 'gap12' }, h('p', { class: 'cap', text: 'Ссылка временная. Нажмите, чтобы открыть.' }), h('a', { class: 'btn', href: r.href, target: '_blank', rel: 'noopener noreferrer', 'data-testid': 'file-open', text: 'Открыть файл' })) }); void ctl; }
    });
  }
  function requireOnline() { if (navigator.onLine === false) { toast('Нет сети. Действие доступно только онлайн.', 'warn'); return false; } return true; }
  function phoneLine(x) { return x.phone ? fmtPhone(x.phone) : ''; }

  /* ---------- действия ---------- */
  function runAct(kind, it, a, card) {
    if (!requireOnline()) return;
    var who = it.name + (it.phone ? ' · ' + fmtPhone(it.phone) : '');
    var need = a.reason || a.confirm;
    var step = need ? confirmAct({ title: a.label + '?', who: who, text: a.confirm, reason: !!a.reason, yes: a.label, danger: a.cls === 'danger' }) : Promise.resolve({ reason: '' });
    step.then(function (ans) {
      if (!ans) return;
      var btns = card.querySelectorAll('.acts .btn'); [].forEach.call(btns, function (b) { b.disabled = true; b.classList.add('sending'); });
      call(KINDS[kind].action, { id: it.id, to: a.to, reason: ans.reason, from: it.statusText }).then(function (r) {
        if (r.ok) { toast(a.label + ': готово'); reloadAfter(kind); return; }
        [].forEach.call(btns, function (b) { b.disabled = false; b.classList.remove('sending'); });
        if (r.error === 'state') { toast('Уже изменено: статус «' + (r.statusText || r.status) + '». Список обновлён.', 'warn'); reloadAfter(kind); return; }
        if (r.error === 'auth' || r.error === 'disabled') return;
        toast(errText(r), 'bad');
      });
    });
  }
  function reloadAfter(tab) { loadTab(tab, true); loadSummary(); }
  function blockFlow(phone, name, fromForm) {
    var ph = String(phone || '').trim();
    return confirmAct({ title: 'Заблокировать доступ?', who: (name ? name + ' · ' : '') + (fmtPhone(normPhone(ph)) || ph), text: 'Сотрудник сразу потеряет доступ: новые коды не выдаются, открытые сессии закроются. Ведомость и CRM не меняются.', reason: true, reasonLabel: 'Причина блокировки', yes: 'Заблокировать', danger: true }).then(function (ans) {
      if (!ans) return null;
      return call('adminBlock', { phone: ph, reason: ans.reason }).then(function (r) {
        if (r.ok) { toast('Доступ закрыт'); reloadAfter('acc'); if (fromForm) fromForm(); return r; }
        if (r.error === 'state') { toast('Уже заблокирован. Список обновлён.', 'warn'); reloadAfter('acc'); return r; }
        if (r.error !== 'auth') toast(errText(r), 'bad'); return r;
      });
    });
  }
  function unblockFlow(it) {
    confirmAct({ title: 'Разрешить доступ?', who: (it.name ? it.name + ' · ' : '') + fmtPhone(it.phone), text: 'Сотрудник снова сможет войти по коду из Telegram.', yes: 'Разрешить' }).then(function (ans) {
      if (!ans) return;
      call('adminUnblock', { phone: it.phone }).then(function (r) {
        if (r.ok) { toast('Доступ возвращён'); reloadAfter('acc'); return; }
        if (r.error === 'state') { toast('Уже разрешён. Список обновлён.', 'warn'); reloadAfter('acc'); return; }
        if (r.error !== 'auth') toast(errText(r), 'bad');
      });
    });
  }

  /* ---------- карточки ---------- */
  function statusChip(kind, it) { var st = KINDS[kind].st[it.status] || [it.statusText || it.status, 'gray']; return chip(st[0], st[1], it.needs ? 'clock' : 'check'); }
  function actsRow(kind, it, card) {
    var list = KINDS[kind].acts.filter(function (a) { return a.from.indexOf(it.status) >= 0; });
    if (!list.length) return null;
    return h('div', { class: 'acts' }, list.map(function (a) { return h('button', { class: 'btn ' + (a.cls === 'ghost' ? 'ghost' : a.cls === 'secondary' ? 'secondary' : a.cls), type: 'button', 'data-testid': 'act-' + a.to + '-' + it.id, onclick: function () { runAct(kind, it, a, card); } }, a.label); }));
  }
  function headRow(it, right, meta) { return h('div', { class: 'hd' }, h('div', { class: 'grow' }, h('div', { class: 'nm', text: it.name || '—' }), h('div', { class: 'meta', text: meta })), right); }
  function cardAdv(it) {
    var c = h('article', { class: 'card acard', 'data-testid': 'card-' + it.id, 'data-status': it.status }); 
    c.appendChild(headRow(it, h('div', { class: 'amt num', text: money(it.amount) }), phoneLine(x2(it)) + ' · ' + dmyT(it.created)));
    c.appendChild(h('div', null, statusChip('adv', it)));
    c.appendChild(kv([['Неделя с (пн)', dmy(it.week)], ['Выдача (сб)', dmy(it.payDate)], ['Доступно на момент заявки', it.available ? money(it.available) : ''], ['Резерв', it.reserve ? money(it.reserve) : '']]));
    add(c, txt('Комментарий сотрудника', it.comment)); add(c, txt('Ответ админа', it.answer, 'ans')); add(c, actsRow('adv', it, c)); return c;
  }
  function x2(it) { return it; }
  function cardExpl(it) {
    var c = h('article', { class: 'card acard', 'data-testid': 'card-' + it.id, 'data-status': it.status });
    c.appendChild(headRow(it, it.amount ? h('div', { class: 'amt num', text: money(it.amount) }) : null, phoneLine(it) + ' · ' + dmyT(it.created)));
    c.appendChild(h('div', null, statusChip('expl', it)));
    c.appendChild(kv([['Вид', it.kind], ['Дата случая', dmy(it.caseDate)], ['Случай', it.caseId]]));
    add(c, txt('Объяснительная', it.text)); add(c, fileBtns(it.files)); add(c, txt('Комментарий админа', it.answer, 'ans')); add(c, actsRow('expl', it, c)); return c;
  }
  function cardInc(it) {
    var c = h('article', { class: 'card acard', 'data-testid': 'card-' + it.id, 'data-status': it.status });
    c.appendChild(headRow(it, null, phoneLine(it) + ' · ' + dmyT(it.created)));
    c.appendChild(h('div', null, statusChip('inc', it)));
    c.appendChild(kv([['Тип', it.type], ['Дата нарушения', dmy(it.date)]]));
    add(c, txt('Что произошло', it.desc)); add(c, txt('Объяснительная', it.text)); add(c, txt('Дополнение сотрудника', it.addendum, 'add'));
    add(c, fileBtns([].concat(it.scene || [], it.damage || [], it.acts || []))); add(c, txt('Решение админа', it.answer, 'ans')); add(c, actsRow('inc', it, c)); return c;
  }
  function cardApp(it) {
    var c = h('article', { class: 'card acard', 'data-testid': 'card-' + it.id, 'data-status': it.status });
    c.appendChild(headRow(it, null, phoneLine(it) + ' · ' + dmyT(it.created)));
    c.appendChild(h('div', null, statusChip('apps', it)));
    c.appendChild(kv([['Вакансия', it.title], ['Табельный №', it.tab]]));
    add(c, txt('Комментарий сотрудника', it.comment)); add(c, txt('Комментарий админа', it.answer, 'ans')); add(c, actsRow('apps', it, c)); return c;
  }
  function cardAcc(it) {
    var blocked = it.status === 'blocked', c = h('article', { class: 'card acard', 'data-testid': 'card-' + it.phone, 'data-status': it.status });
    c.appendChild(headRow(it, chip(blocked ? 'Заблокирован' : 'Разрешён', blocked ? 'bad' : 'ok', blocked ? 'lock' : 'check'), fmtPhone(it.phone)));
    c.appendChild(kv([['Когда (МСК)', it.at ? dmyT(it.at) : ''], ['Кем', it.by]])); add(c, txt('Причина', it.reason));
    if (blocked) c.appendChild(h('div', { class: 'acts' }, h('button', { class: 'btn ok', type: 'button', 'data-testid': 'act-unblock-' + it.phone, onclick: function () { unblockFlow(it); } }, 'Разрешить доступ')));
    else c.appendChild(h('div', { class: 'acts' }, h('button', { class: 'btn danger', type: 'button', 'data-testid': 'act-block-' + it.phone, onclick: function () { blockFlow(it.phone, it.name); } }, 'Заблокировать')));
    return c;
  }
  var CARD = { adv: cardAdv, expl: cardExpl, inc: cardInc, apps: cardApp, acc: cardAcc };

  /* ---------- вкладки-списки ---------- */
  var TITLES = { sum: 'Сводка', adv: 'Заявки на аванс', expl: 'Объяснения', inc: 'Происшествия', apps: 'Отклики на вакансии', acc: 'Доступ' };
  var FLT = { need: 'Требуют решения', all: 'Все', done: 'Решённые' }, FLT_ACC = { need: 'Заблокированные', all: 'Все', done: 'Разрешённые' };
  var EMPTY = { adv: ['wallet', 'заявок на аванс'], expl: ['file', 'объяснений'], inc: ['alert', 'происшествий'], apps: ['briefcase', 'откликов'], acc: ['lock', 'записей'] };
  function matches(tab, it, f, q) {
    var on = tab === 'acc' ? it.status === 'blocked' : it.needs;
    if (f === 'need' && !on) return false; if (f === 'done' && on) return false;
    if (q) { var s = (it.name + ' ' + (it.phone || '') + ' ' + fmtPhone(it.phone) + ' ' + (it.id || '')).toLowerCase().replace(/ё/g, 'е'), qq = q.trim().toLowerCase().replace(/ё/g, 'е'), qd = qq.replace(/\D/g, '');
      if (s.indexOf(qq) < 0 && !(qd.length >= 3 && String(it.phone || '').indexOf(qd) >= 0)) return false; }
    return true;
  }
  function viewList(tab) {
    var v = h('main', { class: 'view adm-tabs-pad', id: 'main' }), items = S.data[tab], f = S.filter[tab] || 'need', q = S.q[tab] || '';
    v.appendChild(pageHead(TITLES[tab]));
    if (tab === 'acc') v.appendChild(accForm());
    var seg = h('div', { class: 'segrow', role: 'group', 'aria-label': 'Фильтр по статусу', 'data-testid': 'filters' }), names = tab === 'acc' ? FLT_ACC : FLT;
    Object.keys(names).forEach(function (k) {
      var n = items ? items.filter(function (it) { return matches(tab, it, k, ''); }).length : null;
      seg.appendChild(h('button', { type: 'button', 'aria-pressed': f === k ? 'true' : 'false', 'data-testid': 'flt-' + k, onclick: function () { S.filter[tab] = k; render(); } }, names[k] + (n != null ? ' · ' + n : '')));
    });
    v.appendChild(seg);
    var si = h('input', { class: 'inp', type: 'search', 'data-testid': 'search', 'aria-label': 'Поиск по ФИО или телефону', placeholder: 'Поиск по ФИО или телефону', value: q, autocomplete: 'off', maxlength: '60' });
    si.addEventListener('input', function () { S.q[tab] = si.value; var pos = si.selectionStart; fillList(); si.focus(); try { si.setSelectionRange(pos, pos); } catch (e) { /* ignore */ } });
    v.appendChild(h('div', { class: 'adm-search' }, ico('search', 'sm'), si));
    var box = h('div', { 'data-testid': 'list' }); v.appendChild(box);
    function fillList() {
      clear(box);
      if (S.err[tab] && !items) { box.appendChild(errBox(S.err[tab], function () { loadTab(tab, true); })); return; }
      if (!items) { box.appendChild(skeleton()); return; }
      if (S.err[tab]) box.appendChild(errBox(S.err[tab] + ' Показаны ранее загруженные данные.', function () { loadTab(tab, true); }));
      var list = items.filter(function (it) { return matches(tab, it, S.filter[tab] || 'need', S.q[tab] || ''); });
      if (!list.length) {
        var all = items.length, cur = S.filter[tab] || 'need', e = EMPTY[tab];
        box.appendChild(S.q[tab] ? empty('search', 'Ничего не найдено', 'Проверьте ФИО или телефон либо смените фильтр.') : cur === 'need' ? empty('check', 'Всё разобрано', all ? 'Нет ' + e[1] + ', которые требуют решения. Переключите фильтр на «Все», чтобы увидеть историю.' : 'Пока нет ' + e[1] + '.') : empty(e[0], 'Пусто', 'Нет ' + e[1] + ' в этом фильтре.'));
        return;
      }
      var wrap = h('div', { class: 'alist' }); list.forEach(function (it) { wrap.appendChild(CARD[tab](it)); }); box.appendChild(wrap);
    }
    fillList(); return v;
  }
  function accForm() {
    var inp = h('input', { class: 'inp', type: 'tel', inputmode: 'tel', 'data-testid': 'acc-phone', 'aria-label': 'Телефон сотрудника', placeholder: '+7 900 123-45-67', autocomplete: 'off', maxlength: '24' });
    return h('section', { class: 'card blockform', 'aria-labelledby': 'bf-h' }, h('h2', { id: 'bf-h', text: 'Заблокировать по телефону' }), inp,
      h('button', { class: 'btn danger', type: 'button', 'data-testid': 'acc-block', onclick: function () {
        if (inp.value.replace(/\D/g, '').length < 10) { toast(ERR.bad_phone, 'bad'); inp.focus(); return; }
        blockFlow(inp.value, '', function () { inp.value = ''; }); } }, ico('lock', 'sm'), 'Заблокировать…'),
      h('p', { class: 'help', text: 'Причину введёте в следующем окне. Вернуть доступ можно кнопкой «Разрешить» в списке.' }));
  }

  /* ---------- сводка ---------- */
  function viewSum() {
    var v = h('main', { class: 'view adm-tabs-pad', id: 'main' }), s = S.sum;
    v.appendChild(pageHead('Сводка'));
    if (S.err.sum && !s) { v.appendChild(errBox(S.err.sum, function () { loadSummary(); })); return v; }
    if (!s) { v.appendChild(skeleton()); return v; }
    if (S.err.sum) v.appendChild(errBox(S.err.sum + ' Показаны ранее загруженные данные.', function () { loadSummary(); }));
    var g = h('div', { class: 'sumgrid', 'data-testid': 'sum-grid' });
    function tile(tab, n, label, sub, id) { return h('button', { class: 'card sumcard', type: 'button', 'data-testid': id, onclick: function () { go(tab); } }, h('span', { class: 'n num' + (n > 0 && tab !== 'acc' ? ' hot' : ''), text: String(n) }), h('span', { class: 'l', text: label }), sub ? h('span', { class: 's', text: sub }) : null); }
    g.appendChild(tile('adv', s.advances.pending, 'Авансы на рассмотрении', s.advances.pending ? 'на ' + money(s.advances.pendingSum) : 'новых нет', 'sum-adv'));
    g.appendChild(tile('adv', s.advances.approved, 'Одобрено, ждёт выдачи', s.advances.approved ? 'на ' + money(s.advances.approvedSum) + (s.payDate ? ' · выдача ' + dmy(s.payDate) : '') : 'нет', 'sum-adv-ok'));
    g.appendChild(tile('expl', s.explanations.sent, 'Объяснения на проверке', '', 'sum-expl'));
    g.appendChild(tile('inc', s.incidents.review, 'Происшествия на проверке', '', 'sum-inc'));
    g.appendChild(tile('apps', s.applications.sent, 'Новые отклики', '', 'sum-apps'));
    g.appendChild(tile('acc', s.blocked, 'Заблокировано', s.blocked ? 'доступ закрыт' : 'никто не заблокирован', 'sum-acc'));
    v.appendChild(g);
    v.appendChild(h('section', { class: 'card stack', 'aria-labelledby': 'ref-h' }, h('h2', { id: 'ref-h', text: 'Справочники (только просмотр)' }),
      h('div', { class: 'btnrow' }, h('button', { class: 'btn ghost', type: 'button', 'data-testid': 'open-jobs', onclick: function () { openRO('adminJobs', 'Вакансии'); } }, 'Вакансии'), h('button', { class: 'btn ghost', type: 'button', 'data-testid': 'open-promos', onclick: function () { openRO('adminPromos', 'Акции'); } }, 'Акции')),
      h('p', { class: 'help', text: 'Редактируются прямо в таблице приложения (вкладки «Вакансии» и «Акции»).' })));
    var lg = h('section', { class: 'card', 'aria-labelledby': 'log-h', 'data-testid': 'log-card' }, h('h2', { id: 'log-h', text: 'Последние действия' }));
    if (S.log && S.log.length) S.log.slice(0, 8).forEach(function (x) { lg.appendChild(h('div', { class: 'logrow' }, h('time', { text: dmyT(x.at) }), h('b', { text: x.action }), h('span', { text: x.object + (x.details ? ' · ' + x.details : '') }))); });
    else lg.appendChild(h('p', { class: 'cap mt', text: 'Пока действий нет.' }));
    v.appendChild(lg);
    return v;
  }
  function openRO(action, title) {
    var body = h('div', { class: 'gap12' }, h('div', { class: 'sk c' }));
    openDialog({ title: title, body: body });
    call(action).then(function (r) {
      clear(body);
      if (!r.ok) { body.appendChild(h('p', { class: 'err', text: errText(r) })); return; }
      if (!r.items.length) { body.appendChild(h('p', { class: 'cap', text: 'Строк нет.' })); return; }
      r.items.forEach(function (it) { var d = h('div', { class: 'ro-cols card', 'data-testid': 'ro-row' }); it.cols.forEach(function (c) { if (c.v) d.appendChild(h('div', null, h('span', { text: c.k }), h('span', { text: c.v }))); }); body.appendChild(d); });
    });
  }

  /* ---------- каркас ---------- */
  function pageHead(title) {
    var busy = !!S.loading.any;
    return h('div', { class: 'adm-title' }, h('div', { class: 'grow' }, h('h1', { text: title, 'data-testid': 'page-title' }), h('div', { class: 'sub' }, 'Кабинет админа', LIVE ? null : h('span', { class: 'demobadge', 'data-testid': 'demo-badge', text: 'ДЕМО' }))),
      h('div', { class: 'adm-tools' },
        h('button', { class: 'iconbtn' + (busy ? ' spin' : ''), type: 'button', 'aria-label': 'Обновить', title: 'Обновить', 'data-testid': 'refresh', onclick: refreshAll }, ico('refresh')),
        h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Сменить тему', 'data-testid': 'theme', onclick: toggleTheme }, ico(document.documentElement.getAttribute('data-theme') === 'dark' ? 'sun' : 'moon')),
        h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Выйти', 'data-testid': 'adm-logout', onclick: function () { confirmAct({ title: 'Выйти из кабинета?', text: 'Чтобы войти снова, понадобится новый код из Telegram.', yes: 'Выйти', danger: true }).then(function (a) { if (a) endSession(); }); } }, ico('logout'))));
  }
  function counts() { var s = S.sum; return s ? { adv: s.advances.pending, expl: s.explanations.sent, inc: s.incidents.review, apps: s.applications.sent } : {}; }
  function renderTabs() {
    clear(tabbar); var c = counts();
    TABS.forEach(function (t) {
      var n = c[t[0]] || 0;
      tabbar.appendChild(h('a', { class: 'tab', href: '#/' + t[0], 'data-tab': t[0], 'aria-current': S.tab === t[0] ? 'page' : null, 'aria-label': t[1] + (n ? ', требуют решения: ' + n : '') }, ico(t[2]), h('span', { text: t[1] }), n ? h('span', { class: 'cnt', 'data-testid': 'cnt-' + t[0], text: String(n) }) : null));
    });
  }
  function offlineBanner() { var o = $('#offline'); o.hidden = navigator.onLine !== false; if (!o.hidden) { clear(o); o.appendChild(ico('wifioff', 'sm')); o.appendChild(document.createTextNode(' Нет сети — действия недоступны, данные могли устареть')); } }
  function go(tab) { location.hash = '#/' + tab; }
  function render() {
    if (!session()) return renderLogin();
    var r = (location.hash.replace(/^#\//, '') || 'sum'); if (!TITLES[r]) r = 'sum'; S.tab = r;
    document.title = TITLES[r] + ' · Кабинет админа';
    tabbar.hidden = false; offlineBanner(); var y = window.scrollY; clear(root);
    root.appendChild(r === 'sum' ? viewSum() : viewList(r)); renderTabs();
    if (S.lastTab === r) window.scrollTo(0, y); else window.scrollTo(0, 0); S.lastTab = r;
  }
  function loadSummary() {
    if (!session()) return Promise.resolve();
    return Promise.all([call('adminSummary'), call('adminLog')]).then(function (rs) {
      if (!session()) return;
      if (rs[0].ok) { S.sum = rs[0]; delete S.err.sum; S.log = rs[1].ok ? rs[1].items : S.log; } else if (rs[0].error !== 'auth') S.err.sum = errText(rs[0]);
      render();
    });
  }
  function loadTab(tab, force) {
    if (!session() || tab === 'sum') return Promise.resolve();
    if (S.data[tab] && !force) return Promise.resolve();
    S.loading.any = true; if (force || !S.data[tab]) render();
    return call(LIST_ACTION[tab]).then(function (r) {
      S.loading.any = false; if (!session()) return;
      if (r.ok) { S.data[tab] = r.items; delete S.err[tab]; } else if (r.error !== 'auth') S.err[tab] = errText(r);
      render();
    });
  }
  function refreshAll() { if (!requireOnline()) return; S.loading.any = true; render(); Promise.all([loadSummary(), S.tab === 'sum' ? Promise.resolve() : loadTab(S.tab, true)]).then(function () { S.loading.any = false; render(); }); }
  window.addEventListener('hashchange', function () { if (session()) { render(); loadTab(S.tab); } });
  window.addEventListener('online', function () { if (session()) { toast('Связь восстановлена'); refreshAll(); } });
  window.addEventListener('offline', function () { if (session()) { render(); toast('Нет сети', 'warn'); } });
  function boot() {
    if (!session()) { renderLogin(); return; }
    if (!/^#\/(sum|adv|expl|inc|apps|acc)$/.test(location.hash)) location.hash = '#/sum';
    render(); loadSummary(); loadTab(location.hash.slice(2));
  }
  boot();
})();
