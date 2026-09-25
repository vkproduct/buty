#!/usr/bin/env bash
# Дёргает /api/cron/reminders. Cron на хосте (deploy): */15 * * * * /opt/buty/scripts/cron-reminders.sh
set -euo pipefail

DOMAIN="${DOMAIN:?задайте DOMAIN}"
CRON_SECRET="${CRON_SECRET:?задайте CRON_SECRET}"

curl -fsS -X POST "https://$DOMAIN/api/cron/reminders" \
  -H "x-cron-secret: $CRON_SECRET"
