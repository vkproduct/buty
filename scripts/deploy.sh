#!/usr/bin/env bash
# Ручной деплой (запасной вариант к GitHub Action).
# Использование: ./scripts/deploy.sh [user@server] — по умолчанию deploy@$SERVER_HOST.
set -euo pipefail

TARGET="${1:-deploy@${SERVER_HOST:?задайте SERVER_HOST или передайте user@server}}"
APP_DIR="/opt/buty"

ssh "$TARGET" bash -s <<EOF
set -e
cd $APP_DIR
git pull --ff-only
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
EOF
