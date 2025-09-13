#!/usr/bin/env bash
set -euo pipefail

# Restore script for punto_de_venta
# Usage: scripts/restore.sh <backup_tar.gz>
# - Detects db_type from meta.txt inside the backup
# - For sqlite: stops service, replaces db file safely, then restarts
# - For postgres: runs pg_restore (requires access/permissions)

if [[ $# -lt 1 ]]; then
  echo "Uso: $0 <ruta/backup_YYYYmmdd_HHMMSS.tar.gz>" >&2
  exit 1
fi

BACKUP_TAR="$1"
if [[ ! -f "$BACKUP_TAR" ]]; then
  echo "[ERROR] No existe archivo: $BACKUP_TAR" >&2
  exit 1
fi

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
tar -xzf "$BACKUP_TAR" -C "$TMP_DIR"

META="$TMP_DIR/meta.txt"
if [[ ! -f "$META" ]]; then
  echo "[ERROR] Backup inválido: falta meta.txt" >&2
  rm -rf "$TMP_DIR"; exit 1
fi

DB_TYPE="$(grep -E '^db_type=' "$META" | cut -d= -f2 || echo 'unknown')"
echo "[INFO] db_type=$DB_TYPE"

read -rp "Esta acción puede sobreescribir datos. ¿Deseas continuar? (escribe SI): " CONF
if [[ "$CONF" != "SI" ]]; then
  echo "Abortado."; rm -rf "$TMP_DIR"; exit 0
fi

# Stop service if present
echo "[INFO] Deteniendo servicio si existe..."
sudo systemctl stop pos 2>/dev/null || sudo systemctl stop punto-de-venta 2>/dev/null || true

if [[ "$DB_TYPE" == "sqlite" ]]; then
  # Try to locate current sqlite path from DATABASE_URL or common paths
  read_env_var() {
    local key="$1" file="$PROJECT_DIR/.env" line value
    [[ -f "$file" ]] || { echo ""; return; }
    line="$(grep -E "^[[:space:]]*${key}=" "$file" | tail -n1 || true)"
    [[ -n "$line" ]] || { echo ""; return; }
    value="${line#*=}"
    value="${value%\'}"; value="${value#\'}"; value="${value%\"}"; value="${value#\"}"
    echo "$value"
  }
  DB_URL="$(read_env_var DATABASE_URL)"
  if [[ "$DB_URL" =~ ^file: ]]; then
    DB_PATH="${DB_URL#file:}"
  else
    DB_PATH="./dev.db"
  fi
  CANDIDATES=(
    "$PROJECT_DIR/${DB_PATH#./}"
    "$PROJECT_DIR/$DB_PATH"
    "$PROJECT_DIR/prisma/${DB_PATH#./}"
    "$PROJECT_DIR/dev.db"
    "$PROJECT_DIR/prisma/dev.db"
  )
  TARGET_DB=""
  for f in "${CANDIDATES[@]}"; do
    if [[ -e "$f" || -e "$(dirname "$f")" ]]; then TARGET_DB="$f"; break; fi
  done
  if [[ -z "$TARGET_DB" ]]; then
    echo "[ERROR] No se pudo determinar ruta para la base de datos SQLite." >&2
    rm -rf "$TMP_DIR"; exit 1
  fi
  mkdir -p "$(dirname "$TARGET_DB")"
  if [[ ! -f "$TMP_DIR/db.sqlite" ]]; then
    echo "[ERROR] El backup no contiene db.sqlite" >&2
    rm -rf "$TMP_DIR"; exit 1
  fi
  echo "[INFO] Restaurando SQLite en $TARGET_DB"
  cp -f "$TARGET_DB" "$TARGET_DB.bak_$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
  cp -f "$TMP_DIR/db.sqlite" "$TARGET_DB"
elif [[ "$DB_TYPE" == "postgres" ]]; then
  if ! command -v pg_restore >/dev/null 2>&1; then
    echo "[ERROR] pg_restore no está instalado (apt install postgresql-client)." >&2
    rm -rf "$TMP_DIR"; exit 1
  fi
  read_env_var() {
    local key="$1" file="$PROJECT_DIR/.env" line value
    [[ -f "$file" ]] || { echo ""; return; }
    line="$(grep -E "^[[:space:]]*${key}=" "$file" | tail -n1 || true)"
    [[ -n "$line" ]] || { echo ""; return; }
    value="${line#*=}"
    value="${value%\'}"; value="${value#\'}"; value="${value%\"}"; value="${value#\"}"
    echo "$value"
  }
  DB_URL="$(read_env_var DATABASE_URL)"
  if [[ -z "$DB_URL" ]]; then
    echo "[ERROR] DATABASE_URL no definida para restaurar PostgreSQL" >&2
    rm -rf "$TMP_DIR"; exit 1
  fi
  if [[ ! -f "$TMP_DIR/db.dump" ]]; then
    echo "[ERROR] El backup no contiene db.dump" >&2
    rm -rf "$TMP_DIR"; exit 1
  fi
  echo "[INFO] Restaurando PostgreSQL (pg_restore)..."
  # WARNING: This assumes the DB exists and user has privileges.
  # Consider drop schema/create schema if needed.
  PGAPPNAME="pos-restore" pg_restore --clean --if-exists --no-owner --no-privileges \
    --dbname="$DB_URL" "$TMP_DIR/db.dump"
else
  echo "[WARN] db_type desconocido. Solo se restauraron archivos auxiliares si existían."
fi

# Restart service if present
echo "[INFO] Iniciando servicio si existe..."
sudo systemctl start pos 2>/dev/null || sudo systemctl start punto-de-venta 2>/dev/null || \
  (cd "$PROJECT_DIR" && nohup npm start -- -p 3001 >/tmp/pos.log 2>&1 &)

rm -rf "$TMP_DIR"
echo "[DONE] Restauración completada."
