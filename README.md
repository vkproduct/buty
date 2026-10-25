# Buty.app

Сервис разбора составов косметики с научным дерматологическим подходом.

**Бесплатно:** разбор состава (текст и фото) и вся «Моя полка» — коллекция средств с проверкой совместимости активов, порядком нанесения, поиском дублей, историей реакций кожи, напоминаниями и экспортом в PDF. Подписок для пользователей нет: монетизация — B2B (бренды, дистрибьюторы, `/for-brands`). Платёжный код отключён флагом `USER_FEATURES_FREE` в `lib/billing.ts`, не удалён.

**Состояние базы (волна 5):** 280 ингредиентов с дерматологическими карточками, 878 синонимов, 49 конфликтов активов. Покрытие расширенной выборки из 15 реальных INCI-составов — 98% (замер без БД: `scripts/check-compositions-local.ts`; через БД: `scripts/check-compositions.ts`; единственный нераспознанный токен — Tribioma, проприетарный комплекс L'Oréal, не являющийся INCI-ингредиентом).

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
| `DRY_RUN=1 pnpm db:import-goldapple` | сухой прогон импорта каталога ЗЯ: отчёт без записи в БД (`data/goldapple/import-report.json`, CSV не в git) |
| `DRY_RUN=0 pnpm db:import-goldapple` | импорт каталога ЗЯ из `data/goldapple/goldapple_products_inci.csv` (идемпотентно, upsert по source+sku) |
| `pnpm exec tsx scripts/check-compositions.ts` | замер покрытия базы на 15 реальных INCI-составах (через БД) |
| `pnpm exec tsx scripts/check-compositions-local.ts` | тот же замер без БД — словарь собирается из сида |
| `docker compose up --build` | полный локальный запуск на чистой машине |

## Архитектура (в 10 строк)

1. Next.js 14 App Router: `/app` — маршруты, серверные компоненты и API-роуты.
2. PostgreSQL + Prisma: схема и миграции в `/prisma`, сид — `prisma/seed.ts`.
3. Анализ состава: текст → `normalizeInci` (токены: регистр, скобки, запятая не режет «1,2-Hexanediol», слэш-токены вроде «Caprylic/Capric Triglyceride» сначала матчатся целиком, при промахе — по частям) → `matchIngredients` (Ingredient + Synonym) → сводка и конфликты (`/lib/analysis`, `/lib/ingredients`).
4. «Моя полка»: ShelfItem → матрица совместимости, порядок нанесения, дубли, реакции, напоминания (`/lib/shelf`, `/lib/reminders`).
5. Авторизация: NextAuth email magic-link, сессии в БД (`/lib/auth`).
6. Монетизация: B2B (бренды, дистрибьюторы, `/for-brands`). Подписок Pro для пользователей нет: платёжный код (`/lib/payments`, `/api/payments`) отключён флагом `USER_FEATURES_FREE` в `/lib/billing.ts`, не удалён; партнёрские клики — `/go/[productId]` → PartnerClick.
7. Админка `/admin` (доступ по `ADMIN_EMAILS`): пользователи, заявки брендов, словарь, CRUD продуктов/ингредиентов (`/lib/admin`).
8. Аналитика для брендов: `/lib/analytics` — разобранные составы, клики, топ нераспознанных токенов.
9. UI: Tailwind + shadcn/ui, обёртки GlassCard/Container, стекломорфизм (`/components`).
10. Внешние API — только за интерфейсами-адаптерами с mock по умолчанию (OCR, email, платежи).

## Мобильное приложение (iOS)

Папка `mobile/` — приложение на Expo (React Native). Оно работает с этим же сервером через `/api/mobile/*`
и общие API: вход по коду из письма с Bearer-токеном, push-напоминания через Expo.
Сборка, TestFlight и публикация описаны в [docs/ios.md](docs/ios.md), команды — в [mobile/README.md](mobile/README.md).

## Реальные адаптеры (что включать в проде)

**OCR (`/lib/ocr`).** Google Cloud Vision (`DOCUMENT_TEXT_DETECTION`). Браузер отправляет фото на `/api/ocr`, сервер пересылает его в Google со своим ключом — ключ в браузер не попадает. Включение: `GOOGLE_VISION_API_KEY` в `.env`; без ключа роут отвечает 501, и на сайте показывается «OCR скоро». Из распознанного текста берётся часть после «Ingredients:»/«Состав:» (`extractInci`). Ограничения: фото до 7 МБ, 20 распознаваний в час с одного IP. Если Google не принимает запросы с сервера в РФ — поставить переходник в Европе и указать его адрес в `GOOGLE_VISION_ENDPOINT`.

**Платежи (`/lib/payments`).** По умолчанию `PAYMENTS_PROVIDER=mock` — MockPaymentProvider имитирует оплату Pro. Реальный провайдер — ЮKassa: создать платёж через API, вернуть `confirmation_url`, принимать webhook на `/api/payments/callback` с проверкой подписи; ключи `YUKASSA_SHOP_ID` и `YUKASSA_SECRET_KEY`, переключение — `PAYMENTS_PROVIDER=yukassa`.

**Email (`/lib/email`).** В dev — MockEmailProvider (magic-link печатается в консоль). В проде — Resend: провайдер `ResendEmailProvider` уже реализует интерфейс `EmailProvider`. Подключение: 1) в dashboard Resend (resend.com) добавить домен `buty.app` и прописать у регистратора выданные DNS-записи (SPF/DKIM: TXT + CNAME); 2) создать API-ключ → переменная `RESEND_API_KEY` в Vercel; 3) `EMAIL_FROM="Buty.app <noreply@buty.app>"`. До верификации домена Resend пускает отправку только с тестового адреса `onboarding@resend.dev` (для `EMAIL_FROM`).

