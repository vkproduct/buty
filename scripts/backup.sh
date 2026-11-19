#!/usr/bin/env bash
# Ежедневный бэкап: дамп Postgres из контейнера db + архив /opt/buty/data
# (CSV каталога ЗЯ, кэш ИИ-типов product-types.jsonl). .env в бэкап НЕ включаем.
# Локальная ротация — 14 дней.
#
# Шифрование и облако:
# - BACKUP_AGE_RECIPIENT (публичный ключ age, строка age1…) — каждый файл шифруется
#   в контейнере age (образ с закреплённым digest), незашифрованная копия удаляется.
# - BACKUP_S3_* — загрузка ТОЛЬКО зашифрованных файлов в Yandex Object Storage через
#   rclone (образ с закреплённым digest). Только copy — удаление делает правило
#   жизненного цикла бакета; у ключа сервисного аккаунта storage.uploader нет прав
#   на удаление, это защита от шантажа/взлома сервера.
# - Если BACKUP_AGE_RECIPIENT НЕ задан, а BACKUP_S3_* заданы — в облако НИЧЕГО
#   не отправляется (незашифрованные бэкапы в облако не уходят), пишется предупреждение.
# - BACKUP_S3_REGION: у Yandex Object Storage подпись считается с регионом бакета
#   (по умолчанию ru-central1) — без этого rclone подписывает запросы как us-east-1
#   и бакет отвечает 403 SignatureDoesNotMatch.
# - BACKUP_HEARTBEAT_URL: если задан, в конце успешного прогона пингуется URL
#   (Better Stack heartbeat / healthchecks.io). Отсутствие пинга = тревога.
#
# Установка на сервере (cron от deploy):
#   17 3 * * * /opt/buty/scripts/backup.sh >> /opt/buty-backups/backup.log 2>&1
set -euo pipefail

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*"; }
fail() { log "backup FAIL: $*"; exit 1; }

BACKUP_DIR="${BACKUP_DIR:-/opt/buty-backups}"
APP_DIR="${APP_DIR:-/opt/buty}"
KEEP_DAYS=14
STAMP="$(date +%Y%m%d-%H%M%S)"

# Образы с закреплёнными digest (обновлять только сознательно, после проверки).
ALPINE_IMAGE="alpine:3.20@sha256:d9e853e87e55526f6b2917df91a2115c36dd7c696a35be12163d44e6e2a4b6bc"
RCLONE_IMAGE="rclone/rclone:1.68.2@sha256:74c51b8817e5431bd6d7ed27cb2a50d8ee78d77f6807b72a41ef6f898845942b"

mkdir -p "$BACKUP_DIR"
cd "$APP_DIR"

# .env — источник BACKUP_* переменных.
set -a; [ -f "$APP_DIR/.env" ] && . "$APP_DIR/.env"; set +a

# --- 1. Дамп Postgres (pipefail: падение pg_dump = падение пайплайна) ---
DUMP_GZ="$BACKUP_DIR/buty-$STAMP.sql.gz"
docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U buty -d buty --clean --if-exists | gzip > "$DUMP_GZ" \
  || fail "pg_dump завершился с ошибкой"
DUMP_SIZE="$(stat -c%s "$DUMP_GZ")"
[ "$DUMP_SIZE" -gt 1048576 ] || fail "дамп подозрительно мал: $DUMP_SIZE байт"
gzip -t "$DUMP_GZ" || fail "gzip -t не прошёл для дампа"
log "backup ok: buty-$STAMP.sql.gz ($DUMP_SIZE байт)"

# --- 2. Архив данных (data/ примонтирована в app как /app/data; .env сюда не входит) ---
DATA_GZ=""
if [ -d "$APP_DIR/data" ]; then
  DATA_GZ="$BACKUP_DIR/data-$STAMP.tar.gz"
  tar -czf "$DATA_GZ" -C "$APP_DIR" data || fail "tar data/ завершился с ошибкой"
  gzip -t "$DATA_GZ" || fail "gzip -t не прошёл для архива данных"
  log "backup ok: data-$STAMP.tar.gz ($(stat -c%s "$DATA_GZ") байт)"
else
  log "backup warn: $APP_DIR/data не найдена — пропускаю архив данных"
fi

# --- 3. Шифрование age ---
PLAIN_FILES=("$DUMP_GZ")
[ -n "$DATA_GZ" ] && PLAIN_FILES+=("$DATA_GZ")

