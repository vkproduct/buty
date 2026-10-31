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
# git pull переписывает файлы (новый inode) — bind-маунт контейнера продолжает
# смотреть на старый файл. Сверяем хэши и пересоздаём контейнер, если
# Caddyfile внутри устарел, затем reload.
HOST_HASH=\$(md5sum Caddyfile | cut -d' ' -f1)
CONT_HASH=\$(docker compose -f docker-compose.prod.yml exec -T caddy md5sum /etc/caddy/Caddyfile | cut -d' ' -f1)
if [ "\$HOST_HASH" != "\$CONT_HASH" ]; then
  echo "Caddyfile изменён — пересоздаю контейнер caddy"
  docker compose -f docker-compose.prod.yml up -d --force-recreate caddy
fi
docker compose -f docker-compose.prod.yml exec -T caddy caddy reload --config /etc/caddy/Caddyfile
docker compose -f docker-compose.prod.yml ps
EOF
