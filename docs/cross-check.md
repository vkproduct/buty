# Архитектурная сверка 8 брифов (часть 0)

Сверено: 2026-09-25. Стек фиксирован: Next.js 14 App Router + TS + Tailwind + shadcn/ui + PostgreSQL + Prisma + NextAuth. Пакетный менеджер: pnpm.

## Таблица «бриф → модели / маршруты / адаптеры»

| Часть | Модели Prisma | Маршруты | Интерфейсы-адаптеры | Зависит от |
|---|---|---|---|---|
| 1. Скелет, дизайн, лендинг | — | `/`, заглушки `/analyze`, `/shelf`, `/ingredients/[slug]`, `/products/[slug]`, `/pricing`, `robots.ts`, `sitemap.ts` | — | — |
| 2. База ингредиентов | `Ingredient`, `Synonym`, `Product`, `IngredientConflict` (+ join-таблица с порядком Product→Ingredient) | — | — (`/lib/ingredients/normalize.ts`, `match.ts`) | 1 |
| 3. Анализатор (текст) | `Feedback` (email?, rawToken, createdAt) | `/app/analyze/page.tsx`, `/api/analyze` | `OcrProvider` + `MockOcrProvider` (`/lib/ocr`, env `MOCK_OCR`) | 2 |
| 4. SEO-страницы | (использует 2; см. правку №2) | `/ingredients/[slug]`, `/ingredients`, `/products/[slug]`, `/products`; обновить `sitemap.ts` | — | 2, 3 (карточка ингредиента) |
| 5. Авторизация, полка (база) | `User`, `Account`, `Session`, `VerificationToken` (набор NextAuth-адаптера — правка №3), `ShelfItem`, `SkinProfile` | `/onboarding`, `/shelf` (базовый), NextAuth-роут `/api/auth/[...nextauth]` | `/lib/email/`: `MockEmailProvider` (dev), Resend (прод) | 2, 3 |
| 6. Логика полки | `SkinReaction`, `Reminder`, `NotificationLog` (правка №4) | `/api/cron/reminders` (защита `CRON_SECRET`), вкладки `/shelf` | `Notifier` + Mock (`/lib/reminders`) | 5 |
| 7. Монетизация | `Subscription`, `PartnerClick`, `BrandLead` | `/api/payments/callback`, `/go/[productId]`, `/pricing` (доработка), `/for-brands` | `PaymentProvider` + `MockPaymentProvider` (`/lib/payments`, env `PAYMENTS_PROVIDER`) | 5, 6 (gating совместимости) |
| 8. Админка, аналитика, деплой | (индексы: slug, userId) | `/admin`, ISR revalidate 3600 | `/lib/analytics/` (агрегаты по БД) | все |

## Коллизии имён и найденные противоречия (с решениями)

1. **`Feedback`**: создаётся в части 3, используется в части 8 (админка + топ нераспознанных токенов). Коллизии нет — зафиксирована зависимость; часть 8 НЕ создаёт модель повторно, только читает.
2. **`partnerUrl` в Product**: часть 4 говорит «партнёрская ссылка — поле в Product», часть 7 — «поле partnerUrl в Product». **Правка брифа:** `partnerUrl String?` создаётся в модели Product в **части 2/4** (часть 4 при seed'е продуктов), часть 7 только использует. Не добавлять поле дважды.
3. **NextAuth-модели**: бриф части 5 упоминает только `User`, но `@next-auth/prisma-adapter` требует `Account`, `Session`, `VerificationToken` — без них сборка/логин упадут. **Правка брифа части 5:** «модель `User` + стандартный набор Prisma-адаптера NextAuth (`Account`, `Session`, `VerificationToken`)».
4. **`NotificationLog`**: часть 6 упоминает таблицу без явной модели. **Правка брифа части 6:** добавить в список моделей `NotificationLog` (id, userId?, reminderId?, channel, payload, createdAt).
5. **«Resend-адаптер» (часть 5)**: у NextAuth нет Resend-адаптера; отправка письма с magic-link делается через `sendVerificationRequest` кастомного EmailProvider. **Правка формулировки:** «NextAuth EmailProvider; отправка через интерфейс `/lib/email/` — `MockEmailProvider` в dev (ссылка в консоль), Resend в проде».
6. **Команды в брифах** (`npm run dev`, `npx prisma`): не противоречие стеку, но пакетный менеджер зафиксирован — рабочие чаты используют `pnpm dev`, `pnpm prisma migrate dev`, `pnpm prisma db seed`.
7. **vitest**: впервые появляется в части 2 (dev-зависимость), тесты также в частях 3, 6, 7, 8. Устанавливается один раз в части 2, дальше переиспользуется.
8. **`CRON_SECRET`**: часть 6 говорит «заголовок-защита по env-ключу» без имени. Зафиксировано имя `CRON_SECRET`, проверка заголовка `x-cron-secret` в `/api/cron/reminders`.
9. **Заглушки части 1**: `/shelf`, `/ingredients/[slug]`, `/products/[slug]` заменяются реальными страницами в частях 4–5. Это штатная замена содержимого заглушек, а не рефакторинг — правило 1 (не рефакторить) не нарушается.

**Вывод:** противоречий стеку нет; сборку сломали бы №3 и №5 — обе исправлены формулировкой. Остальное — зафиксированные зависимости и имена.
