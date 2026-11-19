#!/usr/bin/env bash
# Проверка восстановления из бэкапа (scripts/backup.sh).
#
# Что делает: берёт свежий дамп, поднимает ВРЕМЕННЫЙ контейнер postgres
# (buty-restore-test, без портов наружу и без volume), заливает дамп,
# считает строки ключевых таблиц и удаляет контейнер. Прод-базу не трогает никак.
#
# Запуск:
#   scripts/restore-test.sh                  # свежий локальный бэкап из /opt/buty-backups
#   scripts/restore-test.sh file.sql.gz      # конкретный файл
#   scripts/restore-test.sh file.sql.gz.age  # расшифрует ключом ~/.buty-keys/buty-backup.age.key (Mac владельца)
#   scripts/restore-test.sh --from-s3        # скачать последний из бакета (нужен ключ с правом ЧТЕНИЯ;
#                                            # у storage.uploader его нет — тогда скачивайте с Mac,
#                                            # см. README «Ежемесячная проверка восстановления»)
set -euo pipefail

fail() { echo "RESTORE TEST FAIL: $*" >&2; exit 1; }

APP_DIR="${APP_DIR:-/opt/buty}"
BACKUP_DIR="${BACKUP_DIR:-/opt/buty-backups}"
AGE_KEY="$HOME/.buty-keys/buty-backup.age.key"
CONTAINER="buty-restore-test"
IMAGE="postgres:16-alpine"
RCLONE_IMAGE="rclone/rclone:1.68.2@sha256:74c51b8817e5431bd6d7ed27cb2a50d8ee78d77f6807b72a41ef6f898845942b"

PRODUCT_MIN=42223
INCIDB_MIN=17000
INGREDIENT_MIN=5531

FROM_S3=0
INPUT=""
for arg in "$@"; do
  case "$arg" in
    --from-s3) FROM_S3=1 ;;
    *) INPUT="$arg" ;;
  esac
done

cleanup() { docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup

# --- Источник дампа ---
TMP_DMG=""
if [ "$FROM_S3" -eq 1 ]; then
  [ -n "$INPUT" ] && fail "не сочетайте --from-s3 с указанием файла"
  set -a; [ -f "$APP_DIR/.env" ] && . "$APP_DIR/.env"; set +a
  [ -n "${BACKUP_S3_BUCKET:-}" ] || fail "BACKUP_S3_BUCKET не задан в $APP_DIR/.env"
  [ -n "${BACKUP_S3_ENDPOINT:-}" ] || fail "BACKUP_S3_ENDPOINT не задан в $APP_DIR/.env"
  [ -n "${BACKUP_S3_KEY:-}" ] || fail "BACKUP_S3_KEY не задан в $APP_DIR/.env"
  [ -n "${BACKUP_S3_SECRET:-}" ] || fail "BACKUP_S3_SECRET не задан в $APP_DIR/.env"
  RCLONE_ENV=(
    -e "RCLONE_CONFIG_B_TYPE=s3"
    -e "RCLONE_CONFIG_B_PROVIDER=Other"
    -e "RCLONE_CONFIG_B_ACCESS_KEY_ID=$BACKUP_S3_KEY"
    -e "RCLONE_CONFIG_B_SECRET_ACCESS_KEY=$BACKUP_S3_SECRET"
    -e "RCLONE_CONFIG_B_ENDPOINT=$BACKUP_S3_ENDPOINT"
    -e "RCLONE_CONFIG_B_REGION=${BACKUP_S3_REGION:-ru-central1}"
  )
  LATEST="$(docker run --rm "${RCLONE_ENV[@]}" "$RCLONE_IMAGE" \
    lsf "B:$BACKUP_S3_BUCKET/buty" --include 'buty-*.sql.gz.age' 2>/dev/null | sort | tail -n 1)" \
    || fail "не удалось прочитать бакет: у ключа storage.uploader нет прав на чтение — скачайте дамп с Mac (консоль Yandex) и запустите: $0 file.sql.gz.age"
  [ -n "$LATEST" ] || fail "в бакете нет buty-*.sql.gz.age"
  TMP_DMG="$(mktemp -d)"
  docker run --rm "${RCLONE_ENV[@]}" -v "$TMP_DMG:/dl" "$RCLONE_IMAGE" \
    copyto "B:$BACKUP_S3_BUCKET/buty/$LATEST" "/dl/$LATEST" --s3-no-check-bucket \
    || fail "скачивание $LATEST не удалось"
  INPUT="$TMP_DMG/$LATEST"
  echo "restore test: скачан $LATEST из бакета"
elif [ -z "$INPUT" ]; then
  INPUT="$(ls -1t "$BACKUP_DIR"/buty-*.sql.gz.age 2>/dev/null | head -n 1 || true)"
  [ -n "$INPUT" ] || INPUT="$(ls -1t "$BACKUP_DIR"/buty-*.sql.gz 2>/dev/null | head -n 1 || true)"
  [ -n "$INPUT" ] || fail "не найдено ни одного бэкапа в $BACKUP_DIR"
  echo "restore test: взят локальный бэкап $(basename "$INPUT")"
fi
[ -f "$INPUT" ] || fail "файл не найден: $INPUT"

# --- Расшифровка (.age) ---
TMP_DEC=""
case "$INPUT" in
  *.age)
    command -v age >/dev/null || fail "нужен бинарник age (brew install age) — или расшифруйте вручную: age -d -i $AGE_KEY файл.age"
    [ -f "$AGE_KEY" ] || fail "не найден приватный ключ $AGE_KEY — расшифровка только у владельца (Mac)"
    TMP_DEC="$(mktemp --suffix=.sql.gz)"
    age -d -i "$AGE_KEY" -o "$TMP_DEC" "$INPUT" || fail "расшифровка не удалась"
    INPUT="$TMP_DEC"
    echo "restore test: расшифровано"
    ;;
  *.sql.gz) ;;
  *) fail "ожидаю *.sql.gz или *.sql.gz.age, получено: $INPUT" ;;
