#!/bin/sh
set -e

# Миграции + сид (идемпотентно), затем запуск Next.js
pnpm prisma migrate deploy
pnpm db:seed
exec pnpm start
