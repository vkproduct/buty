# Buty для iOS и Android

Одно приложение для iPhone и Android-смартфонов (Google Play и RuStore): разбор состава текстом и по фото, каталоги ингредиентов и средств,
«Моя полка» с совместимостью, реакциями и push-напоминаниями, профиль кожи.

Стек: Expo SDK 57 (React Native 0.86, TypeScript), Expo Router, TanStack Query.
Сервер — тот же Next.js в корне репозитория, API под `/api/mobile/*` и общие `/api/*`.

Инструкции по выпуску: iOS / App Store — [`docs/ios.md`](../docs/ios.md), Android / Google Play / RuStore — [`docs/android.md`](../docs/android.md).

Все функции бесплатны (с 24.10.2026): в приложении нет тарифов, цен и покупок.

## Команды

```bash
cd mobile
npm install            # зависимости (один раз и после изменения package.json)
npx expo start         # dev-сервер; приложение — в development build на iPhone
npm run check          # проверка типов + линтер (запускать перед коммитом)
npx eas-cli@latest build --platform ios --profile production   # сборка для TestFlight/App Store
npx eas-cli@latest submit --platform ios --latest              # отправка последней сборки в App Store Connect
npx eas-cli@latest build --platform android --profile production  # AAB для Google Play
npx eas-cli@latest build --platform android --profile rustore     # APK для RuStore и установки на телефон
```

Сервер для разработки: `EXPO_PUBLIC_API_URL=http://<IP-компьютера>:3000 npx expo start`
(по умолчанию приложение ходит на https://buty.app).

## Устройство

| Папка | Что внутри |
| --- | --- |
| `src/app/` | экраны (каждый файл — маршрут Expo Router) |
| `src/app/(tabs)/` | вкладки: Разбор, Каталог, Полка, Профиль |
| `src/components/` | UI-компоненты (`ui/` — базовые: кнопки, карточки, поля) |
| `src/lib/api.ts` | запросы к серверу, Bearer-токен, ошибки |
| `src/lib/auth.tsx` | вход по коду из письма, выход, удаление аккаунта |
| `src/lib/queries.ts` | все запросы и мутации (TanStack Query) |
| `src/lib/push.ts` | push-уведомления: разрешение, токен, переход по нажатию |
| `src/lib/ocr.ts` | фото состава → сжатие → `/api/ocr` (Google Vision на сервере) |
| `src/lib/types.ts` | контракт API (повторяет типы сервера — менять вместе) |
| `src/theme.ts` | цвета (светлая/тёмная тема), типографика, отступы |
| `src/components/ui/icon.tsx` | иконки: SF Symbols на iOS, Material Symbols на Android (пары имён) |
| `app.config.js` | дополняет `app.json`: файл Firebase `google-services.json` для push на Android |

## Правила

- `ios/` и `android/` не коммитим и руками не правим — их генерирует EAS (настройки — в `app.json`).
- Новые пакеты Expo ставим версией под SDK 57: `npx expo install <пакет>`.
- Подписи и справочники (категории, уровни доказательности, анкета кожи) приходят с сервера
  (`/api/mobile/dictionaries`) — правятся в коде сайта, без нового релиза приложения.
- В приложении нет цен, тарифов и кнопок оплаты: все функции бесплатны. Поля `plan`/`limits`
  в ответах сервера остались для совместимости и в интерфейсе не показываются.
- Новая иконка — только через пару в `src/components/ui/icon.tsx` (SF-имя → Material-имя),
  иначе на Android она не отрисуется. TypeScript не даст использовать иконку без пары.
- Экраны вкладок без шапки: отступ под строку состояния на Android — `useTabTopInset()`
  (`src/components/screen.tsx`), на iOS его даёт система.
- Пакет Android — `app.buty.android`, подпись — ключ из `android-keystore/` (загружен в EAS).
  Сменить пакет или ключ нельзя: RuStore и Google Play не примут обновление.
