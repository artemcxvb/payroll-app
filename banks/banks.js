/* Справочник банков России для выбора банка выплаты. Данные без секретов.
   logo - локальный файл из banks/ (источники и лицензии: banks/README.md); если логотипа нет, приложение рисует круглый значок
   с цветом банка и инициалами. BANK_BINS - только уверенные соответствия первых цифр карты банку (подсказка, не автовыбор). */
(function () {
  'use strict';
  var B = [
  {
   "id": "sber",
   "name": "Сбербанк",
   "color": "#21A038",
   "ini": "С",
   "logo": "banks/sber.png",
   "alias": [
    "сбер",
    "sberbank",
    "сбербанк онлайн",
    "sberbank online"
   ]
  },
  {
   "id": "tbank",
   "name": "Т-Банк (Тинькофф)",
   "color": "#FFDD2D",
   "ini": "Т",
   "logo": "banks/tbank.png",
   "alias": [
    "тинькофф",
    "tinkoff",
    "т банк",
    "tbank",
    "тбанк",
    "t-bank"
   ]
  },
  {
   "id": "vtb",
   "name": "ВТБ",
   "color": "#0A2896",
   "ini": "ВТБ",
   "logo": "banks/vtb.png",
   "alias": [
    "втб",
    "vtb",
    "втб онлайн"
   ]
  },
  {
   "id": "alfa",
   "name": "Альфа-Банк",
   "color": "#EF3124",
   "ini": "А",
   "logo": "banks/alfa.png",
   "alias": [
    "альфа",
    "alfa",
    "alfabank",
    "альфабанк"
   ]
  },
  {
   "id": "gazprombank",
   "name": "Газпромбанк",
   "color": "#0046B0",
   "ini": "ГПБ",
   "logo": "",
   "alias": [
    "газпром",
    "gazprombank",
    "gpb"
   ]
  },
  {
   "id": "raiffeisen",
   "name": "Райффайзенбанк",
   "color": "#FEE600",
   "ini": "Р",
   "logo": "banks/raiffeisen.png",
   "alias": [
    "райффайзен",
    "райфайзен",
    "райф",
    "raiffeisen",
    "raiffeisenbank"
   ]
  },
  {
   "id": "rshb",
   "name": "Россельхозбанк",
   "color": "#00A651",
   "ini": "РСХБ",
   "logo": "",
   "alias": [
    "россельхоз",
    "рсхб",
    "rshb",
    "rosselkhozbank"
   ]
  },
  {
   "id": "sovcom",
   "name": "Совкомбанк",
   "color": "#0F4C9C",
   "ini": "СКБ",
   "logo": "banks/sovcom.png",
   "alias": [
    "совком",
    "sovcombank",
    "халва",
    "halva"
   ]
  },
  {
   "id": "rosbank",
   "name": "Росбанк",
   "color": "#D81E29",
   "ini": "Р",
   "logo": "banks/rosbank.png",
   "alias": [
    "росбанк",
    "rosbank"
   ]
  },
  {
   "id": "psb",
   "name": "ПСБ (Промсвязьбанк)",
   "color": "#F1511B",
   "ini": "ПСБ",
   "logo": "",
   "alias": [
    "промсвязь",
    "псб",
    "psb",
    "promsvyazbank"
   ]
  },
  {
   "id": "otkritie",
   "name": "Банк «Открытие»",
   "color": "#00B5E2",
   "ini": "О",
   "logo": "banks/otkritie.png",
   "alias": [
    "открытие",
    "otkritie"
   ]
  },
  {
   "id": "mkb",
   "name": "МКБ (Московский кредитный банк)",
   "color": "#C8102E",
   "ini": "МКБ",
   "logo": "banks/mkb.png",
   "alias": [
    "мкб",
    "московский кредитный",
    "credit bank of moscow"
   ]
  },
  {
   "id": "bspb",
   "name": "Банк «Санкт-Петербург»",
   "color": "#E4002B",
   "ini": "БСП",
   "logo": "",
   "alias": [
    "санкт-петербург",
    "бспб",
    "спб",
    "bspb"
   ]
  },
  {
   "id": "domrf",
   "name": "Банк ДОМ.РФ",
   "color": "#FF5B00",
   "ini": "Д",
   "logo": "banks/domrf.png",
   "alias": [
    "дом рф",
    "дом.рф",
    "domrf",
    "dom.rf"
   ]
  },
  {
   "id": "akbars",
   "name": "Ак Барс Банк",
   "color": "#00843D",
   "ini": "АБ",
   "logo": "banks/akbars.png",
   "alias": [
    "ак барс",
    "akbars",
    "ak bars"
   ]
  },
  {
   "id": "russtandart",
   "name": "Русский Стандарт",
   "color": "#D2232A",
   "ini": "РС",
   "logo": "",
   "alias": [
    "русский стандарт",
    "russian standard"
   ]
  },
  {
   "id": "homecredit",
   "name": "Хоум Банк (Хоум Кредит)",
   "color": "#E3001B",
   "ini": "Х",
   "logo": "banks/homecredit.png",
   "alias": [
    "хоум",
    "хоум кредит",
    "home credit",
    "homecredit"
   ]
  },
  {
   "id": "otp",
   "name": "ОТП Банк",
   "color": "#6EBE44",
   "ini": "ОТП",
   "logo": "banks/otp.png",
   "alias": [
    "отп",
    "otp"
   ]
  },
  {
   "id": "ubrr",
   "name": "УБРиР",
   "color": "#E30613",
   "ini": "У",
   "logo": "banks/ubrr.png",
   "alias": [
    "убрир",
    "ubrr",
    "урал"
   ]
  },
  {
   "id": "yandex",
   "name": "Яндекс Банк",
   "color": "#FC3F1D",
   "ini": "Я",
   "logo": "banks/yandex.png",
   "alias": [
    "яндекс",
    "yandex"
   ]
  },
  {
   "id": "ozon",
   "name": "Ozon Банк",
   "color": "#005BFF",
   "ini": "О",
   "logo": "banks/ozon.png",
   "alias": [
    "озон",
    "ozon"
   ]
  },
  {
   "id": "wb",
   "name": "Wildberries Банк",
   "color": "#CB11AB",
   "ini": "WB",
   "logo": "banks/wb.png",
   "alias": [
    "вайлдберриз",
    "wildberries",
    "вб",
    "wb банк",
    "вайлдберис"
   ]
  },
  {
   "id": "mts",
   "name": "МТС Банк",
   "color": "#E30611",
   "ini": "МТС",
   "logo": "banks/mts.png",
   "alias": [
    "мтс",
    "mts"
   ]
  },
  {
   "id": "pochta",
   "name": "Почта Банк",
   "color": "#0055A5",
   "ini": "П",
   "logo": "",
   "alias": [
    "почта",
    "почтабанк",
    "pochtabank",
    "почта россии"
   ]
  },
  {
   "id": "zenit",
   "name": "Банк Зенит",
   "color": "#00A5E3",
   "ini": "З",
   "logo": "banks/zenit.png",
   "alias": [
    "зенит",
    "zenit"
   ]
  },
  {
   "id": "uralsib",
   "name": "Банк Уралсиб",
   "color": "#00A0DC",
   "ini": "УС",
   "logo": "",
   "alias": [
    "уралсиб",
    "uralsib"
   ]
  },
  {
   "id": "centrinvest",
   "name": "Банк «Центр-инвест»",
   "color": "#00853E",
   "ini": "ЦИ",
   "logo": "banks/centrinvest.png",
   "alias": [
    "центринвест",
    "центр инвест"
   ]
  },
  {
   "id": "avangard",
   "name": "Банк «Авангард»",
   "color": "#0069B4",
   "ini": "АВ",
   "logo": "",
   "alias": [
    "авангард",
    "avangard"
   ]
  },
  {
   "id": "levoberezhny",
   "name": "Банк «Левобережный»",
   "color": "#00A859",
   "ini": "Л",
   "logo": "",
   "alias": [
    "левобережный"
   ]
  },
  {
   "id": "absolut",
   "name": "Абсолют Банк",
   "color": "#E1261C",
   "ini": "АБ",
   "logo": "banks/absolut.png",
   "alias": [
    "абсолют",
    "absolut"
   ]
  },
  {
   "id": "renaissance",
   "name": "Ренессанс Кредит",
   "color": "#E31E24",
   "ini": "РК",
   "logo": "banks/renaissance.png",
   "alias": [
    "ренессанс",
    "renaissance"
   ]
  },
  {
   "id": "toyota",
   "name": "Тойота Банк",
   "color": "#EB0A1E",
   "ini": "ТБ",
   "logo": "",
   "alias": [
    "тойота",
    "toyota"
   ]
  },
  {
   "id": "dvbank",
   "name": "Дальневосточный банк",
   "color": "#0072BC",
   "ini": "ДВ",
   "logo": "",
   "alias": []
  },
  {
   "id": "khlynov",
   "name": "Банк «Хлынов»",
   "color": "#E2001A",
   "ini": "Х",
   "logo": "banks/khlynov.png",
   "alias": []
  },
  {
   "id": "atb",
   "name": "Азиатско-Тихоокеанский Банк (АТБ)",
   "color": "#0097DA",
   "ini": "АТБ",
   "logo": "banks/atb.png",
   "alias": []
  },
  {
   "id": "sinara",
   "name": "Банк Синара",
   "color": "#00A0E3",
   "ini": "С",
   "logo": "banks/sinara.png",
   "alias": []
  },
  {
   "id": "sdm",
   "name": "СДМ-Банк",
   "color": "#1C6BB0",
   "ini": "СДМ",
   "logo": "",
   "alias": []
  },
  {
   "id": "novikom",
   "name": "Новикомбанк",
   "color": "#00539B",
   "ini": "Н",
   "logo": "",
   "alias": []
  },
  {
   "id": "metallinvest",
   "name": "Металлинвестбанк",
   "color": "#0066B3",
   "ini": "МИБ",
   "logo": "",
   "alias": []
  },
  {
   "id": "tkb",
   "name": "Транскапиталбанк",
   "color": "#00A650",
   "ini": "ТКБ",
   "logo": "",
   "alias": []
  },
  {
   "id": "locko",
   "name": "Локо-Банк",
   "color": "#009AD8",
   "ini": "Л",
   "logo": "",
   "alias": [
    "локо",
    "locko"
   ]
  },
  {
   "id": "expobank",
   "name": "Экспобанк",
   "color": "#E4002B",
   "ini": "Э",
   "logo": "",
   "alias": [
    "экспо",
    "expobank"
   ]
  },
  {
   "id": "crediteurope",
   "name": "Кредит Европа Банк",
   "color": "#00468B",
   "ini": "КЕ",
   "logo": "banks/crediteurope.png",
   "alias": []
  },
  {
   "id": "ingos",
   "name": "Ингосстрах Банк",
   "color": "#00833E",
   "ini": "И",
   "logo": "",
   "alias": []
  },
  {
   "id": "tochka",
   "name": "Банк Точка",
   "color": "#6C2BD9",
   "ini": "Т",
   "logo": "banks/tochka.png",
   "alias": [
    "точка",
    "tochka"
   ]
  },
  {
   "id": "modul",
   "name": "Модульбанк",
   "color": "#00A4B4",
   "ini": "М",
   "logo": "banks/modul.png",
   "alias": [
    "модуль",
    "modulbank"
   ]
  },
  {
   "id": "yoomoney",
   "name": "ЮMoney",
   "color": "#8B3FFD",
   "ini": "ЮМ",
   "logo": "banks/yoomoney.png",
   "alias": [
    "юмани",
    "yoomoney",
    "яндекс деньги"
   ]
  },
  {
   "id": "trust",
   "name": "Банк «Траст»",
   "color": "#003E7E",
   "ini": "Т",
   "logo": "",
   "alias": []
  },
  {
   "id": "vozrozhdenie",
   "name": "Банк «Возрождение»",
   "color": "#00629B",
   "ini": "В",
   "logo": "",
   "alias": []
  },
  {
   "id": "peresvet",
   "name": "Банк «Пересвет»",
   "color": "#C8102E",
   "ini": "П",
   "logo": "",
   "alias": []
  },
  {
   "id": "tavrichesky",
   "name": "Банк «Таврический»",
   "color": "#1F4E9A",
   "ini": "Т",
   "logo": "",
   "alias": []
  },
  {
   "id": "kubankredit",
   "name": "Банк «Кубань Кредит»",
   "color": "#D2232A",
   "ini": "КК",
   "logo": "",
   "alias": []
  },
  {
   "id": "orenburg",
   "name": "Банк «Оренбург»",
   "color": "#00A0DC",
   "ini": "О",
   "logo": "",
   "alias": []
  },
  {
   "id": "tatsotsbank",
   "name": "Татсоцбанк",
   "color": "#0072BC",
   "ini": "ТС",
   "logo": "",
   "alias": []
  },
  {
   "id": "enisey",
   "name": "Банк «Енисей»",
   "color": "#00A650",
   "ini": "Е",
   "logo": "",
   "alias": []
  },
  {
   "id": "solidarnost",
   "name": "Банк «Солидарность»",
   "color": "#E30613",
   "ini": "С",
   "logo": "",
   "alias": []
  },
  {
   "id": "nacstandart",
   "name": "Банк «Национальный Стандарт»",
   "color": "#0A3D91",
   "ini": "НС",
   "logo": "",
   "alias": []
  },
  {
   "id": "unicredit",
   "name": "ЮниКредит Банк",
   "color": "#E2001A",
   "ini": "ЮК",
   "logo": "",
   "alias": [
    "юникредит",
    "unicredit"
   ]
  },
  {
   "id": "citi",
   "name": "Ситибанк",
   "color": "#056DAE",
   "ini": "С",
   "logo": "",
   "alias": [
    "сити",
    "citibank",
    "citi"
   ]
  },
  {
   "id": "intesa",
   "name": "Банк Интеза",
   "color": "#009A44",
   "ini": "И",
   "logo": "",
   "alias": []
  },
  {
   "id": "evrazia",
   "name": "Евразийский банк",
   "color": "#00508C",
   "ini": "Е",
   "logo": "",
   "alias": []
  },
  {
   "id": "bankkazani",
   "name": "Банк Казани",
   "color": "#E5007E",
   "ini": "БК",
   "logo": "banks/bankkazani.png",
   "alias": []
  },
  {
   "id": "chelindbank",
   "name": "Челиндбанк",
   "color": "#005AA9",
   "ini": "Ч",
   "logo": "",
   "alias": []
  },
  {
   "id": "chelinvest",
   "name": "Челябинвестбанк",
   "color": "#00A0DC",
   "ini": "ЧИБ",
   "logo": "",
   "alias": []
  },
  {
   "id": "sngb",
   "name": "Сургутнефтегазбанк",
   "color": "#005CA9",
   "ini": "СНГБ",
   "logo": "",
   "alias": []
  },
  {
   "id": "vbrr",
   "name": "Банк ВБРР (Всероссийский банк развития регионов)",
   "color": "#00A859",
   "ini": "ВБРР",
   "logo": "",
   "alias": []
  },
  {
   "id": "veb",
   "name": "ВЭБ.РФ",
   "color": "#1B3F94",
   "ini": "ВЭБ",
   "logo": "banks/veb.png",
   "alias": [
    "вэб",
    "veb"
   ]
  },
  {
   "id": "mbbank",
   "name": "МБ Банк",
   "color": "#00A3E0",
   "ini": "МБ",
   "logo": "",
   "alias": []
  },
  {
   "id": "svoy",
   "name": "Свой Банк",
   "color": "#7B2D8B",
   "ini": "СБ",
   "logo": "",
   "alias": []
  },
  {
   "id": "baikal",
   "name": "Байкалинвестбанк",
   "color": "#0072BC",
   "ini": "БИБ",
   "logo": "",
   "alias": []
  },
  {
   "id": "primsot",
   "name": "Банк «Приморье»",
   "color": "#0099D8",
   "ini": "П",
   "logo": "",
   "alias": []
  },
  {
   "id": "akibank",
   "name": "Акибанк",
   "color": "#005AA9",
   "ini": "А",
   "logo": "",
   "alias": []
  },
  {
   "id": "agrobank",
   "name": "Банк «Агророс»",
   "color": "#00A650",
   "ini": "АГ",
   "logo": "",
   "alias": []
  },
  {
   "id": "fora",
   "name": "Фора-Банк",
   "color": "#E30613",
   "ini": "Ф",
   "logo": "",
   "alias": []
  },
  {
   "id": "other",
   "name": "Другой банк",
   "color": "#6B7280",
   "ini": "?",
   "logo": "",
   "alias": []
  }
];
  var BINS = [["4276", "sber"], ["546938", "sber"], ["546955", "sber"], ["220220", "sber"], ["521324", "tbank"], ["220070", "tbank"], ["553691", "tbank"]];
  function norm(s) { return String(s || '').toLowerCase().replace(/\u0451/g, '\u0435').replace(/[\u00ab\u00bb"'()\[\].,\-\u2013\u2014_/\\]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  function names(b) { return [b.name].concat(b.alias || []).map(norm); }
  window.BANKS = B;
  window.BANK_BINS = BINS;
  window.BANK_API = {
    norm: norm,
    byName: function (n) {   // точное совпадение названия или псевдонима (регистр и знаки не важны)
      var q = norm(n); if (!q) return null; for (var i = 0; i < B.length; i++) { if (B[i].id !== 'other' && names(B[i]).indexOf(q) >= 0) return B[i]; } return null;
    },
    match: function (b, query) {   // поиск по названию и псевдонимам
      var q = norm(query); if (!q) return true; return names(b).some(function (x) { return x.indexOf(q) >= 0; });
    },
    byBin: function (digits) {   // только уверенные соответствия; иначе null
      var d = String(digits || '').replace(/\D/g, ''); if (d.length < 4) return null;
      for (var i = 0; i < BINS.length; i++) { if (d.indexOf(BINS[i][0]) === 0) { for (var j = 0; j < B.length; j++) { if (B[j].id === BINS[i][1]) return B[j]; } } }
      return null;
    }
  };
})();
