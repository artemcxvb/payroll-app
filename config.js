/* Конфигурация приложения. По умолчанию — демо (вымышленные данные, «сервер» в localStorage браузера).
   Боевой режим включается только когда заданы mode: 'live' И backendUrl (адрес Web App из DEPLOY.md). Секретов здесь нет. */
window.APP_CONFIG = {
  loginBotUrl: 'https://t.me/tableworks_bot',   // бот личных кодов входа (только https://t.me/<имя>; иначе используется значение по умолчанию)
  loginHours: { from: 9, to: 20 },   // часы работы приложения по Москве (с 9:00 до 20:00); после 20:00 все выходят автоматически. Сервер присылает свои часы при входе, они главнее; без этой строки подразумеваются 9 и 20
  mode: 'live',          // 'demo' | 'live'
  backendUrl: 'https://script.google.com/macros/s/AKfycbzRKLoTEp4TvrldINzxuq6fg1uYmPktgeGztA_NE6ujLUpeFSbTn7xDLSp2XNFEUW6PzA/exec',        // https://script.google.com/macros/s/…/exec — основной бэкенд (вход, данные, аванс, происшествия…)
  feedbackUrl: 'https://script.google.com/macros/s/AKfycbw9y1encQkMS-S2gaCGCu6ka60vAV1rHzwr3M91fl-feV_v3OrWC2vCMIyHhJQ7TVOEFA/exec'        // https://script.google.com/macros/s/…/exec — ОТДЕЛЬНЫЙ деплой анонимной обратной связи (без токена)
};
