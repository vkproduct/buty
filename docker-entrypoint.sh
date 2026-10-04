#!/bin/sh
set -e

# Миграции + сид (идемпотентно), затем запуск Next.js
pnpm prisma migrate deploy
pnpm db:seed

# Каталог продуктов INCIDB (~17k SKU) — только если ещё не импортирован:
# полный прогон идёт несколько минут, не делаем его при каждом рестарте.
# FORCE_INCIDB_IMPORT=1 — принудительный прогон (нужен при исправлениях импорта).
PRODUCTS_COUNT=$(node -e "const{PrismaClient}=require('@prisma/client');new PrismaClient().product.count().then(c=>{console.log(c);process.exit(0)}).catch(()=>{console.log(0);process.exit(0)})")
if [ "$FORCE_INCIDB_IMPORT" = "1" ] || [ "$PRODUCTS_COUNT" -lt 17000 ]; then
  pnpm db:import-incidb
fi
exec pnpm start
