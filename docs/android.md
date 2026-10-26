# Android-приложение Buty: Google Play и RuStore

С 25.10.2026 Android-приложение — то же приложение на Expo, что и для iPhone (папка `mobile/`).
Один код, одинаковые экраны и функции на обеих платформах. Прежняя обёртка сайта (TWA, папка `android/`)
больше не используется.

| | |
| --- | --- |
| Пакет | `app.buty.android` (тот же, что был у TWA: RuStore и `assetlinks.json` уже на него настроены) |
| Ключ подписи | `android-keystore/buty-release.jks` (alias `buty`, пароль — в `android-keystore/ПРОЧТИ-МЕНЯ.txt`). Загружается в EAS один раз |
| Сборка | EAS в облаке. Android Studio не нужна |
| Google Play | AAB, профиль `production` |
| RuStore | APK, профиль `rustore` |
| Push | Expo → Firebase Cloud Messaging (FCM). RuStore Push — второй этап (см. в конце) |
| Покупки | Нет. Все функции бесплатны, поэтому правила Google Play Billing нас не касаются |

Что умеет приложение: разбор состава текстом и по фото (камера или галерея), каталоги ингредиентов и средств,
полка с совместимостью, дублями, режимом утро/вечер, реакциями и push-напоминаниями, анкета кожи, выход и удаление аккаунта,
светлая и тёмная темы. На Android иконки берутся из набора Material Symbols, системные окна и кнопки тоже свои, Android-овские.

## Шаг 0. Отправить изменения на GitHub (через Kimi)

Попросите Kimi дословно:

> Закоммить и запушь в main изменения в `mobile/`, `lib/reminders/expo.ts`, `lib/reminders/expo.test.ts`, `scripts/rustore-publish.mjs`, `docs/android.md`, `docs/ios.md`, `docs/decisions.md`, `docs/roadmap.md`. Перенеси картинки для магазинов `android/store/play-icon-512.png` и `android/store/feature-graphic-1024x500.png` в `mobile/assets/store/`, затем удали старое Android-приложение (TWA): папку `android/` и файл `.github/workflows/android.yml`. Папку `android-keystore/` НЕ трогай и НЕ коммить: там секретный ключ, он нужен и новому приложению. `public/.well-known/assetlinks.json` оставь как есть. Перед пушем выполни `pnpm typecheck`, `pnpm test` и в папке `mobile/` — `npm install && npm run check`.

После деплоя сервер начнёт отправлять push на Android в канал «Напоминания».

## Шаг 1. Expo (один раз, общий для iOS и Android)

Если это уже сделано для iPhone по `docs/ios.md`, переходите к шагу 2.

1. Зарегистрируйтесь на https://expo.dev (бесплатно).
2. В «Терминале» на Mac:
   ```bash
   cd ~/Documents/kimi/Workspaces/Buty/mobile
   npm install
   npx eas-cli@latest login
   npx eas-cli@latest init
   ```
   После `init` в `app.json` появится `extra.eas.projectId`. Попросите Kimi закоммитить `app.json`: без этого номера push не заработают.

## Шаг 2. Загрузить ключ подписи в EAS (один раз)

Обновления в RuStore принимаются, только если они подписаны тем же ключом, что и первая версия. Поэтому используем наш ключ,
а не новый, который предложит EAS.

```bash
cd ~/Documents/kimi/Workspaces/Buty/mobile
npx eas-cli@latest credentials --platform android
```

Дальше выбирайте стрелками и Enter:

1. Профиль сборки — `production`.
2. **Keystore: Manage everything needed to build your project** → **Set up a new keystore** → на вопрос о генерации ответьте **No** (не создавать новый) → **Upload**.
   Если меню выглядит иначе, ищите пункт со словом *Upload* или *existing keystore*.
3. Путь к файлу: `../android-keystore/buty-release.jks`
4. Key alias: `buty`
5. Keystore password и Key password — один и тот же пароль из `android-keystore/ПРОЧТИ-МЕНЯ.txt`.

Проверка: в том же меню EAS покажет SHA-256 ключа. Он должен совпадать с отпечатком
`67:7F:34:45:2A:56:F0:AD:BE:1E:7A:0E:53:C1:C4:B9:F2:93:1F:D8:6B:57:AD:F0:00:3D:9C:DC:71:63:63:23`.

