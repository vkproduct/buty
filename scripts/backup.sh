#!/usr/bin/env bash
# Ежедневный бэкап Postgres из контейнера db + ротация 14 дней.
# Установка на сервере (cron от deploy): 17 3 * * * /opt/buty/scripts/backup.sh >> /opt/buty-backups/backup.log 2>&1
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/opt/buty-backups}"
APP_DIR="${APP_DIR:-/opt/buty}"
KEEP_DAYS=14
STAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"
cd "$APP_DIR"
docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U buty -d buty --clean --if-exists | gzip > "$BACKUP_DIR/buty-$STAMP.sql.gz"

find "$BACKUP_DIR" -name 'buty-*.sql.gz' -mtime +$KEEP_DAYS -delete
echo "backup ok: buty-$STAMP.sql.gz"
