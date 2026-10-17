#!/usr/bin/env bash
# Ежедневный бэкап: дамп Postgres из контейнера db + архив /opt/buty/data
# (CSV каталога ЗЯ, кэш ИИ-типов product-types.jsonl). .env в бэкап НЕ включаем.
# Локальная ротация — 14 дней.
#
# Если в /opt/buty/.env заданы BACKUP_S3_ENDPOINT/BACKUP_S3_BUCKET/BACKUP_S3_KEY/
# BACKUP_S3_SECRET — свежие файлы дополнительно копируются в бакет через образ
# rclone/rclone (без установки пакетов на хост), хранение в бакете — 30 дней
# (rclone delete --min-age 30d). Без ключей — только локальный бэкап, не падаем.
#
# Установка на сервере (cron от deploy):
#   17 3 * * * /opt/buty/scripts/backup.sh >> /opt/buty-backups/backup.log 2>&1
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/opt/buty-backups}"
APP_DIR="${APP_DIR:-/opt/buty}"
KEEP_DAYS=14
S3_KEEP_DAYS=30
STAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"
cd "$APP_DIR"

# 1. Дамп Postgres.
docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U buty -d buty --clean --if-exists | gzip > "$BACKUP_DIR/buty-$STAMP.sql.gz"
echo "backup ok: buty-$STAMP.sql.gz"

# 2. Архив данных (data/ примонтирована в app как /app/data; .env сюда не входит).
if [ -d "$APP_DIR/data" ]; then
  tar -czf "$BACKUP_DIR/data-$STAMP.tar.gz" -C "$APP_DIR" data
  echo "backup ok: data-$STAMP.tar.gz"
else
  echo "backup warn: $APP_DIR/data не найдена — пропускаю архив данных"
fi

# 3. Локальная ротация.
find "$BACKUP_DIR" -name 'buty-*.sql.gz' -mtime +$KEEP_DAYS -delete
find "$BACKUP_DIR" -name 'data-*.tar.gz' -mtime +$KEEP_DAYS -delete

# 4. Копия в объектное хранилище (этап Б) — только если заданы ключи в .env.
set -a; [ -f "$APP_DIR/.env" ] && . "$APP_DIR/.env"; set +a
if [ "${BACKUP_S3_ENDPOINT:-}" ] && [ "${BACKUP_S3_BUCKET:-}" ] && [ "${BACKUP_S3_KEY:-}" ] && [ "${BACKUP_S3_SECRET:-}" ]; then
  RCLONE_ENV=(
    -e "RCLONE_CONFIG_B_TYPE=s3"
    -e "RCLONE_CONFIG_B_PROVIDER=Other"
    -e "RCLONE_CONFIG_B_ACCESS_KEY_ID=$BACKUP_S3_KEY"
    -e "RCLONE_CONFIG_B_SECRET_ACCESS_KEY=$BACKUP_S3_SECRET"
    -e "RCLONE_CONFIG_B_ENDPOINT=$BACKUP_S3_ENDPOINT"
    -e "RCLONE_CONFIG_B_ACL=private"
  )
  for f in "$BACKUP_DIR/buty-$STAMP.sql.gz" "$BACKUP_DIR/data-$STAMP.tar.gz"; do
    [ -f "$f" ] || continue
    docker run --rm "${RCLONE_ENV[@]}" -v "$BACKUP_DIR:/backup:ro" rclone/rclone:latest \
      copy "/backup/$(basename "$f")" "B:$BACKUP_S3_BUCKET/buty" --s3-no-check-bucket
  done
  # Хранение в бакете 30 дней.
  docker run --rm "${RCLONE_ENV[@]}" rclone/rclone:latest \
    delete "B:$BACKUP_S3_BUCKET/buty" --min-age "${S3_KEEP_DAYS}d" --s3-no-check-bucket || true
  echo "backup ok: копия отправлена в s3://$BACKUP_S3_BUCKET/buty"
else
  echo "backup: BACKUP_S3_* не заданы — только локальный бэкап"
fi