ENCRYPTED=()
if [ -n "${BACKUP_AGE_RECIPIENT:-}" ]; then
  for f in "${PLAIN_FILES[@]}"; do
    base="$(basename "$f")"
    docker run --rm \
      -e "AGE_RECIPIENT=$BACKUP_AGE_RECIPIENT" \
      -v "$BACKUP_DIR:/backup" \
      "$ALPINE_IMAGE" \
      sh -c "apk add --no-cache age >/dev/null 2>&1 && age -r \"\$AGE_RECIPIENT\" -o \"/backup/$base.age\" \"/backup/$base\"" \
      || fail "age-шифрование $base завершилось с ошибкой"
    [ -s "$f.age" ] || fail "не создан зашифрованный файл $base.age"
    rm -f "$f"
    ENCRYPTED+=("$f.age")
    log "backup ok: $base.age (зашифрован)"
  done
else
  log "backup warn: BACKUP_AGE_RECIPIENT не задан — бэкапы НЕ зашифрованы"
fi

# --- 4. Локальная ротация (14 дней; маски покрывают и .age) ---
find "$BACKUP_DIR" \( -name 'buty-*.sql.gz' -o -name 'data-*.tar.gz' \
  -o -name 'buty-*.sql.gz.age' -o -name 'data-*.tar.gz.age' \) -mtime +"$KEEP_DAYS" -delete

# --- 5. Копия в объектное хранилище: только зашифрованные файлы ---
S3_CONFIGURED=0
if [ -n "${BACKUP_S3_ENDPOINT:-}" ] && [ -n "${BACKUP_S3_BUCKET:-}" ] \
  && [ -n "${BACKUP_S3_KEY:-}" ] && [ -n "${BACKUP_S3_SECRET:-}" ]; then
  S3_CONFIGURED=1
fi

if [ "$S3_CONFIGURED" -eq 1 ] && [ "${#ENCRYPTED[@]}" -eq 0 ]; then
  log "backup warn: BACKUP_S3_* заданы, но шифрование выключено — в облако НЕ отправляю (незашифрованные бэкапы в облако не уходят)"
fi

if [ "${#ENCRYPTED[@]}" -gt 0 ]; then
  if [ "$S3_CONFIGURED" -eq 0 ]; then
    log "backup: BACKUP_S3_* не заданы — зашифрованные бэкапы только локально"
  else
    RCLONE_ENV=(
      -e "RCLONE_CONFIG_B_TYPE=s3"
      -e "RCLONE_CONFIG_B_PROVIDER=Other"
      -e "RCLONE_CONFIG_B_ACCESS_KEY_ID=$BACKUP_S3_KEY"
      -e "RCLONE_CONFIG_B_SECRET_ACCESS_KEY=$BACKUP_S3_SECRET"
      -e "RCLONE_CONFIG_B_ENDPOINT=$BACKUP_S3_ENDPOINT"
      -e "RCLONE_CONFIG_B_REGION=${BACKUP_S3_REGION:-ru-central1}"
      -e "RCLONE_CONFIG_B_ACL=private"
    )
    for f in "${ENCRYPTED[@]}"; do
      docker run --rm "${RCLONE_ENV[@]}" -v "$BACKUP_DIR:/backup:ro" "$RCLONE_IMAGE" \
        copy "/backup/$(basename "$f")" "B:$BACKUP_S3_BUCKET/buty" --s3-no-check-bucket \
        || fail "rclone copy $(basename "$f") завершился с ошибкой"
    done
    # Проверка: оба файла реально в бакете.
    LISTING="$(docker run --rm "${RCLONE_ENV[@]}" "$RCLONE_IMAGE" \
      lsf "B:$BACKUP_S3_BUCKET/buty" --include "*$STAMP*" --s3-no-check-bucket 2>/dev/null)" \
      || fail "rclone lsf не удался — не могу подтвердить загрузку"
    FOUND="$(grep -c "$STAMP" <<< "$LISTING" || true)"
    [ "$FOUND" -eq "${#ENCRYPTED[@]}" ] \
      || fail "в бакете найдено $FOUND из ${#ENCRYPTED[@]} файлов за $STAMP"
    log "backup ok: копия отправлена в s3://$BACKUP_S3_BUCKET/buty (${#ENCRYPTED[@]} файла, проверено lsf)"
  fi
fi

# --- 6. Heartbeat: только при полном успехе ---
if [ -n "${BACKUP_HEARTBEAT_URL:-}" ]; then
  curl -fsS -m 10 "$BACKUP_HEARTBEAT_URL" >/dev/null || true
fi

log "backup done: $STAMP"
