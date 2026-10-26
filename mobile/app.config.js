// Дополняет app.json настройками, которые зависят от файлов вне git.
// Основные настройки приложения — в app.json.
const fs = require('fs');
const path = require('path');

/**
 * Firebase (push-уведомления на Android через FCM).
 * В облачной сборке EAS файл приходит из переменной окружения GOOGLE_SERVICES_JSON
 * (тип «File», задаётся на expo.dev → проект → Environment variables).
 * Локально можно положить google-services.json рядом с app.json.
 * Без файла приложение соберётся и будет работать, но push на Android не придут.
 */
function googleServicesFile() {
  if (process.env.GOOGLE_SERVICES_JSON) return process.env.GOOGLE_SERVICES_JSON;
  const local = path.join(__dirname, 'google-services.json');
  return fs.existsSync(local) ? './google-services.json' : undefined;
}

module.exports = ({ config }) => {
  const file = googleServicesFile();
  return {
    ...config,
    android: {
      ...config.android,
      ...(file ? { googleServicesFile: file } : {}),
    },
  };
};
