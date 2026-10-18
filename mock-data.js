/* ВСЕ ДАННЫЕ ВЫМЫШЛЕНЫ. Имена, телефоны, суммы и случаи — тестовые, к реальным сотрудникам отношения не имеют. */
(function () {
  'use strict';
  var SHARE = 0.65;   // «% на ЗП» из ведомости

  // Участки (зоны) и операции — структура вкладки «Нормативы по участкам»:
  // «Участок / операция», «Зона», «Норматив, ед/час», «Тариф, ₽/ед». Названия, нормативы и тарифы взяты из справочника; факт — демонстрационный.
  var HOURS_SHIFT = 11;   // «Часов в смене» (ячейка B3 вкладки)
  var ZONES = [
    { id: 'WH', name: 'WH (склад)', tip: 'Держите маршрут без порожних ходок: берите следующую паллету по пути, готовьте плёнку и ярлыки заранее, проверяйте маркировку до погрузки.' },
    { id: 'ADAPTO', name: 'ADAPTO', tip: 'Держите темп линии: заранее берите следующую паллету/ящик и не останавливайте поток на ручной сверке.' },
    { id: 'HOURLY', name: 'Часовые услуги', tip: 'Часы по табелю бригадира: часы × тариф заказчика за час. В производительность идут нормо-часы (сумма по тарифу ÷ 830 ₽).' }
  ];
  var TIP_PAL = 'Собирайте паллеты пачкой по маршруту, не возвращайтесь порожняком к зоне; подготовьте плёнку и ярлыки заранее.';
  var TIP_BOX = 'Сканируйте короба подряд без пауз, сверяйте ШК до закрытия; пересорт дороже потерянных секунд.';
  var TIP_ADP = 'Держите темп на линии: заранее берите следующую паллету/ящик и не останавливайте поток на ручной сверке.';
  var OPS = [
    { id: 'xdrecv', zone: 'WH', name: 'XD, приёмка (пал)', tariff: 11.87, normH: 75, tip: TIP_BOX },
    { id: 'xdput', zone: 'WH', name: 'XD, размещение паллет', tariff: 26.97, normH: 28, tip: TIP_PAL },
    { id: 'bbput', zone: 'WH', name: 'BBXD, размещение паллет', tariff: 35.95, normH: 21, tip: TIP_PAL },
    { id: 'roll', zone: 'WH', name: 'Накатка раундов паллет', tariff: 25.17, normH: 30, tip: TIP_PAL },
    { id: 'truck', zone: 'WH', name: 'Загрузка в ТС Тент', tariff: 20.70, normH: 43, tip: 'Формируйте паллеты под машину заранее и проверяйте маркировку до погрузки — так не приходится выгружать обратно.' },
    { id: 'bbbox', zone: 'WH', name: 'BBXD, раздел BOX', tariff: 14.80, normH: 51, tip: TIP_BOX },
    { id: 'bbmove', zone: 'WH', name: 'BBXD, перемещение', tariff: 10.79, normH: 70, tip: TIP_BOX },
    { id: 'cs04u', zone: 'WH', name: 'CS, сборка 04U', tariff: 7.06, normH: 107, tip: TIP_BOX },
    { id: 'ngb', zone: 'WH', name: 'Отгрузка, накатка паллет NGB', tariff: 34.32, normH: 22, tip: TIP_PAL },
    { id: 'ad10p', zone: 'ADAPTO', name: 'ADAPTO, отдел 10, PAL', tariff: 3.15, normH: 240, tip: TIP_ADP },
    { id: 'ad10d', zone: 'ADAPTO', name: 'ADAPTO, отдел 10, DEPAL', tariff: 2.94, normH: 257, tip: TIP_ADP },
    { id: 'ad4p', zone: 'ADAPTO', name: 'ADAPTO, отдел 4, PAL', tariff: 3.27, normH: 231, tip: TIP_ADP }
  ];
  var OPI = {}; OPS.forEach(function (o) { OPI[o.id] = o; });

  function mulberry(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  var rnd = mulberry(20260916);
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function iso(ms) { var d = new Date(ms); return d.getUTCFullYear() + '-' + p2(d.getUTCMonth() + 1) + '-' + p2(d.getUTCDate()); }
  function monday(ds) { var a = ds.split('-'), t = Date.UTC(+a[0], +a[1] - 1, +a[2]), dow = (new Date(t).getUTCDay() + 6) % 7; return iso(t - dow * 86400000); }
  function addDays(ds, n) { var a = ds.split('-'); return iso(Date.UTC(+a[0], +a[1] - 1, +a[2]) + n * 86400000); }

  // Смена в «Выработке»: одна строка на (человек, дата, смена, участок): «Кол-во единиц», «Производительность», «Сумма по тарифу, ₽», «Зачёт смены».
  // Разбивки по операциям в таблице НЕТ. Внутри демо-генератора единицы получаются из часов × норматив операций участка,
  // но наружу отдаются только итоги смены (units, norm = units ÷ производительность, tsum, tfull = тариф смены при 100% норматива, zone, counted).
  function mkShift(date, type, hours, ops) {
    var units = 0, norm = 0, tsum = 0, zone = OPI[ops[0][0]].zone;
    ops.forEach(function (o) { var d = OPI[o[0]], u = o[3] != null ? o[3] : Math.round(o[1] * d.normH * o[2] / 100); units += u; norm += o[1] * d.normH; tsum += u * d.tariff; });
    var tfull = units ? tsum * norm / units : 0;   // как сервер: сумма по тарифу ÷ производительность (units ÷ norm)
    return { date: date, type: type, label: zone === 'ADAPTO' ? (type === 'day' ? 'День' : 'Ночь 1/Ночь 2') : null, hours: 11, zone: zone, counted: true, units: units, norm: norm, tsum: tsum, tfull: Math.round(tfull * 100) / 100 };
  }
  // Смены: график 2 через 2 (день, день, ночь, ночь, выходной, выходной)
  var handmade = { // 16–29.09 — «живой» период, задан вручную
    '2026-09-16': ['day', 11, [['roll', 6, 98], ['truck', 5, 92]]],
    '2026-09-17': ['day', 11, [['xdput', 6, 108], ['bbbox', 5, 101]]],
    '2026-09-18': ['night', 11, [['ad10p', 6, 84], ['ad10d', 5, 79]]],
    '2026-09-19': ['night', 11, [['xdrecv', 5, 57], ['bbmove', 6, 63]]],
    '2026-09-22': ['day', 11, [['roll', 8, 112], ['truck', 3, 106]]],
    '2026-09-23': ['day', 11, [['cs04u', 6, 91], ['xdput', 5, 87]]],
    '2026-09-24': ['night', 11, [['bbput', 5, 42], ['xdrecv', 6, 46]]],
    '2026-09-25': ['night', 11, [['ngb', 6, 103], ['xdput', 5, 99]]],
    '2026-09-28': ['day', 12, [['roll', 7, 117, 246], ['truck', 5, 111, 238]]],
    '2026-09-29': ['day', 11, [['bbbox', 6, 111, 339], ['xdput', 5, 106, 149]]]
  };
  var shifts = [];
  var start = Date.UTC(2026, 7, 1), end = Date.UTC(2026, 8, 30);
  for (var t = start; t <= end; t += 86400000) {
    var idx = (Math.round((t - start) / 86400000) + 2) % 6;
    var date = iso(t), type = idx < 2 ? 'day' : idx < 4 ? 'night' : null;
    if (!type) continue;
    if (date >= '2026-09-16') {
      var hm = handmade[date];
      if (hm) shifts.push(mkShift(date, hm[0], hm[1], hm[2]));
      else if (date === '2026-09-30') shifts.push({ date: date, type: type, hours: 11, zone: 'WH', counted: false, units: 0, norm: 0, tsum: 0, tfull: 0, planned: true });
      continue;
    }
    var hrs = rnd() < 0.15 ? 12 : 11, i1 = Math.floor(rnd() * OPS.length), i2 = i1, h1 = Math.round(hrs * (0.4 + rnd() * 0.3));
    var zn = OPS[i1].zone, pool = OPS.filter(function (o) { return o.zone === zn; }), o2 = pool[Math.floor(rnd() * pool.length)];
    shifts.push(mkShift(date, type, hrs, [[OPS[i1].id, h1, Math.round(48 + rnd() * 62)], [o2.id, hrs - h1, Math.round(48 + rnd() * 62)]]));
  }

  // HOURLY_V1: демо часовых услуг (табель) — только с ?hz=1, чтобы прежние демо-сценарии и тесты не менялись.
  // Сервер отдаёт так же: день со сдельщиной получает hz и tsum += hz.tsum; день только с часовыми — смена зоны HOURLY (units 0, norm 0).
  var HZ_DEMO = /[?&]hz=1\b/.test((typeof location !== 'undefined' && location.search) || '');
  if (HZ_DEMO) {
    var hzItem = function (service, hours, rate) { var ts = Math.round(hours * rate * 100) / 100; return { service: service, hours: hours, rate: rate, tsum: ts, nh: Math.round(ts / 830 * 1000) / 1000 }; };
    var hzOf = function (items) { var o = { hours: 0, tsum: 0, nh: 0, items: items }; items.forEach(function (x) { o.hours += x.hours; o.tsum += x.tsum; o.nh += x.nh; }); o.tsum = Math.round(o.tsum * 100) / 100; o.nh = Math.round(o.nh * 1000) / 1000; return o; };
    shifts.forEach(function (x) { if (x.date === '2026-09-23') { x.hz = hzOf([hzItem('BBXD, приёмка', 2, 980)]); x.tsum += x.hz.tsum; } });
    var hz26 = hzOf([hzItem('Обеспечение рабочего состояния зон хранения, сборки и погрузки склада', 8, 660), hzItem('BBXD, сервисный тариф, закрытие паллет', 3, 830)]);
    shifts.push({ date: '2026-09-26', type: 'day', label: null, hours: hz26.hours, zone: 'HOURLY', counted: true, units: 0, norm: 0, tsum: hz26.tsum, tfull: 0, hz: hz26 });
    shifts.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    OPS.push({ id: 'oh1', zone: 'HOURLY', name: 'BBXD, сервисный тариф, закрытие паллет', tariff: 830, normH: 0, perHour: true, tip: '' },
      { id: 'oh2', zone: 'HOURLY', name: 'BBXD, приёмка', tariff: 980, normH: 0, perHour: true, tip: '' },
      { id: 'oh3', zone: 'HOURLY', name: 'Обеспечение рабочего состояния зон хранения, сборки и погрузки склада', tariff: 660, normH: 0, perHour: true, tip: '' });
  }

  function photo(label, hue) {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(' + hue + ',35%,62%)"/><stop offset="1" stop-color="hsl(' + hue + ',40%,38%)"/></linearGradient></defs>' +
      '<rect width="320" height="240" fill="url(#g)"/><rect x="70" y="80" width="180" height="110" rx="6" fill="#c8a06a" stroke="#8a6a3c" stroke-width="3"/>' +
      '<path d="M70 80l30-30h120l30 30" fill="#d9b27c" stroke="#8a6a3c" stroke-width="3"/><path d="M130 100l18 26-14 20 22 30" fill="none" stroke="#5a3d1c" stroke-width="4"/>' +
      '<text x="160" y="222" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#fff">' + label + '</text></svg>';
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  var cases = [
    // период 16–30.09 (текущий)
    { id: 'c101', periodId: '2026-09b', date: '2026-09-19', kind: 'brak', title: 'Повреждение упаковки, паллета №4471', amount: 3200, damage: true, expl: { status: 'waiting' } },
    { id: 'c102', periodId: '2026-09b', date: '2026-09-23', kind: 'brak', title: 'Вмятина на коробе при перемещении', amount: 2000, damage: true,
      expl: { status: 'sent', text: 'Короб задел вилочным погрузчиком при повороте в проходе, груз поехал. Сразу сообщил бригадиру, фото повреждения прилагаю.', sentAt: '2026-09-24T10:12:00' } },
    { id: 'c103', periodId: '2026-09b', date: '2026-09-22', kind: 'error', title: 'Пересорт: отгружен артикул не по заявке', amount: 1000, damage: false,
      expl: { status: 'accepted', text: 'Артикулы в соседних ячейках были похожи, ярлык на ячейке был стёрт. Перепроверил остальные позиции заявки.', sentAt: '2026-09-23T09:05:00' } },
    { id: 'c104', periodId: '2026-09b', date: '2026-09-25', kind: 'error', title: 'Повреждение маркировки при переклейке', amount: 500, damage: true, expl: { status: 'waiting' } },
    { id: 'c109', periodId: '2026-09b', date: '2026-09-27', kind: 'error', title: 'Неверное количество в накладной', amount: 700, damage: false, expl: { status: 'waiting' } },
    { id: 'c105', periodId: '2026-09b', date: '2026-09-19', kind: 'advance', title: 'Аванс (выдан 19.09)', amount: 8000 },
    { id: 'c106', periodId: '2026-09b', date: '2026-09-26', kind: 'advance', title: 'Аванс (выдан 26.09)', amount: 10000 },
    { id: 'c107', periodId: '2026-09b', date: '2026-09-16', kind: 'housing', title: 'Проживание, 16.09–30.09', amount: 9000 },
    { id: 'c108', periodId: '2026-09b', date: '2026-09-26', kind: 'other', title: 'Спецодежда: перчатки, 2 пары', amount: 500 },
    // период 01–15.09
    { id: 'c201', periodId: '2026-09a', date: '2026-09-01', kind: 'housing', title: 'Проживание, 01.09–15.09', amount: 9000 },
    { id: 'c202', periodId: '2026-09a', date: '2026-09-05', kind: 'advance', title: 'Аванс (выдан 05.09)', amount: 5000 },
    { id: 'c203', periodId: '2026-09a', date: '2026-09-09', kind: 'error', title: 'Неверное количество в накладной', amount: 800, damage: false,
      expl: { status: 'accepted', text: 'Пересчитал позиции вручную, ошибся при сканировании двух коробов. Впредь сверяю с накладной перед закрытием.', sentAt: '2026-09-10T11:20:00' } },
    // период 16–31.08
    { id: 'c301', periodId: '2026-08b', date: '2026-08-16', kind: 'housing', title: 'Проживание, 16.08–31.08', amount: 9000 },
    { id: 'c302', periodId: '2026-08b', date: '2026-08-29', kind: 'advance', title: 'Аванс (выдан 29.08)', amount: 10000 },
    { id: 'c303', periodId: '2026-08b', date: '2026-08-20', kind: 'brak', title: 'Разбита единица товара при укладке', amount: 2500, damage: true,
      expl: { status: 'accepted', text: 'Коробка упала со стеллажа нижнего яруса, когда снимал верхнюю паллету. Повреждение зафиксировал на фото.', sentAt: '2026-08-21T08:40:00' } },
    // период 01–15.08
    { id: 'c401', periodId: '2026-08a', date: '2026-08-01', kind: 'housing', title: 'Проживание, 01.08–15.08', amount: 9000 },
    { id: 'c402', periodId: '2026-08a', date: '2026-08-08', kind: 'advance', title: 'Аванс (выдан 08.08)', amount: 5000 }
  ];

  // Периоды: 01–15 и 16–конец месяца (30/31, февраль 28/29). id = 'ГГГГ-ММa' (1–15) / 'ГГГГ-ММb' (16–конец).
  function monthEnd(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
  function periodOf(ds) {
    var y = +ds.slice(0, 4), m = +ds.slice(5, 7), d = +ds.slice(8, 10), ym = ds.slice(0, 7), first = d <= 15;
    var start = ym + (first ? '-01' : '-16'), end = ym + '-' + p2(first ? 15 : monthEnd(y, m));
    return { id: ym + (first ? 'a' : 'b'), start: start, end: end, payDate: first ? ym + '-17' : addDays(end, 5) };   // выплата: 01–15 → 17-го того же месяца; 16–конец → 5-го следующего
  }
  // список периодов от «первого периода с данными» до текущего (новые сверху); статус считается по «сегодня»
  function buildPeriods(today, firstDay) {
    var out = [], cur = periodOf(today), p = periodOf(firstDay || '2026-08-01');
    for (var guard = 0; guard < 240; guard++) {
      var q = { id: p.id, start: p.start, end: p.end, payDate: p.payDate };
      q.status = today >= q.start && today <= q.end ? 'open' : today > q.payDate ? 'paid' : today > q.end ? 'closed' : 'future';
      if (q.start <= today) out.unshift(q);
      if (p.id === cur.id || p.start > today) break;
      p = periodOf(addDays(p.end, 1));
    }
    return out;
  }
  window.MOCK = {
    periodOf: periodOf, buildPeriods: buildPeriods, monthEnd: monthEnd,
    SHARE: SHARE, OPS: OPS, ZONES: ZONES, HOURS_SHIFT: HOURS_SHIFT, monday: monday, addDays: addDays,
    today: '2026-09-30',
    config: { codeTtlMin: 10, resendSec: 30, reqMax: 3, wrongMax: 2, windowH: 3, normGood: 100, normHigh: 115, normLow: 50, deductShare: 0.5, advWeekLimit: 10000, advShare: 0.7, advStep: 500, advMin: 500, advDeadlineDow: 5, advDeadlineHour: 18, advPayDow: 6, incidentReserve: 1500, explMin: 20, maxPhotos: 5, commentMax: 200, incDescMin: 5, anonMin: 10, anonMax: 1500, anonMinSec: 3, anonDayLimit: 3, anonHourGlobal: 20, anonPhotoMaxKB: 1500, jobCommentMax: 300, incDescMin: 5, incDescMax: 120, explMax: 1000, maxActs: 3, pdfMaxMB: 5, imgSrcMaxMB: 25 },
    users: [{ phone: '79000000001', id: 'ПР-0042', name: 'Тестов Иван Петрович', position: 'Комплектовщик', site: 'СК Северная Звезда', employer: 'ООО «Персональное Решение»' }],
    periods: [],   // строятся в app.js из «сегодня»: buildPeriods(today)
    shifts: shifts,
    cases: cases,
    incidents: [
      { id: 'i1', rid: null, date: '2026-09-12', type: 'damage', desc: 'Разбит защитный борт стеллажа, секция B-14', text: 'При разгрузке паллеты вилочный погрузчик задел защитный борт стеллажа. Сообщил бригадиру сразу, зону огородил. Акт составлен на месте.',
        scene: [{ kind: 'image', name: 'scene1.jpg', thumb: photo('Место (демо)', 200), w: 1280, h: 960, size: 176000 }],
        damage: [{ kind: 'image', name: 'damage1.jpg', thumb: photo('Порча (демо)', 20), w: 1280, h: 960, size: 192000 }],
        acts: [{ kind: 'pdf', name: 'akt-12-09.pdf', size: 412000 }], status: 'accepted', sentAt: '2026-09-12T18:40:00' }
    ],
    // «Акции» — вкладка таблицы, ведёт админ: ID | Название | Бонус | Описание | Начало | Конец | Условия | Показывать | Фото (ссылки Google Drive, в приложение приходят готовым массивом photos[]). Статус считается от даты.
    promos: [
      { id: 'p1', title: 'Бонус за выход в выходные', photos: ['demo-photos/promo-weekend-1.jpg', 'demo-photos/promo-weekend-2.jpg', 'demo-photos/promo-weekend-3.jpg', 'demo-photos/promo-weekend-4.jpg'], bonus: '+1 000 ₽ за доп. смену', desc: 'Выходите на дополнительную смену в субботу или воскресенье — получите фиксированную доплату к начислению.', from: '2026-09-01', to: '2026-10-31',
        terms: ['Смена не менее 11 часов', 'Выход согласован с бригадиром до 18:00 накануне', 'По этой смене нет неразобранных случаев брака', 'Доплата добавляется в «Ведомость» в периоде смены'] },
      { id: 'p2', title: 'Неделя без брака', bonus: '+1 500 ₽', desc: 'Отработайте неделю без брака и ошибок по своей смене — премия за аккуратность.', from: '2026-09-28', to: '2026-10-04',
        terms: ['Минимум 3 смены за неделю', 'Ни одного случая брака или ошибки за эти смены', 'Выполнение норматива не ниже 80%'] },
      { id: 'p3', title: 'Ночная надбавка в октябре', bonus: '+10% к тарифу', desc: 'Для ночных смен с 5 по 31 октября тариф повышается на 10%.', from: '2026-10-05', to: '2026-10-31',
        terms: ['Только ночные смены (с 20:00 до 08:00)', 'Надбавка считается от «Выработки по тарифу»', 'Действует на участках WH и ADAPTO'] },
      { id: 'p4', title: 'Премия за 6 месяцев стажа', photos: ['demo-photos/promo-nodefect-1.jpg'], bonus: '3 000 ₽ единоразово', desc: 'Единоразовая премия тем, кто отработал в компании полгода без длительных перерывов.', from: '2026-10-15', to: '2026-12-31',
        terms: ['Стаж от 6 месяцев на дату окончания акции', 'Перерыв в работе не более 14 дней подряд', 'Выплачивается с ближайшим расчётом после проверки'] },
      { id: 'p5', title: 'Летний бонус за посещаемость', bonus: '2 000 ₽', desc: 'Премия за месяц без прогулов и опозданий. Акция завершена.', from: '2026-07-01', to: '2026-08-31',
        terms: ['Без прогулов и опозданий в течение месяца', 'Подтверждается табелем'] }
    ],
    // «Вакансии» — вкладка таблицы, ведёт админ: ID | Должность | Участок | График | Оплата | Требования | Контакт (имя, роль, как связаться) | Статус (открыта/закрыта) | Фото (ссылки Drive → photos[]). В демо фото — локальные файлы из demo-photos/.
    jobs: [
      { id: 'j1', title: 'Бригадир смены', zone: 'WH (склад)', schedule: '2/2, смены по 11 часов (день)', pay: 'от 70 000 ₽ на руки + премия по выработке смены', status: 'open',
        reqs: ['Опыт работы на складе от 1 года', 'Умение работать с ТСД и учётом', 'Ответственность, готовность вести бригаду 15–20 человек', 'Допуск к технике — плюс'],
        contact: { name: 'Мария О. (демо)', role: 'HR-менеджер', how: 'Telegram @demo_hr_maria · +7 900 000-00-90' } },
      { id: 'j2', title: 'Оператор штабелёра / ричтрака', photos: ['demo-photos/job-brigadier-1.jpg', 'demo-photos/job-brigadier-2.jpg', 'demo-photos/job-brigadier-3.jpg'], zone: 'WH (склад)', schedule: '2/2, ночные смены по 11 часов', pay: 'тариф × 65% + надбавка за технику 8 000 ₽/мес', status: 'open',
        reqs: ['Действующее удостоверение на погрузчик', 'Опыт от 6 месяцев', 'Медкнижка', 'Соблюдение правил ОТ и ТБ'],
        contact: { name: 'Мария О. (демо)', role: 'HR-менеджер', how: 'Telegram @demo_hr_maria · +7 900 000-00-90' } },
      { id: 'j3', title: 'Контролёр качества (ОТК)', photos: ['demo-photos/job-forklift-1.jpg', 'demo-photos/job-forklift-2.jpg'], zone: 'ADAPTO', schedule: '5/2, 8 часов, дневные', pay: '55 000–62 000 ₽ на руки', status: 'open',
        reqs: ['Внимательность, аккуратность', 'Уверенный пользователь ПК', 'Опыт в контроле качества — плюс'],
        contact: { name: 'Олег В. (демо)', role: 'Руководитель участка ADAPTO', how: 'Telegram @demo_adapto_oleg · +7 900 000-00-91' } },
      { id: 'j4', title: 'Кладовщик-приёмщик', zone: 'WH (склад)', schedule: '2/2, дневные по 11 часов', pay: '64 000 ₽ на руки', status: 'closed',
        reqs: ['Опыт приёмки товара', 'Знание 1С или аналога'],
        contact: { name: 'Мария О. (демо)', role: 'HR-менеджер', how: 'Telegram @demo_hr_maria · +7 900 000-00-90' } }
    ],
    applications: [
      { id: 'ap1', jobId: 'j3', comment: 'Работал в ОТК на прошлом месте, готов выйти после согласования смен.', sentAt: '2026-09-26T11:05:00', status: 'viewed' }
    ],
    advances: [
      { id: 'a1', date: '2026-09-24', time: '09:12', amount: 10000, comment: 'Нужно оплатить жильё', status: 'issued', answer: '' },
      { id: 'a2', date: '2026-09-16', time: '13:40', amount: 8000, comment: '', status: 'issued', answer: '' },
      { id: 'a3', date: '2026-09-10', time: '10:05', amount: 12000, comment: 'Срочно, семейные обстоятельства', status: 'rejected', answer: 'Сумма больше доступной на тот момент (лимит недели 10 000 ₽, заработано меньше).' },
      { id: 'a4', date: '2026-09-03', time: '08:55', amount: 5000, comment: '', status: 'issued', answer: '' },
      { id: 'a5', date: '2026-08-27', time: '17:20', amount: 10000, comment: '', status: 'issued', answer: '' },
      { id: 'a6', date: '2026-08-06', time: '12:10', amount: 5000, comment: '', status: 'issued', answer: '' }
    ]
  };
  window.MOCK.advances.forEach(function (a) { a.week = monday(a.date); a.payDate = addDays(a.week, 5); });
  window.MOCK.periods.forEach(function (p) { });
  window.MOCK.foreman = {"ok": true, "period": "01.10.2026 – 31.10.2026", "scheme": "С порогом", "threshold": 0.5, "benchPeople": 15, "benchPlan": 1.2, "benchPay": 240000, "rate": 22857.14, "people": 16, "shifts": 112, "avg": 0.5539999999999999, "pay": 16244.1, "at100": 182857.14, "at120": 256000, "plus1": 3657.14, "plus10": 36571.43, "needPlan": 1.156, "defects": 33852.89, "lost": 3385.29, "damageShare": 0.1, "damageMode": "Вычет доли ущерба", "team": [{"name": "Герасименко Яна", "shifts": 11, "perf": 0.9570000000000001, "contrib": 10442.83, "defects": 0, "net": 10442.83}, {"name": "Егоров Артём", "shifts": 8, "perf": 0.8320000000000001, "contrib": 7583.31, "defects": 0, "net": 7583.31}, {"name": "Давыдов Кирилл", "shifts": 3, "perf": 0.8320000000000001, "contrib": 7597.6, "defects": 5475.96, "net": 7050}, {"name": "Зотов Вадим", "shifts": 9, "perf": 0.7340000000000001, "contrib": 5353.98, "defects": 1200, "net": 5233.98}, {"name": "Трифонов Роман", "shifts": 5, "perf": 0.6920000000000001, "contrib": 4384.6, "defects": 4000, "net": 3984.6}, {"name": "Перхов Владислав", "shifts": 13, "perf": 0.6409999999999999, "contrib": 3232.78, "defects": 1000, "net": 3132.78}, {"name": "Ставропольцев Анатолий", "shifts": 4, "perf": 0.612, "contrib": 2568.89, "defects": 800, "net": 2488.89}, {"name": "Ушаков Алексей", "shifts": 12, "perf": 0.569, "contrib": 1574.84, "defects": 400, "net": 1534.84}, {"name": "Ахметов Муслим", "shifts": 13, "perf": 0.55, "contrib": 1144.93, "defects": 1400, "net": 1004.93}, {"name": "Дуванбегов Алан", "shifts": 9, "perf": 0.46399999999999997, "contrib": -824, "defects": 6918.51, "net": -1515.85}, {"name": "Векленко Антон", "shifts": 1, "perf": 0.461, "contrib": -887.84, "defects": 5899.82, "net": -1477.82}, {"name": "Иванушкин Сергей", "shifts": 13, "perf": 0.409, "contrib": -2077.15, "defects": 6758.6, "net": -2753.01}, {"name": "Суденков Александр", "shifts": 1, "perf": 0.34700000000000003, "contrib": -3503.16, "defects": 0, "net": -3503.16}, {"name": "Кадиров Мурад", "shifts": 2, "perf": 0.326, "contrib": -3979.17, "defects": 0, "net": -3979.17}, {"name": "Магомедов Джабар", "shifts": 2, "perf": 0.312, "contrib": -4295.94, "defects": 0, "net": -4295.94}, {"name": "Ильченко Егор", "shifts": 6, "perf": 0.12, "contrib": -8687.09, "defects": 0, "net": -8687.09}], "idle": ["Бондарев Иван"], "days": ["01.10", "02.10", "03.10", "04.10", "05.10", "06.10", "07.10", "08.10", "09.10", "10.10", "11.10", "12.10", "13.10", "14.10"], "daily": [{"name": "Ильченко Егор", "avg": 12, "vals": [5.2, 6.8, null, null, 27.4, null, null, 3, null, null, null, 25.8, null, 3.6]}, {"name": "Ставропольцев Анатолий", "avg": 66.4, "vals": [80.4, 40.6, 80.9, 63.8, null, null, null, null, null, null, null, null, null, null]}, {"name": "Трифонов Роман", "avg": 69.2, "vals": [71.1, 89, 71, 47.5, 67.3, null, null, null, null, null, null, null, null, null]}, {"name": "Иванушкин Сергей", "avg": 40.9, "vals": [19.2, 34.8, 48.1, 36.3, 60.2, 41.3, 41.8, 33.8, 42.2, null, 42.7, 53.8, 41.2, 36.5]}, {"name": "Герасименко Яна", "avg": 95.7, "vals": [94.1, null, null, 76.6, 108.3, 123.5, 95.5, 116.4, 45.6, null, 86.9, 77.3, 91.4, 137.1]}, {"name": "Дуванбегов Алан", "avg": 51.9, "vals": [79.7, 53.7, null, 27.1, 76, 71.2, 75, 21.6, 29.3, 33.3, null, null, null, null]}, {"name": "Зотов Вадим", "avg": 77.4, "vals": [null, null, null, null, null, 78, 85.2, 97.3, 75.8, 37.3, 76.6, 85.8, 78.9, 82]}, {"name": "Ахметов Муслим", "avg": 56.7, "vals": [21.7, 62.6, null, 25.1, 69.4, 70.4, 69.2, 76.2, 56.8, 33.4, 52, 70.2, 69.9, 59.6]}, {"name": "Перхов Владислав", "avg": 66.8, "vals": [85.7, 83.7, null, 62.2, 81.5, 74.7, 73.1, 109.8, 43.2, 29.4, 39.7, 63.3, 57.7, 64.6]}, {"name": "Ушаков Алексей", "avg": 59.1, "vals": [57, 67.4, null, 52.8, 85.9, 30.5, 55.3, 55, 68.1, null, 59.3, 80.4, 51.8, 45.5]}, {"name": "Егоров Артём", "avg": 83.2, "vals": [63.4, null, null, 82.5, 122.9, 65.3, null, null, null, null, 88, 100.7, 75.9, 66.6]}, {"name": "Давыдов Кирилл", "avg": 83.2, "vals": [72.9, 87, 89.8, null, null, null, null, null, null, null, null, null, null, null]}, {"name": "Векленко Антон", "avg": 46.1, "vals": [46.1, null, null, null, null, null, null, null, null, null, null, null, null, null]}, {"name": "Магомедов Джабар", "avg": 31.2, "vals": [null, null, null, null, null, null, null, null, 31, null, 31.4, null, null, null]}, {"name": "Суденков Александр", "avg": 34.7, "vals": [null, null, null, null, null, null, null, null, null, null, null, null, null, 34.7]}, {"name": "Кадиров Мурад", "avg": 32.6, "vals": [null, null, null, null, null, null, null, null, 36.5, null, 28.7, null, null, null]}], "gross": 19629.39};   // FOREMAN_V1: демо «Бригада» (числа листа «KPI бригадира» на 18.10.2026, 12:25 МСК), показывается только с ?foreman=1
})();
  window.MOCK.foreman.ops = {"ok": true, "start": "2026-10-01", "end": "2026-10-31", "today": "2026-10-18", "share": 0.65, "canEdit": true, "maxH": 24, "employees": ["Ильченко Егор", "Ставропольцев Анатолий", "Трифонов Роман", "Иванушкин Сергей", "Герасименко Яна", "Дуванбегов Алан", "Зотов Вадим", "Ахметов Муслим", "Перхов Владислав", "Ушаков Алексей", "Егоров Артём", "Давыдов Кирилл", "Векленко Антон", "Бондарев Иван", "Магомедов Джабар", "Суденков Александр", "Кадиров Мурад"], "services": [{"name": "Услуги по обработке товара на складе - ст", "flow": "Исходящий", "rate": 660.0}, {"name": "BBXD, сервисный тариф, раздел", "flow": "Исходящий", "rate": 830.0}, {"name": "BBXD, сервисный тариф, закрытие паллет", "flow": "Исходящий", "rate": 830.0}, {"name": "BBXD, сервисный тариф, ADAPTO", "flow": "Исходящий", "rate": 830.0}, {"name": "BBXD, услуги по складской обработке товара с использованием ТСД и электротехники свыше 4 кВт", "flow": "Исходящий", "rate": 1000.0}, {"name": "BBXD, обмотка паллет пленкой", "flow": "Исходящий", "rate": 660.0}, {"name": "BBXD, ремонт и перебор поддонов", "flow": "Исходящий", "rate": 660.0}, {"name": "BBXD, контроль", "flow": "Исходящий", "rate": 660.0}, {"name": "CS, сервисный тариф, сборка", "flow": "Исходящий", "rate": 830.0}, {"name": "CS, услуги по складской обработке товара с использованием ТСД и электротехники свыше 4 кВт", "flow": "Исходящий", "rate": 1000.0}, {"name": "CS, обмотка паллет пленкой", "flow": "Исходящий", "rate": 660.0}, {"name": "CS, ремонт и перебор поддонов", "flow": "Исходящий", "rate": 660.0}, {"name": "CS, контроль", "flow": "Исходящий", "rate": 660.0}, {"name": "BBXD, приёмка", "flow": "Входящий", "rate": 980.0}, {"name": "BBXD, перемещение", "flow": "Входящий", "rate": 830.0}, {"name": "BBXD, сервисный тариф", "flow": "Входящий", "rate": 830.0}, {"name": "XD, сервисный тариф", "flow": "Входящий", "rate": 830.0}, {"name": "CS, приёмка", "flow": "Входящий", "rate": 660.0}, {"name": "CS, стикерование", "flow": "Входящий", "rate": 660.0}, {"name": "Отгрузка, сервисный тариф", "flow": "Отгрузка", "rate": 830.0}, {"name": "Отгрузка, оптимизация с использованием электротехники до 4 кВт.", "flow": "Отгрузка", "rate": 830.0}, {"name": "Отгрузка, администратор товарного потока", "flow": "Отгрузка", "rate": 830.0}, {"name": "FM, приёмка", "flow": "3PL", "rate": 660.0}, {"name": "FM, услуги по складской обработке товара с использованием ТСД и электротехники до 4 кВт.", "flow": "3PL", "rate": 830.0}, {"name": "FM, услуги по складской обработке товара с использованием ТСД и электротехники свыше 4 кВт.", "flow": "3PL", "rate": 1000.0}, {"name": "FM, загрузка в ТС", "flow": "3PL", "rate": 980.0}, {"name": "Обеспечение рабочего состояния зон хранения, сборки и погрузки склада", "flow": "Эксплуатация", "rate": 660.0}, {"name": "Переборка брака, утилизация, инвентаризация", "flow": "Качество", "rate": 660.0}, {"name": "Услуги по проведению инвентаризации с использованием ТСД и ножничного подъемника", "flow": "Качество", "rate": 830.0}, {"name": "ОБД, сервисный тариф", "flow": "ОБД", "rate": 830.0}, {"name": "DS, сервисный тариф, сборка", "flow": "Даркстор", "rate": 830.0}, {"name": "DS, обмотка паллет пленкой", "flow": "Даркстор", "rate": 660.0}, {"name": "DS, контроль", "flow": "Даркстор", "rate": 660.0}], "unassigned": [{"row": 177, "date": "2026-10-01", "shift": "День", "service": "BBXD, сервисный тариф, раздел", "hours": 3.0, "rate": 830.0}, {"row": 178, "date": "2026-10-01", "shift": "День", "service": "BBXD, сервисный тариф, закрытие паллет", "hours": 20.0, "rate": 830.0}, {"row": 179, "date": "2026-10-01", "shift": "День", "service": "BBXD, услуги по складской обработке товара с использованием ТСД и электротехники свыше 4 кВт", "hours": 11.0, "rate": 1000.0}, {"row": 180, "date": "2026-10-01", "shift": "День", "service": "Переборка брака, утилизация, инвентаризация", "hours": 11.0, "rate": 660.0}, {"row": 181, "date": "2026-10-02", "shift": "День", "service": "BBXD, сервисный тариф, раздел", "hours": 2.0, "rate": 830.0}, {"row": 182, "date": "2026-10-02", "shift": "День", "service": "BBXD, сервисный тариф, закрытие паллет", "hours": 11.0, "rate": 830.0}, {"row": 183, "date": "2026-10-02", "shift": "День", "service": "BBXD, обмотка паллет пленкой", "hours": 22.0, "rate": 660.0}, {"row": 184, "date": "2026-10-02", "shift": "День", "service": "CS, услуги по складской обработке товара с использованием ТСД и электротехники свыше 4 кВт", "hours": 11.0, "rate": 1000.0}, {"row": 185, "date": "2026-10-02", "shift": "День", "service": "BBXD, приёмка", "hours": 9.0, "rate": 980.0}, {"row": 186, "date": "2026-10-02", "shift": "День", "service": "Обеспечение рабочего состояния зон хранения, сборки и погрузки склада", "hours": 22.0, "rate": 660.0}, {"row": 187, "date": "2026-10-02", "shift": "День", "service": "DS, контроль", "hours": 11.0, "rate": 660.0}, {"row": 188, "date": "2026-10-02", "shift": "Ночь", "service": "BBXD, сервисный тариф, раздел", "hours": 9.0, "rate": 830.0}, {"row": 189, "date": "2026-10-02", "shift": "Ночь", "service": "BBXD, сервисный тариф, закрытие паллет", "hours": 18.0, "rate": 830.0}, {"row": 190, "date": "2026-10-02", "shift": "Ночь", "service": "BBXD, услуги по складской обработке товара с использованием ТСД и электротехники свыше 4 кВт", "hours": 11.0, "rate": 1000.0}, {"row": 191, "date": "2026-10-02", "shift": "Ночь", "service": "Переборка брака, утилизация, инвентаризация", "hours": 11.0, "rate": 660.0}, {"row": 192, "date": "2026-10-03", "shift": "День", "service": "BBXD, обмотка паллет пленкой", "hours": 22.0, "rate": 660.0}, {"row": 193, "date": "2026-10-03", "shift": "День", "service": "CS, услуги по складской обработке товара с использованием ТСД и электротехники свыше 4 кВт", "hours": 11.0, "rate": 1000.0}, {"row": 194, "date": "2026-10-03", "shift": "День", "service": "CS, контроль", "hours": 11.0, "rate": 660.0}, {"row": 195, "date": "2026-10-03", "shift": "День", "service": "Обеспечение рабочего состояния зон хранения, сборки и погрузки склада", "hours": 22.0, "rate": 660.0}, {"row": 196, "date": "2026-10-03", "shift": "День", "service": "DS, контроль", "hours": 11.0, "rate": 660.0}, {"row": 197, "date": "2026-10-04", "shift": "День", "service": "BBXD, услуги по складской обработке товара с использованием ТСД и электротехники свыше 4 кВт", "hours": 11.0, "rate": 1000.0}, {"row": 198, "date": "2026-10-04", "shift": "День", "service": "BBXD, обмотка паллет пленкой", "hours": 20.0, "rate": 660.0}, {"row": 199, "date": "2026-10-04", "shift": "День", "service": "Переборка брака, утилизация, инвентаризация", "hours": 11.0, "rate": 660.0}, {"row": 200, "date": "2026-10-04", "shift": "День", "service": "DS, контроль", "hours": 11.0, "rate": 660.0}, {"row": 201, "date": "2026-10-05", "shift": "Ночь", "service": "BBXD, сервисный тариф, раздел", "hours": 4.0, "rate": 830.0}, {"row": 202, "date": "2026-10-05", "shift": "Ночь", "service": "BBXD, сервисный тариф, закрытие паллет", "hours": 9.0, "rate": 830.0}, {"row": 203, "date": "2026-10-05", "shift": "Ночь", "service": "Переборка брака, утилизация, инвентаризация", "hours": 11.0, "rate": 660.0}], "unassignedHours": 336.0, "entries": []};   // FOREMAN_OPS_V1: демо (реальные сотрудники, тарифы и 336 ч без ФИО на 18.10.2026)
