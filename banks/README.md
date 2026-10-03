# Логотипы банков для приложения «Мои выплаты»

Эти файлы лежат прямо в приложении и открываются с вашего же сайта: из интернета в работе приложения логотипы **не грузятся** (в `Content-Security-Policy` внешние картинки не разрешены), они входят в офлайн-кэш (`sw.js`).

- `banks.js` справочник банков (`window.BANKS`: название, цвет, инициалы, файл логотипа, псевдонимы для поиска), поиск `BANK_API.match`, поиск банка по названию `BANK_API.byName`, подсказка по первым цифрам карты `BANK_API.byBin` (только Сбербанк и Т-Банк, где соответствие надёжно).
- `<id>.png` логотип 96x96, белый фон, поля обрезаны, 64 цвета, 1-2 КБ. Исходные файлы взяты с Wikimedia Commons, преобразованы (обрезка полей, масштаб, палитра); содержание не менялось.
- Для банков без найденного свободного логотипа приложение рисует круглый значок: цвет банка и инициалы (поля `color`, `ini` в `banks.js`). Фирменные цвета выбраны по общеизвестному оформлению банков, это не копии логотипов.

## Важно

Логотипы банков являются **товарными знаками** их владельцев. Они используются только чтобы сотрудник узнал свой банк в списке (указание банка, не реклама и не знак партнёрства). Лицензия на Commons (общественное достояние или CC) говорит об авторском праве на изображение и не отменяет права на товарный знак. Если банк попросит убрать логотип, удалите файл `<id>.png` и в `banks.js` поставьте `logo: ''`, значок-заглушка заменит его.

Файлы с лицензией CC BY / CC BY-SA требуют указания автора и лицензии; это сделано в таблице ниже.

## Банки с реальным логотипом (31)