Профиль `rustore` использует тот же ключ: ключи в EAS привязаны к пакету, а не к профилю.

## Шаг 3. Номер версии (один раз)

Если в RuStore уже опубликована или загружена версия старого приложения, у новой версии номер сборки (versionCode) должен быть больше.
Поставьте заведомо большой стартовый номер:

```bash
npx eas-cli@latest build:version:set --platform android
```

На вопрос о номере введите `100`. Дальше EAS увеличивает его сам при каждой сборке (`autoIncrement`).

## Шаг 4. Push-уведомления: Firebase (один раз, ~15 минут)

Без этого шага приложение работает, но напоминания на Android не приходят.

1. Откройте https://console.firebase.google.com → **Создать проект** → название `Buty` → Google Analytics можно выключить.
2. В проекте: значок Android («Добавить приложение») → **Имя пакета Android:** `app.buty.android` → **Зарегистрировать** → **Скачать google-services.json**. Остальные шаги мастера пропустите.
3. Файл в EAS: https://expo.dev → проект buty → **Environment variables** → **Add variable**:
   - Name: `GOOGLE_SERVICES_JSON`
   - Type: **File**, загрузить скачанный `google-services.json`
   - Environments: отметить `production` и `preview`
   - Visibility: **Secret**
4. Ключ для отправки push: Firebase → ⚙ **Настройки проекта** → **Сервисные аккаунты** → **Создать закрытый ключ** → скачается JSON.
   Затем в Терминале:
   ```bash
   npx eas-cli@latest credentials --platform android
   ```
   → `production` → **Google Service Account** → **Manage your Google Service Account Key for Push Notifications (FCM V1)** → **Upload** → путь к скачанному JSON.
5. Оба JSON-файла сохраните рядом с ключом в `android-keystore/` и в менеджере паролей. В git их не кладём.

## Шаг 5. Собрать и проверить на своём телефоне

```bash
npx eas-cli@latest build --platform android --profile rustore
```

Сборка идёт в облаке 15–25 минут. В конце EAS покажет ссылку и QR-код. Откройте его на Android-телефоне,
скачайте APK → «Разрешить установку из этого источника» → **Установить**.
Если на телефоне стоит старая версия Buty (обёртка сайта), сначала удалите её.

Что проверить руками:

- [ ] вход по коду из письма;
- [ ] разбор текстом и по фото (кнопка «Сфотографировать состав» → «Камера» и «Галерея»);
- [ ] заголовки вкладок не залезают под часы и значки вверху экрана;
- [ ] все иконки видны (вкладки, кнопки, пустые состояния);
- [ ] полка: добавить 2–3 средства, вкладки «Совместимость», «Режим», «Реакции», «Напоминания»;
- [ ] анкета кожи;
- [ ] push: включить уведомления в «Профиле», поставить напоминание, затем на сервере временно сдвинуть его дату (попросить Kimi) — уведомление должно прийти и по нажатию открыть средство;
- [ ] тёмная тема (системная настройка телефона);
- [ ] выход и удаление тестового аккаунта.

## Шаг 6. Публикация в RuStore

Аккаунт и компания в RuStore Консоли уже есть.

1. https://console.rustore.ru → **Приложения**. Если приложения с пакетом `app.buty.android` ещё нет — создайте его и загрузите
   первую версию вручную (APK из шага 5). Если есть — переходите к п. 3.
2. Заполните карточку:
   - иконка `mobile/assets/store/play-icon-512.png`;
   - скриншоты телефона: минимум 3, снять с установленного приложения;
   - категория «Здоровье» или «Красота», возрастной рейтинг (ожидаемо 0+/6+);
   - контакты: `support@buty.app`, сайт `https://buty.app`;
   - декларация данных: email (аккаунт), данные о здоровье (анкета кожи, реакции; по отдельному согласию), идентификатор устройства для push.
     Фото упаковки не хранится. Политика: `https://buty.app/privacy`.
3. Следующие версии — скриптом из корня проекта (ключи API уже в `android-keystore/rustore.env`):
   ```bash
   cd ~/Documents/kimi/Workspaces/Buty
   node scripts/rustore-publish.mjs ~/Downloads/<скачанный файл>.apk "Что нового в этой версии"
   ```
   APK скачивается со страницы сборки на expo.dev (кнопка **Download**). Скрипт создаёт черновик, загружает APK
   и отправляет на модерацию. После одобрения версия публикуется сразу.

