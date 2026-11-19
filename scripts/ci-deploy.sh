#!/usr/bin/env bash
# Деплой, который выполняется на сервере. Вызывается автоматически при SSH-подключении
# ключа GitHub Actions: в ~deploy/.ssh/authorized_keys строка этого ключа начинается с
#   command="/opt/buty/scripts/ci-deploy.sh",no-port-forwarding,no-agent-forwarding,no-X11-forwarding,no-pty
# Так ключ CI может делать ТОЛЬКО деплой: ни shell, ни туннелей, ни других команд.
set -euo pipefail

cd /opt/buty
git pull --ff-only
docker compose -f docker-compose.prod.yml up -d --build

# git pull переписывает файлы (новый inode) — bind-маунт контейнера
# продолжает смотреть на старый файл. Сверяем хэши и пересоздаём
# контейнер, если Caddyfile внутри устарел, затем reload.
HOST_HASH=$(md5sum Caddyfile | cut -d' ' -f1)
CONT_HASH=$(docker compose -f docker-compose.prod.yml exec -T caddy md5sum /etc/caddy/Caddyfile | cut -d' ' -f1)
if [ "$HOST_HASH" != "$CONT_HASH" ]; then
  echo "Caddyfile изменён — пересоздаю контейнер caddy"
  docker compose -f docker-compose.prod.yml up -d --force-recreate caddy
fi
docker compose -f docker-compose.prod.yml exec -T caddy caddy reload --config /etc/caddy/Caddyfile
docker image prune -f
docker compose -f docker-compose.prod.yml ps
