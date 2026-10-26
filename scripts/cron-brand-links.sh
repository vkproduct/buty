#!/usr/bin/env bash
# Дёргает /api/cron/brand-links (проверка ссылок брендов).
# Cron на хосте (deploy): 40 4 * * * /opt/buty/scripts/cron-brand-links.sh
set -euo pipefail

DOMAIN="${DOMAIN:?задайте DOMAIN}"
CRON_SECRET="${CRON_SECRET:?задайте CRON_SECRET}"

curl -fsS -X POST "https://$DOMAIN/api/cron/brand-links" \
  -H "x-cron-secret: $CRON_SECRET"
