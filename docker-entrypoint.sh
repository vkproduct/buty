#!/bin/sh
set -e

# Миграции + сид (идемпотентно), затем запуск Next.js
pnpm prisma migrate deploy
pnpm db:seed

# Каталог продуктов INCIDB (~17k SKU) — только если ещё не импортирован:
# полный прогон идёт несколько минут, не делаем его при каждом рестарте.
# Скрипт считает ТОЛЬКО продукты source='incidb' (общий count после импорта
# goldapple уже > 17k и не показатель), поддерживает FORCE_INCIDB_IMPORT=1
# и сам ловит ошибки warn'ом, не валя старт контейнера.
node scripts/import-incidb-if-needed.mjs
exec pnpm start
