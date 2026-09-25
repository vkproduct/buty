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

## Деплой (Vercel)

1. **База.** Managed Postgres — Neon или Vercel Postgres; строку подключения положить в env `DATABASE_URL` (с `?connection_limit=1` не нужно — Prisma 6 сам управляет пулом; для Neon использовать pooled-строку).
2. **Импорт.** vercel.com → New Project → импорт репозитория. `vercel.json` уже задаёт buildCommand: `prisma generate → migrate deploy → db seed → next build` (миграции и сид идемпотентны, выполняются при каждом деплое).
3. **Переменные окружения (Project Settings → Environment Variables):** `DATABASE_URL`, `NEXTAUTH_URL=https://<домен>`, `NEXTAUTH_SECRET` (сгенерировать: `openssl rand -base64 32`), `CRON_SECRET`, `ADMIN_EMAILS`, `EMAIL_FROM`. Mock-режимы оставить: `MOCK_OCR=true`, `PAYMENTS_PROVIDER=mock`, email — mock.
4. **Домен.** Project Settings → Domains → подключить `<домен>` и `www.<домен>` (Vercel сам выпускает TLS и даёт редирект www → bare).
5. **Cron.** `vercel.json` дёргает `/api/cron/reminders` каждые 15 минут; Vercel автоматически шлёт `Authorization: Bearer $CRON_SECRET` — роут принимает и его, и `x-cron-secret`.
6. **Проверки после деплоя:** `curl https://<домен>/api/health` → `{"ok":true,"db":"up"}`; `/robots.txt`, `/sitemap.xml` → 200. CI/CD: push в `main` → автоматический деплой ≤5 минут.
7. **Бэкапы.** У Neon/Vercel Postgres включены автоматические снапшоты; дополнительно точечный дамп: `pg_dump "$DATABASE_URL" --clean --if-exists | gzip > buty-$(date +%Y%m%d).sql.gz`. Восстановление: `gunzip -c файл.sql.gz | psql "$DATABASE_URL"`.
8. **Мониторинг.** Better Stack — HTTP-чек `https://<домен>/api/health` каждые 30 с, алерт в Telegram/email.

## Деплой (альтернатива: свой VPS)

<details>
<summary>Docker-стек на арендованном сервере (если понадобятся российские платёжки/cron на хосте)</summary>

Стек на сервере: `docker-compose.prod.yml` — `app` (сборка из репозитория), `db` (Postgres, volume, не торчит наружу), `caddy` (автоматический HTTPS Let's Encrypt, редирект www → bare, gzip). Отдельная внутренняя сеть, `restart: unless-stopped`.

1. **DNS.** A-записи `<DOMAIN>` и `www.<DOMAIN>` → IP сервера (у регистратора).
2. **Подготовка сервера (один раз, от root):** `bash scripts/server-setup.sh` — обновления, пользователь `deploy` (без root-логина и паролей), UFW 22/80/443, fail2ban, Docker + compose plugin.
3. **Код и секреты (от deploy):** `cd /opt/buty && git clone <repo> . && cp .env.example .env`. В `.env` заполнить: `DOMAIN`, `POSTGRES_PASSWORD`, `NEXTAUTH_SECRET` (сгенерировать заново: `openssl rand -base64 32`), `NEXTAUTH_URL=https://<DOMAIN>`, `CRON_SECRET`, `ADMIN_EMAILS`. Mock-режимы оставить: `MOCK_OCR=true`, `PAYMENTS_PROVIDER=mock`, email — mock.
4. **Запуск:** `docker compose -f docker-compose.prod.yml up -d --build`. Миграции и сид выполняются entrypoint'ом при каждом старте (идемпотентно).
5. **CI/CD:** push в `main` → GitHub Action `.github/workflows/deploy.yml` (ssh → git pull → build → up -d). Секреты репозитория: `SERVER_HOST`, `SERVER_USER`, `SERVER_SSH_KEY`. Запасной вариант: `./scripts/deploy.sh deploy@<SERVER_IP>`.
6. **Cron-напоминания:** на хосте `crontab -e` (deploy): `*/15 * * * * DOMAIN=<DOMAIN> CRON_SECRET=<секрет> /opt/buty/scripts/cron-reminders.sh`.
7. **Мониторинг:** Better Stack (бесплатный тариф) — HTTP-чек `https://<DOMAIN>/api/health` каждые 30 с, алерт в Telegram/email.

**Проверки после деплоя:** `curl -I https://<DOMAIN>`, `curl https://<DOMAIN>/robots.txt`, `curl https://<DOMAIN>/sitemap.xml`, `curl https://<DOMAIN>/api/health` → `{"ok":true,"db":"up"}`; `docker compose -f docker-compose.prod.yml ps` — все контейнеры healthy.

**Операции на сервере** (из `/opt/buty`):

| Задача | Команда |
| --- | --- |
| Логи | `docker compose -f docker-compose.prod.yml logs -f app` |
| Перезапуск | `docker compose -f docker-compose.prod.yml restart app` |
| Откат на прошлый коммит | `git checkout <sha> && docker compose -f docker-compose.prod.yml up -d --build` |

**Бэкапы.** Ежедневный `pg_dump` в `/opt/buty-backups`, ротация 14 дней: `crontab -e` (deploy) → `17 3 * * * /opt/buty/scripts/backup.sh >> /opt/buty-backups/backup.log 2>&1`.

Восстановление из бэкапа (5 шагов):

```bash
docker compose -f docker-compose.prod.yml stop app
gunzip -c /opt/buty-backups/buty-<дата>.sql.gz | docker compose -f docker-compose.prod.yml exec -T db psql -U buty -d buty
docker compose -f docker-compose.prod.yml start app
curl https://<DOMAIN>/api/health   # {"ok":true,"db":"up"}
```

</details>
