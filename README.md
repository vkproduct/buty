# Buty.ru

Сервис разбора составов косметики с научным дерматологическим подходом.

**Бесплатно:** разбор состава (текст) + базовый подбор ухода.
**Платно («Pro»):** «Моя полка» — коллекция средств с проверкой совместимости активов, порядком нанесения, поиском дублей, историей реакций кожи и напоминаниями.

## Быстрый старт (Docker)

```bash
docker compose up --build
```

Поднимаются два сервиса: `db` (PostgreSQL 16) и `app` (Next.js на http://localhost:3000).
При старте контейнера автоматически выполняются `prisma migrate deploy` и сид базы.

## Локальная разработка

```bash
pnpm install
cp .env.example .env        # заполнить NEXTAUTH_SECRET и DATABASE_URL
pnpm db:migrate             # миграции + генерация Prisma Client
pnpm db:seed                # наполнение базы
pnpm dev                    # http://localhost:3000
```

## Команды

| Команда | Назначение |
| --- | --- |
| `pnpm dev` | dev-сервер |
| `pnpm build` / `pnpm start` | production-сборка / запуск |
| `pnpm typecheck` | проверка типов |
| `pnpm test` | тесты (vitest) |
| `pnpm db:migrate` | prisma migrate dev |
| `pnpm db:seed` | сид справочников |
| `docker compose up --build` | полный локальный запуск на чистой машине |

## Архитектура (в 10 строк)

1. Next.js 14 App Router: `/app` — маршруты, серверные компоненты и API-роуты.
2. PostgreSQL + Prisma: схема и миграции в `/prisma`, сид — `prisma/seed.ts`.
3. Анализ состава: текст → `normalizeInci` (токены) → `matchIngredients` (Ingredient + Synonym) → сводка и конфликты (`/lib/analysis`, `/lib/ingredients`).
4. «Моя полка»: ShelfItem → матрица совместимости, порядок нанесения, дубли, реакции, напоминания (`/lib/shelf`, `/lib/reminders`).
5. Авторизация: NextAuth email magic-link, сессии в БД (`/lib/auth`).
6. Монетизация: Subscription гейтит Pro; оплата через `PaymentProvider`; партнёрские клики — `/go/[productId]` → PartnerClick (`/lib/billing`, `/lib/payments`).
7. Админка `/admin` (доступ по `ADMIN_EMAILS`): пользователи, заявки брендов, словарь, CRUD продуктов/ингредиентов (`/lib/admin`).
8. Аналитика для брендов: `/lib/analytics` — разобранные составы, клики, топ нераспознанных токенов.
9. UI: Tailwind + shadcn/ui, обёртки GlassCard/Container, стекломорфизм (`/components`).
10. Внешние API — только за интерфейсами-адаптерами с mock по умолчанию (OCR, email, платежи).

## Реальные адаптеры (что включать в проде)

**OCR (`/lib/ocr`).** По умолчанию `MOCK_OCR=true` — провайдер-заглушка. Для прода реализовать интерфейс `OcrProvider` поверх Yandex Vision: ключи `YANDEX_VISION_API_KEY` и `YANDEX_VISION_FOLDER_ID` в `.env`, переключение — `MOCK_OCR=false`. Адаптер принимает изображение, возвращает распознанный текст состава; лимиты и ретраи — внутри адаптера.

**Платежи (`/lib/payments`).** По умолчанию `PAYMENTS_PROVIDER=mock` — MockPaymentProvider имитирует оплату Pro. Реальный провайдер — ЮKassa: создать платёж через API, вернуть `confirmation_url`, принимать webhook на `/api/payments/callback` с проверкой подписи; ключи `YUKASSA_SHOP_ID` и `YUKASSA_SECRET_KEY`, переключение — `PAYMENTS_PROVIDER=yukassa`.

**Email (`/lib/email`).** В dev — MockEmailProvider (magic-link печатается в консоль). В проде — Resend: установить `RESEND_API_KEY`, провайдер `ResendEmailProvider` уже реализует интерфейс `EmailProvider`; отправитель задаётся `EMAIL_FROM`.

## Админка

Доступ к `/admin` — по списку email в `ADMIN_EMAILS` (через запятую). Внутри: пользователи и подписки, заявки брендов, нераспознанные токены, добавление/правка продуктов и ингредиентов, базовая аналитика для брендов.

## Деплой

Вывод на сервер (DNS, TLS, reverse proxy) — часть 9, вне границ этого репозитория. Для прода собрать образ из `Dockerfile` и запустить с реальными переменными из `.env.example`.
