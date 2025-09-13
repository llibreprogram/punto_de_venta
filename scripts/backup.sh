#!/usr/bin/env bash
set -euo pipefail

# Backup script for punto_de_venta
# - Detects DB type from $DATABASE_URL (SQLite or PostgreSQL)
# - Produces a tar.gz in ./backups with DB dump/copy and metadata
# - Keeps last 10 backups (rotation)

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$PROJECT_DIR/backups"
mkdir -p "$BACKUP_DIR"

# Load env vars from .env if present
if [[ -f "$PROJECT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1090
  . "$PROJECT_DIR/.env"
  set +a
fi

DATE="$(date +%Y%m%d_%H%M%S)"
TMP_DIR="$(mktemp -d)"
META_FILE="$TMP_DIR/meta.txt"

# Gather metadata
{
  echo "timestamp=$DATE"
  echo "host=$(hostname)"
  echo "project_dir=$PROJECT_DIR"
  echo "node=$(command -v node >/dev/null 2>&1 && node -v || echo 'unknown')"
  echo "commit=$(git -C "$PROJECT_DIR" rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
} > "$META_FILE"

DB_URL="${DATABASE_URL:-}"
if [[ -z "$DB_URL" ]]; then
  echo "[WARN] DATABASE_URL no está definido en .env. Solo se guardará metadata." >&2
fi

add_to_tmp() {
  local src="$1" dest_name="$2"
  mkdir -p "$TMP_DIR"
  cp -f "$src" "$TMP_DIR/$dest_name"
}

if [[ "$DB_URL" =~ ^postgres(|ql):// ]]; then
  echo "[INFO] Detectado PostgreSQL. Creando dump con pg_dump..."
  if ! command -v pg_dump >/dev/null 2>&1; then
    echo "[ERROR] pg_dump no está instalado. Instálalo (apt install postgresql-client) o usa un host con cliente de PostgreSQL." >&2
    rm -rf "$TMP_DIR"
    exit 1
  fi
  DUMP_PATH="$TMP_DIR/db.dump"
  # Custom format for pg_restore
  PGAPPNAME="pos-backup" pg_dump --dbname="$DB_URL" -Fc -f "$DUMP_PATH"
  echo "db_type=postgres" >> "$META_FILE"
else
  # Assume SQLite if starts with file:
  if [[ "$DB_URL" =~ ^file: ]]; then
    echo "[INFO] Detectado SQLite. Copiando archivo..."
    DB_PATH="${DB_URL#file:}"
  else
    # Fallback: try to guess common sqlite file
    DB_PATH="./dev.db"
  fi
  # Normalize relative path
  CANDIDATES=(
    "$PROJECT_DIR/${DB_PATH#./}"
    "$PROJECT_DIR/$DB_PATH"
    "$PROJECT_DIR/prisma/${DB_PATH#./}"
  )
  DB_FILE=""
  for f in "${CANDIDATES[@]}"; do
    if [[ -f "$f" ]]; then DB_FILE="$f"; break; fi
  done
  if [[ -z "$DB_FILE" ]]; then
    # last resort: search by basename
    base="$(basename "$DB_PATH")"
    DB_FILE="$(find "$PROJECT_DIR" -maxdepth 2 -name "$base" -type f 2>/dev/null | head -n1 || true)"
  fi
  if [[ -z "$DB_FILE" ]]; then
    echo "[WARN] No se encontró archivo SQLite. Solo se guardará metadata." >&2
    echo "db_type=unknown" >> "$META_FILE"
  else
    echo "db_type=sqlite" >> "$META_FILE"
    add_to_tmp "$DB_FILE" db.sqlite
  fi
fi

# Include useful config files
[[ -f "$PROJECT_DIR/.env" ]] && add_to_tmp "$PROJECT_DIR/.env" .env
[[ -f "$PROJECT_DIR/prisma/schema.prisma" ]] && add_to_tmp "$PROJECT_DIR/prisma/schema.prisma" schema.prisma

TAR_PATH="$BACKUP_DIR/backup_${DATE}.tar.gz"
tar -czf "$TAR_PATH" -C "$TMP_DIR" .
echo "[OK] Backup creado: $TAR_PATH"

# Rotation: keep last 10
echo "[INFO] Rotando backups (mantener últimos 10)..."
ls -1t "$BACKUP_DIR"/backup_*.tar.gz 2>/dev/null | tail -n +11 | xargs -r rm -f

rm -rf "$TMP_DIR"
echo "[DONE]"