esac

# --- Временная база и заливка ---
docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD=restoretest \
  -e POSTGRES_DB=restoretest "$IMAGE" >/dev/null || fail "не удалось создать контейнер $CONTAINER"

# pg_isready недостаточно: во время инициализации контейнера крутится временный
# сервер initdb, и запрос может попасть на него в момент остановки. Ждём реальный запрос.
READY=0
for _ in $(seq 1 90); do
  if docker exec "$CONTAINER" psql -U postgres -d restoretest -tAc "SELECT 1" >/dev/null 2>&1; then READY=1; break; fi
  sleep 1
done
[ "$READY" -eq 1 ] || fail "временная Postgres не поднялась за 90 с"

# В дампе встречаются OWNER TO/SET ROLE buty — роль нужна в временной базе.
docker exec "$CONTAINER" psql -U postgres -d restoretest -qc 'CREATE ROLE buty NOLOGIN;' \
  || fail "не удалось создать роль buty"

zcat "$INPUT" | docker exec -i "$CONTAINER" psql -U postgres -d restoretest \
  -v ON_ERROR_STOP=1 -q || fail "заливка дампа завершилась с ошибкой"
echo "restore test: дамп залит во временную базу"

# --- Подсчёты ---
count() { docker exec "$CONTAINER" psql -U postgres -d restoretest -tA -c "$1"; }

PRODUCTS="$(count 'SELECT count(*) FROM "Product";')"
INCIDB="$(count "SELECT count(*) FROM \"Product\" WHERE source='incidb';")"
INGREDIENTS="$(count 'SELECT count(*) FROM "Ingredient";')"
USERS="$(count 'SELECT count(*) FROM "User";')"

ok_row() { [ "$1" -ge "$2" ] && echo "да" || echo "НЕТ"; }

echo ""
echo "Таблица               | Значение  | Минимум   | ОК?"
echo "----------------------+-----------+-----------+----"
printf '%-22s| %9s | %9s | %s\n' "Product"        "$PRODUCTS"   "$PRODUCT_MIN"    "$(ok_row "$PRODUCTS" "$PRODUCT_MIN")"
printf '%-22s| %9s | %9s | %s\n' "Product (incidb)" "$INCIDB"     "$INCIDB_MIN"     "$(ok_row "$INCIDB" "$INCIDB_MIN")"
printf '%-22s| %9s | %9s | %s\n' "Ingredient"     "$INGREDIENTS" "$INGREDIENT_MIN" "$(ok_row "$INGREDIENTS" "$INGREDIENT_MIN")"
printf '%-22s| %9s | %9s | %s\n' "User"           "$USERS"      "—"               "инфо"
echo ""

if [ "$PRODUCTS" -ge "$PRODUCT_MIN" ] && [ "$INCIDB" -ge "$INCIDB_MIN" ] && [ "$INGREDIENTS" -ge "$INGREDIENT_MIN" ]; then
  echo "RESTORE TEST OK"
else
  echo "RESTORE TEST FAIL: значения ниже порогов" >&2
  exit 1
fi
