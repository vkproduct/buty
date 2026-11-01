#!/usr/bin/env bash
# Отправляет в IndexNow URL, изменённые со вчера (cron на хосте deploy):
#   30 4 * * * /opt/buty/scripts/cron-indexnow.sh >> /opt/buty-backups/indexnow.log 2>&1
# 04:30 — после ежесуточного бэкапа 03:17; nice -n 19 не мешает боевому трафику.
set -euo pipefail

cd /opt/buty
SINCE="$(date -d 'yesterday' +%F)"

docker compose -f docker-compose.prod.yml exec -T app \
  nice -n 19 pnpm indexnow:submit --since="$SINCE"
