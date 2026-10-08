# Дорожная карта Buty.app (8 частей)

HANDOFF-блоки вставляются сюда по мере завершения частей (под соответствующим пунктом).

- [ ] **Часть 0/8 — Подготовка окружения и сверка архитектуры** (этот чат)
  HANDOFF: см. финальный ответ чата + [cross-check.md](./cross-check.md)
- [x] **Часть 1/8 — Скелет проекта, дизайн-система, лендинг**
  HANDOFF: см. финальный ответ чата части 1
- [x] **Часть 2/8 — База ингредиентов: модели, словарь, нормализатор INCI**
  HANDOFF: см. финальный ответ чата части 2 (schema.prisma, seed 30 ингредиентов / 15 конфликтов, lib/ingredients/*, 12 vitest-кейсов)
- [x] **Часть 3/8 — Анализатор состава (MVP: ввод текста)**
  HANDOFF: см. финальный ответ чата части 3 (API /api/analyze + /api/feedback, страница /analyze, OCR-адаптер с mock, модель Feedback, 15 vitest-кейсов)
- [x] **Часть 4/8 — SEO-инфраструктура: страницы ингредиентов и продуктов**
  HANDOFF: см. финальный ответ чата части 4 (каталоги и карточки ингредиентов/продуктов с SSG и JSON-LD, +10 продуктов в seed, sitemap из БД)
- [x] **Часть 5/8 — Авторизация и «Моя полка» (база)**
  HANDOFF: см. финальный ответ чата части 5 (NextAuth email magic-link + MockEmailProvider, модели User/ShelfItem/SkinProfile, /onboarding, /shelf с добавлением/удалением/статусами, Header со входом-выходом, 18 vitest-кейсов)
- [x] **Часть 6/8 — Логика «Моей полки»: конфликты, порядок, дубли, реакции, напоминания**
  HANDOFF: см. финальный ответ чата части 6 (lib/shelf/compatibility + buildRoutine, модели SkinReaction/Reminder/NotificationLog, lib/reminders с MockNotifier и cron-роутом, вкладки /shelf, 29 vitest-кейсов)
- [x] **Часть 7/8 — Монетизация: подписка, paywall, партнёрские ссылки**
  HANDOFF: см. финальный ответ чата части 7 (Subscription/PartnerClick/BrandLead, lib/payments с MockPaymentProvider, /pricing с mock-оплатой, paywall free=2 средства + скрытая матрица, /go редиректы, /profile, /for-brands, 46 vitest-кейсов)
- [x] **Часть 8/8 — Финал: админка, аналитика, QA, деплой**
  HANDOFF: см. финальный ответ чата части 8 (/admin по ADMIN_EMAILS, lib/analytics, ISR revalidate 3600, OG/manifest/favicon, индексы Prisma, Dockerfile + docker-compose, README, 51 vitest-кейс)
- [x] **Часть 9/9 — Деплой на продакшен (Vercel + Supabase, сайт в интернете)**
  HANDOFF: см. финальный ответ чата части 9 (/api/health, vercel.json с buildCommand миграции+сид и cron ежедневно 03:17 UTC, cron-роут принимает GET + Bearer, directUrl в schema.prisma для Supabase, README: деплой на Vercel + VPS-вариант в details, Docker-инфраструктура сохранена как альтернатива). Прод: https://buty-ecru.vercel.app, БД Supabase (пулер 6543 для app, 5432 для миграций), репо github.com/vkproduct/buty, автодеплой из main.
- [x] **Фича A — флаги: комедогенность, Malassezia, аллергены-отдушки** (бриф в buty-ru-dev-briefs.md)
  HANDOFF: три Boolean-поля в `Ingredient` (миграция `20260928215124_ingredient_safety_flags`), словарь `prisma/flags.data.ts` (22 ингредиента, мерж по slug в сиде, неизвестный slug → падение сида), флаги в DTO разбора / сводке / советах / страницах ингредиентов / фильтрах каталога (`?flags=` мультивыбор), компонент `IngredientFlags`, метаданные в `lib/ingredients/flags.ts`. Критерии честнее конкурента: комедогенность только с опубликованными данными, спорная малассезия без флага.
- [ ] **Фича B — разбор по фото: Yandex Vision OCR + лимиты** (бриф в buty-ru-dev-briefs.md)
- [x] **Фильтр каталога продуктов — бренды и категории (мобайл + десктоп)**
  HANDOFF: `lib/products/catalog-filters.ts` (+ тесты), `components/products/product-filters.tsx` (нижний лист / выпадающая панель), `components/products/chip-rail.tsx`, `lib/seo/product-categories.ts`, переписан `app/products/page.tsx`; URL `?q=&brand=…&brand=…&category=…`; детали — docs/decisions.md, запись 2026-09-29.
- [x] **Фильтр каталога ингредиентов — вёрстка и удобство (мобайл + десктоп)**
  HANDOFF: `lib/ingredients/catalog-filters.ts` (+ 10 тестов), `components/ingredients/ingredient-filters.tsx` (нижний лист / выпадающие панели), переписан тулбар `app/ingredients/page.tsx`, `CATEGORY_PLURAL` в `lib/seo/ingredient-categories.ts`; URL `?q=&category=…&evidence=…&flag=…` (старые `?flags=a,b` работают); `components/ingredients/filter-popover.tsx` удалён; детали — docs/decisions.md, запись 2026-09-29 «Каталог ингредиентов: фильтр».
- [x] **Android-приложение (Trusted Web Activity)**
  HANDOFF: `android/` (TWA, пакет `app.buty.android`), `.github/workflows/android.yml` (APK + AAB по кнопке), `public/.well-known/assetlinks.json`, PNG-иконки и ярлыки в `app/manifest.ts`; инструкция по сборке, установке и публикации в Google Play / RuStore — docs/android.md; детали — docs/decisions.md, запись 2026-10-08.
- [x] **iOS-приложение (Expo) + мобильный API** — код готов, публикация по docs/ios.md
  HANDOFF: `mobile/` (Expo SDK 57, Expo Router, TanStack Query; вкладки Разбор/Каталог/Полка/Профиль, модалки входа, анкеты, добавления, реакции); сервер — `app/api/mobile/*` (вход по коду, me, account DELETE, push-tokens, shelf, dictionaries, каталоги), `lib/mobile/*`, `lib/shelf/view.ts` (общая сборка полки для /shelf и API), `lib/reminders/expo.ts` (push через Expo, запасной канал — MockNotifier), Bearer в `getSession()`; миграция `20261008120000_mobile_app`; +24 vitest-кейса. Дальше: страница /privacy, аккаунты Apple/Expo, `eas init`, сборка, TestFlight, App Review — шаги в docs/ios.md.