## Шаг 7. Публикация в Google Play

1. **Аккаунт разработчика:** https://play.google.com/console, разовый взнос 25 $. Нужны документ, удостоверяющий личность,
   и адрес. С 2026 года Google поэтапно вводит обязательную проверку личности всех Android-разработчиков.
   У нового личного аккаунта Google требует закрытое тестирование: не меньше 12 тестировщиков в течение 14 дней.
   Только после этого можно выпустить приложение для всех. Организационный аккаунт (D-U-N-S номер компании) от этого освобождён.
   Актуальные условия смотрите в Play Console при регистрации.
2. Сборка для Google Play:
   ```bash
   npx eas-cli@latest build --platform android --profile production
   ```
3. Первая загрузка — **только вручную**: Play Console → **Создать приложение** → **Тестирование → Закрытое тестирование** →
   новый выпуск → загрузить AAB (скачать со страницы сборки на expo.dev). Google включит Play App Signing:
   он будет подписывать приложение своим ключом, а наш ключ станет «ключом загрузки». Так и должно быть.
4. Карточка: те же иконка и скриншоты, плюс баннер 1024×500 (`mobile/assets/store/feature-graphic-1024x500.png`).
   Анкета «Безопасность данных»: email, данные о здоровье, идентификатор устройства. Данные связаны с аккаунтом,
   передаются только для работы сервиса, удаляются по запросу (в приложении: Профиль → Удалить аккаунт).
   Политика конфиденциальности: `https://buty.app/privacy`. Реклама: нет. Встроенные покупки: нет.
5. Добавьте тестировщиков (email-адреса Google) и попросите их установить приложение по ссылке из Play Console.
6. **Следующие версии без ручной загрузки** (необязательно): Play Console → **Настройки → Доступ к API** → создать сервисный аккаунт
   с правами «Выпуск приложений» → скачать JSON-ключ → положить в `mobile/google-play-service-account.json` (файл в `.gitignore`). Затем:
   ```bash
   npx eas-cli@latest submit --platform android --latest
   ```
   Сборка попадёт черновиком в канал внутреннего тестирования, дальше её продвигают кнопками в Play Console.

## Как выпустить обновление

| Магазин | Команды |
| --- | --- |
| RuStore | `build --platform android --profile rustore` → скачать APK → `node scripts/rustore-publish.mjs <apk> "Что нового"` |
| Google Play | `build --platform android --profile production` → `submit --platform android --latest` (или загрузить AAB вручную) |
| App Store | `build --platform ios --profile production` → `submit --platform ios --latest` (см. `docs/ios.md`) |

Номер сборки растёт сам. Изменения справочников и подписей на сервере (`/api/mobile/dictionaries`) появляются в приложении без выпуска версии.

## Риски

- **Push в России.** Цепочка: сервер на Beget → `exp.host` (Expo) → Firebase → телефон. Если что-то недоступно,
  напоминание записывается в лог и ничего не ломается. На телефонах без сервисов Google (Huawei, часть Honor) push через Firebase не приходят.
- **Проверка личности Google (2026).** Google вводит обязательную регистрацию разработчиков даже для приложений вне Google Play.
  Если правила затронут установку APK из RuStore, понадобится зарегистрировать ключ подписи и пакет в Google.
  Следить за новостями RuStore и Google.
- **Потеря ключа.** Без `android-keystore/buty-release.jks` в RuStore нельзя выпустить обновление. Держите копию вне компьютера.

## Дальше (второй этап)

- **RuStore Push SDK** для телефонов без сервисов Google: отдельная сборка `rustore` с пакетом
  `react-native-rustore-push-sdk` (config plugin), сервер шлёт push через RuStore Push API тем устройствам, где нет FCM-токена.
  Делать, когда в RuStore появятся пользователи.
- **«Поделиться → Buty»** (текст состава из других приложений) и **ссылки `https://buty.app/...` открываются в приложении (App Links)**.
  Были у старой TWA-версии, в новом приложении их пока нет. `assetlinks.json` для App Links уже настроен на наш ключ;
  для Google Play нужно будет добавить в него второй отпечаток (Play Console → Целостность приложения → App signing → SHA-256).
- **Ярлыки на иконке** («Разобрать состав», «Моя полка»).