| Банк | Файл | Источник (Wikimedia Commons) | Лицензия | Автор / примечание |
|---|---|---|---|---|
| Сбербанк | `sber.png` | [Logo Sberbank.svg](https://commons.wikimedia.org/wiki/File%3ALogo_Sberbank.svg) | Public domain | Sberbank |
| Т-Банк (Тинькофф) | `tbank.png` | [T-Bank RU logo.svg](https://commons.wikimedia.org/wiki/File%3AT-Bank_RU_logo.svg) | Public domain | АО «ТБанк» |
| ВТБ | `vtb.png` | [VTB Logo 2018.svg](https://commons.wikimedia.org/wiki/File%3AVTB_Logo_2018.svg) | Public domain | VTB Bank |
| Альфа-Банк | `alfa.png` | [Alfa-Bank.svg](https://commons.wikimedia.org/wiki/File%3AAlfa-Bank.svg) | Public domain | Kopiersperre |
| Райффайзенбанк | `raiffeisen.png` | [Raiffeisen Bank 2022 RU Logo.svg](https://commons.wikimedia.org/wiki/File%3ARaiffeisen_Bank_2022_RU_Logo.svg) | CC BY 4.0 | АО «Райффайзенбанк» |
| Совкомбанк | `sovcom.png` | [New Sovcombank logo (updated version).svg](https://commons.wikimedia.org/wiki/File%3ANew_Sovcombank_logo_%28updated_version%29.svg) | Public domain | ПАО "Совкомбанк" |
| Росбанк | `rosbank.png` | [Rosbank logo 2022.svg](https://commons.wikimedia.org/wiki/File%3ARosbank_logo_2022.svg) | Public domain | Rosbank |
| Банк «Открытие» | `otkritie.png` | [Otkritie Bank logo.svg](https://commons.wikimedia.org/wiki/File%3AOtkritie_Bank_logo.svg) | Public domain | ПАО Банк «ФК Открытие» |
| МКБ (Московский кредитный банк) | `mkb.png` | [MKB Bank logo.svg](https://commons.wikimedia.org/wiki/File%3AMKB_Bank_logo.svg) | Public domain | Unknown authorUnknown author |
| Банк ДОМ.РФ | `domrf.png` | [Dom.RF Bank Logo.svg](https://commons.wikimedia.org/wiki/File%3ADom.RF_Bank_Logo.svg) | Public domain | Банк «Дом.РФ» |
| Ак Барс Банк | `akbars.png` | [Ak Bars Bank Logo.svg](https://commons.wikimedia.org/wiki/File%3AAk_Bars_Bank_Logo.svg) | Public domain | https://www.akbars.ru |
| Хоум Банк (Хоум Кредит) | `homecredit.png` | [Home Credit & Finance Bank.svg](https://commons.wikimedia.org/wiki/File%3AHome_Credit_%26_Finance_Bank.svg) | Public domain | ООО "Хоум Кредит энд Финанс Банк" |
| ОТП Банк | `otp.png` | [OTP Bank logo.svg](https://commons.wikimedia.org/wiki/File%3AOTP_Bank_logo.svg) | Public domain | https://www.otpbank.md/ |
| УБРиР | `ubrr.png` | [Логотип УБРиР.png](https://commons.wikimedia.org/wiki/File%3A%D0%9B%D0%BE%D0%B3%D0%BE%D1%82%D0%B8%D0%BF_%D0%A3%D0%91%D0%A0%D0%B8%D0%A0.png) | CC BY-SA 4.0 | Ekaterinagri |
| Яндекс Банк | `yandex.png` | [Yandex Bank logo.svg](https://commons.wikimedia.org/wiki/File%3AYandex_Bank_logo.svg) | Public domain | Яндекс Банк |
| Ozon Банк | `ozon.png` | [Ozon Bank Logo.svg](https://commons.wikimedia.org/wiki/File%3AOzon_Bank_Logo.svg) | Public domain | Ozon Банк |
| Wildberries Банк | `wb.png` | [Wildberries Logo.png](https://commons.wikimedia.org/wiki/File%3AWildberries_Logo.png) | Public domain | Pahan |
| МТС Банк | `mts.png` | [MTS logo.svg](https://commons.wikimedia.org/wiki/File%3AMTS_logo.svg) | Public domain | Mobile TeleSystems |
| Банк Зенит | `zenit.png` | [Bank ZENIT.png](https://commons.wikimedia.org/wiki/File%3ABank_ZENIT.png) | Public domain | Банк «Зенит» |
| Банк «Центр-инвест» | `centrinvest.png` | [Centr-Invest Logo.svg](https://commons.wikimedia.org/wiki/File%3ACentr-Invest_Logo.svg) | Public domain | Centr-Invest |
| Абсолют Банк | `absolut.png` | [Logo Absolut Bank.png](https://commons.wikimedia.org/wiki/File%3ALogo_Absolut_Bank.png) | Public domain | Absolut Bank |
| Ренессанс Кредит | `renaissance.png` | [Логотип Ренессанс Банк.svg](https://commons.wikimedia.org/wiki/File%3A%D0%9B%D0%BE%D0%B3%D0%BE%D1%82%D0%B8%D0%BF_%D0%A0%D0%B5%D0%BD%D0%B5%D1%81%D1%81%D0%B0%D0%BD%D1%81_%D0%91%D0%B0%D0%BD%D0%BA.svg) | Public domain | ООО Коммерческий банк «Ренессанс Кредит» |
| Банк «Хлынов» | `khlynov.png` | [БанкХлынов.svg](https://commons.wikimedia.org/wiki/File%3A%D0%91%D0%B0%D0%BD%D0%BA%D0%A5%D0%BB%D1%8B%D0%BD%D0%BE%D0%B2.svg) | Public domain | Банк Хлынов |
| Азиатско-Тихоокеанский Банк (АТБ) | `atb.png` | [ATB Logo.svg](https://commons.wikimedia.org/wiki/File%3AATB_Logo.svg) | Public domain | Азиатско-Тихоокеанский банк |
| Банк Синара | `sinara.png` | [SinaraBank.png](https://commons.wikimedia.org/wiki/File%3ASinaraBank.png) | Public domain | АО Банк Синара |
| Кредит Европа Банк | `crediteurope.png` | [Credit Europe Bank logo.svg](https://commons.wikimedia.org/wiki/File%3ACredit_Europe_Bank_logo.svg) | Public domain | Unknown authorUnknown author |
| Банк Точка | `tochka.png` | [Tochka Logo.svg](https://commons.wikimedia.org/wiki/File%3ATochka_Logo.svg) | Public domain | Точка Банк |
| Модульбанк | `modul.png` | [Модульбанк лого.svg](https://commons.wikimedia.org/wiki/File%3A%D0%9C%D0%BE%D0%B4%D1%83%D0%BB%D1%8C%D0%B1%D0%B0%D0%BD%D0%BA_%D0%BB%D0%BE%D0%B3%D0%BE.svg) | CC BY-SA 4.0 | J.S.C. "MODULBANK" |
| ЮMoney | `yoomoney.png` | [ЮMoney.png](https://commons.wikimedia.org/wiki/File%3A%D0%AEMoney.png) | CC BY-SA 4.0 | Житель Москвы |
| Банк Казани | `bankkazani.png` | [Логотип Банка Казани.png](https://commons.wikimedia.org/wiki/File%3A%D0%9B%D0%BE%D0%B3%D0%BE%D1%82%D0%B8%D0%BF_%D0%91%D0%B0%D0%BD%D0%BA%D0%B0_%D0%9A%D0%B0%D0%B7%D0%B0%D0%BD%D0%B8.png) | Public domain | dim7gin |
| ВЭБ.РФ | `veb.png` | [VEB RF Logo.png](https://commons.wikimedia.org/wiki/File%3AVEB_RF_Logo.png) | CC BY-SA 4.0 | VEB.RF |

## Банки с заглушкой (круглый значок с цветом и инициалами) (43)

Свободного логотипа на Wikimedia Commons найти не удалось (или найденный файл относился к другой организации и был отклонён после проверки глазами):

- Газпромбанк
- Россельхозбанк
- ПСБ (Промсвязьбанк)
- Банк «Санкт-Петербург»
- Русский Стандарт
- Почта Банк
- Банк Уралсиб
- Банк «Авангард»
- Банк «Левобережный»
- Тойота Банк
- Дальневосточный банк
- СДМ-Банк
- Новикомбанк
- Металлинвестбанк
- Транскапиталбанк
- Локо-Банк
- Экспобанк
- Ингосстрах Банк
- Банк «Траст»
- Банк «Возрождение»
- Банк «Пересвет»
- Банк «Таврический»
- Банк «Кубань Кредит»
- Банк «Оренбург»
- Татсоцбанк
- Банк «Енисей»
- Банк «Солидарность»
- Банк «Национальный Стандарт»
- ЮниКредит Банк
- Ситибанк
- Банк Интеза
- Евразийский банк
- Челиндбанк
- Челябинвестбанк
- Сургутнефтегазбанк
- Банк ВБРР (Всероссийский банк развития регионов)
- МБ Банк
- Свой Банк
- Байкалинвестбанк
- Банк «Приморье»
- Акибанк
- Банк «Агророс»
- Фора-Банк
- Другой банк (значок «…», название сотрудник вводит сам)

## Замечания по отдельным логотипам

- **МТС Банк**: использован общий знак бренда «МТС» (красный квадрат с яйцом), которым пользуется и банк. Отдельного логотипа «МТС Банк» на Commons нет.
- **Wildberries Банк**: использован знак Wildberries (бренд банка тот же).
- **Открытие**, **Ренессанс**, **ВЭБ.РФ** и др.: на Commons лежит версия, которая может оказаться не самой свежей редакцией бренда. Для замены положите новый `<id>.png` 96x96 в эту папку.
- **ПСБ**: найденный файл оказался логотипом другого банка (Punjab & Sind Bank), поэтому не использован.
- **Ситибанк**, **Банк Интеза**, **ЮниКредит**: на Commons есть только устаревшие или чужие (зарубежные) версии, не использованы.

## Как добавить или заменить логотип

1. Положите квадратный PNG (лучше 96x96, до 5 КБ, белый или прозрачный фон) как `banks/<id>.png`.
2. В `banks.js` у банка поставьте `logo: 'banks/<id>.png'`.
3. Добавьте файл в список `SHELL` в `sw.js` и увеличьте номер кэша (`pr-shell-vN`).
4. Запишите источник и лицензию в таблицу выше.

## Данные карты и безопасность

Папка `banks/` содержит только публичные справочные данные: ни номеров карт, ни ключей, ни персональных данных. Номер карты сотрудника хранится в таблице приложения (вкладка «Заявки на аванс», колонка Q) и, если сотрудник отметил «Запомнить на этом телефоне», в `localStorage` его телефона (`pr.card`). Рекомендация: ограничить доступ к таблице, очищать колонку Q после выплаты. См. DEPLOY.md, раздел 6l.