## Админка

Доступ к `/admin` — по списку email в `ADMIN_EMAILS` (через запятую). Внутри: пользователи и подписки, заявки брендов, нераспознанные токены, добавление/правка продуктов и ингредиентов, базовая аналитика для брендов.

## Деплой (прод: Beget VPS)

Прод живёт на VPS Beget: **62.217.180.33**, Ubuntu 24.04, `/opt/buty`, пользователь `deploy`. Стек `docker-compose.prod.yml`: `app` (сборка из репозитория), `db` (Postgres, volume, не торчит наружу), `caddy` (HTTPS Let's Encrypt, редирект www → bare, gzip). Docker Hub в РФ недоступен — в `/etc/docker/daemon.json` на сервере прописаны зеркала `dockerhub1.beget.com` и `mirror.gcr.io`.

**Схема CI/CD (уже работает):** push в `main` → GitHub Action `.github/workflows/deploy.yml` → SSH на сервер → `git pull --ff-only` → `docker compose -f docker-compose.prod.yml up -d --build` → prune образов. При старте контейнера entrypoint идемпотентно накатывает `prisma migrate deploy` + `db:seed`; импорт каталога INCIDB (~17k продуктов) выполняется только если в БД меньше 17 000 продуктов (рестарты быстрые). В репозитории заданы: переменные `SERVER_HOST=62.217.180.33`, `SERVER_USER=deploy` и секрет `SERVER_SSH_KEY` (отдельный deploy-ключ `github-actions-deploy@buty`; отзыв — удалить строку из `~deploy/.ssh/authorized_keys` на сервере).

**Ручной деплой:** `./scripts/deploy.sh` (или `ssh deploy@62.217.180.33` и команды из таблицы ниже).

**Проверки после деплоя:** `curl https://buty.app/api/health` → `{"ok":true,"db":"up"}`; `curl -I https://buty.app`; `docker compose -f docker-compose.prod.yml ps` — все контейнеры healthy.

**Операции на сервере** (из `/opt/buty`):

| Задача | Команда |
| --- | --- |
| Логи | `docker compose -f docker-compose.prod.yml logs -f app` |
| Перезапуск | `docker compose -f docker-compose.prod.yml restart app` |
| Откат на прошлый коммит | `git checkout <sha> && docker compose -f docker-compose.prod.yml up -d --build` |
| Доимпорт каталога INCIDB вручную | `docker compose -f docker-compose.prod.yml exec app pnpm db:import-incidb` |
| Импорт каталога ЗЯ (CSV уже на сервере в `data/goldapple/`) | `docker compose -f docker-compose.prod.yml exec -e DRY_RUN=0 app pnpm db:import-goldapple` |
| Классификация типов средств через Gemini (кэш `data/<источник>/product-types.jsonl`, возобновляемо; `CLASSIFY_SOURCE=goldapple` (по умолчанию) или `=incidb` — ключ slug, по умолчанию только `category=other`; переменные `CLASSIFY_ALL=1`, `CLASSIFY_MIN_PROMPT_VERSION`, `CLASSIFY_LIMIT`, `CLASSIFY_SAMPLE=1`, `CLASSIFY_CONCURRENCY`, `CLASSIFY_MAX_REQUESTS`, `CLASSIFY_SKUS_FILE`, `TYPES_FILE`) | `pnpm db:classify-types` |
| Применение кэша классификатора к продуктам БД (`TYPES_SOURCE=incidb`; `DRY_RUN=1` по умолчанию — отчёт с полным списком скрываемой не-косметики; не-косметика → `hidden=true`) | `pnpm db:apply-types` |

Классификация типов ЗЯ на проде — в фоне, с пониженным приоритетом
(lock-файл `/tmp/classify-types.lock` в контейнере; повторный запуск
продолжает с места остановки и не делает лишних запросов к Gemini):

```bash
docker compose -f docker-compose.prod.yml exec -d app sh -c "nice -n 19 pnpm db:classify-types > /tmp/classify.log 2>&1"
docker compose -f docker-compose.prod.yml exec app tail -f /tmp/classify.log  # прогресс
# контрольная выборка 150 продуктов (seed 42) + classify-sample.csv:
docker compose -f docker-compose.prod.yml exec -d app sh -c "CLASSIFY_SAMPLE=1 CLASSIFY_LIMIT=150 nice -n 19 pnpm db:classify-types > /tmp/classify.log 2>&1"
```

Внимание: `./data` примонтирован в `/app/data` volume'ом — кэши
(`data/goldapple/product-types.jsonl`, `data/incidb/product-types.jsonl`)
переживают пересборку контейнера. Скачивайте их с сервера как актив
(бэкапятся ежесуточным архивом `data-<дата>.tar.gz`).

Импорт ЗЯ на проде — только в фоне, с пониженным приоритетом и не в рабочее
время (полный прогон грузит VPS на несколько минут; параллельный запуск
блокируется lock-файлом `/tmp/import-goldapple.lock` в контейнере):

```bash
docker compose -f docker-compose.prod.yml exec -d app sh -c "nice -n 19 pnpm db:import-goldapple > /tmp/import-goldapple.log 2>&1"
docker compose -f docker-compose.prod.yml exec app tail -f /tmp/import-goldapple.log  # прогресс
```

**Бэкапы.** Ежедневно в `/opt/buty-backups` (cron `deploy`: `17 3 * * * /opt/buty/scripts/backup.sh >> /opt/buty-backups/backup.log 2>&1`): дамп Postgres `buty-<дата>.sql.gz` + архив данных `data-<дата>.tar.gz` (CSV каталога ЗЯ, кэш ИИ-типов; `.env` не бэкапится). Локальная ротация 14 дней. Если в `/opt/buty/.env` заданы `BACKUP_S3_ENDPOINT`/`BACKUP_S3_BUCKET`/`BACKUP_S3_KEY`/`BACKUP_S3_SECRET`, свежие файлы дополнительно уходят в объектное хранилище через образ `rclone/rclone` (хранение 30 дней); без ключей — только локальный бэкап, скрипт не падает.

Восстановление из бэкапа:

```bash
docker compose -f docker-compose.prod.yml stop app
gunzip -c /opt/buty-backups/buty-<дата>.sql.gz | docker compose -f docker-compose.prod.yml exec -T db psql -U buty -d buty
docker compose -f docker-compose.prod.yml start app
curl https://buty.app/api/health   # {"ok":true,"db":"up"}
```

**Первичная настройка нового сервера** (если переезжаем): `scripts/server-setup.sh` от root (пользователь deploy, UFW, fail2ban, Docker), затем `git clone` в `/opt/buty`, `.env` из `.env.example` (DOMAIN, POSTGRES_PASSWORD, NEXTAUTH_SECRET, NEXTAUTH_URL, CRON_SECRET, ADMIN_EMAILS, RESEND_API_KEY, EMAIL_FROM), `docker compose -f docker-compose.prod.yml up -d --build`, cron-напоминания `scripts/cron-reminders.sh`. Мониторинг: Better Stack — HTTP-чек `https://buty.app/api/health` каждые 30 с.

<details>
<summary>Архив: деплой на Vercel (прод уехал с Vercel — платформа недоступна из РФ)</summary>

1. **База.** Managed Postgres — Supabase (или Neon/Vercel Postgres). Для Supabase: pooled-строка (порт 6543) → `DATABASE_URL` с суффиксом `?pgbouncer=true&connection_limit=1`, direct-строка (порт 5432) → `DIRECT_URL` (миграции идут через неё, `directUrl` в `prisma/schema.prisma`).
2. **Импорт.** vercel.com → New Project → импорт репозитория. `vercel.json` задаёт buildCommand: `prisma generate → migrate deploy → db seed → импорт INCIDB (одноразово) → next build` (миграции и сид идемпотентны).
3. **Переменные окружения (Project Settings → Environment Variables):** `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_URL=https://buty.app`, `NEXTAUTH_SECRET` (сгенерировать: `openssl rand -base64 32`), `CRON_SECRET`, `ADMIN_EMAILS`, `EMAIL_FROM="Buty.app <noreply@buty.app>"`, `RESEND_API_KEY` (см. раздел «Реальные адаптеры»). Mock-режим оплаты оставить: `PAYMENTS_PROVIDER=mock`; OCR — `GOOGLE_VISION_API_KEY` (без ключа — mock).
4. **Домен.** Project Settings → Domains → подключить `buty.app` и `www.buty.app` (Vercel сам выпускает TLS и даёт редирект www → bare). У регистратора: A-запись `@` → IP из подсказки Vercel, CNAME `www` → `cname.vercel-dns.com`. После подключения обновить `NEXTAUTH_URL` → Redeploy.
5. **Cron.** `vercel.json` дёргает `/api/cron/reminders` ежедневно в 03:17 UTC; Vercel автоматически шлёт `Authorization: Bearer $CRON_SECRET`.
6. **Проверки после деплоя:** `curl https://<домен>/api/health` → `{"ok":true,"db":"up"}`; `/robots.txt`, `/sitemap.xml` → 200.
7. **Бэкапы.** Снапшоты managed-БД; точечный дамп: `pg_dump "$DATABASE_URL" --clean --if-exists | gzip > buty-$(date +%Y%m%d).sql.gz`. Восстановление: `gunzip -c файл.sql.gz | psql "$DATABASE_URL"`.
8. **Мониторинг.** Better Stack — HTTP-чек `https://<домен>/api/health` каждые 30 с, алерт в Telegram/email.

</details>
