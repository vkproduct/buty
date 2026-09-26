# Архитектура Buty.app

**Стек:** Next.js 14 (App Router) + TypeScript + TailwindCSS + shadcn/ui + PostgreSQL + Prisma + NextAuth (email magic-link). Пакетный менеджер: pnpm. Тесты: vitest (dev-dependency).

**Структура:** `/app` — маршруты и роут-хендлеры; `/components` — UI (обёртки GlassCard/GradientSection/Container, вёрстка только через них); `/lib` — бизнес-логика и адаптеры (`/lib/ingredients`, `/lib/ocr`, `/lib/email`, `/lib/shelf`, `/lib/reminders`, `/lib/payments`, `/lib/analytics`); `/prisma` — схема + seed; `/public` — статика; `/docs` — документация.

**Поток данных (анализ):** текст состава → `normalizeInci` (токены) → `matchIngredients` (Ingredient + Synonym) → сводка + предупреждения (IngredientConflict) → карточки ингредиентов. OCR идёт через интерфейс `OcrProvider` (mock по умолчанию).

**Поток данных (полка):** ShelfItem «использую» → попарная матрица совместимости (IngredientConflict) → `buildRoutine` (утро/вечер с учётом SkinProfile) → дубли (пересечение активов ≥2), реакции (SkinReaction), напоминания (Reminder → Notifier → NotificationLog, cron `/api/cron/reminders`).

**Монетизация:** Subscription (free/pro) гейтит совместимость и режим; оплата через `PaymentProvider` (mock); партнёрские клики через `/go/[productId]` → PartnerClick.

**Правила:** внешние API только за интерфейсами-адаптерами; мок-реализации по умолчанию; реальные ключи — только в `.env.example`. См. [cross-check.md](./cross-check.md) — сверка всех 8 брифов.
