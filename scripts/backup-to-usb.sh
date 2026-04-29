#!/usr/bin/env bash
set -euo pipefail

# Copy latest backups to a USB drive if present
# - Detects mount under /media/$USER/* or /mnt/usb unless USB_PATH is provided
# - Runs local backup first
# - Copies newest backup (or all missing backups) to USB folder punto_de_venta_backups
# - Checks free space and keeps last 30 on USB

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$PROJECT_DIR/backups"
mkdir -p "$BACKUP_DIR"

USER_NAME="$(id -un)"

USB_PATH_ENV="${USB_PATH:-}"
find_usb_mount() {
  if [[ -n "$USB_PATH_ENV" && -d "$USB_PATH_ENV" && -w "$USB_PATH_ENV" ]]; then
    echo "$USB_PATH_ENV"; return 0
  fi
  # Prefer /media/$USER/<label>
  for d in /media/"$USER_NAME"/*; do
    [[ -d "$d" && -w "$d" ]] && echo "$d" && return 0
  done
  # Fallback /mnt/usb
  if [[ -d /mnt/usb && -w /mnt/usb ]]; then echo /mnt/usb; return 0; fi
  return 1
}

USB_MOUNT="$(find_usb_mount || true)"
if [[ -z "$USB_MOUNT" ]]; then
  echo "[WARN] No se encontró un USB montado con permisos de escritura. Conecta un pendrive y monta (por ej. /media/$USER_NAME/<LABEL>)." >&2
  exit 2
fi

# Ensure destination folder on USB
USB_TARGET="$USB_MOUNT/punto_de_venta_backups"
mkdir -p "$USB_TARGET"

echo "[INFO] USB detectado: $USB_MOUNT"
echo "[INFO] Carpeta destino: $USB_TARGET"

# 1) Create a fresh backup locally
"$PROJECT_DIR/scripts/backup.sh"

# 2) Determine newest backup file locally
LATEST_LOCAL="$(ls -1t "$BACKUP_DIR"/backup_*.tar.gz 2>/dev/null | head -1 || true)"
if [[ -z "$LATEST_LOCAL" ]]; then
  echo "[ERROR] No hay backups locales para copiar." >&2
  exit 1
fi

# Option: copy only newest; if you want to sync all missing, set COPY_ALL=1
COPY_ALL="${COPY_ALL:-0}"

copy_file() {
  local src="$1"
  local dst_dir="$2"
  local fname
  fname="$(basename "$src")"
  local dst="$dst_dir/$fname"
  if [[ -f "$dst" ]]; then
    echo "[SKIP] Ya existe en USB: $fname"
    return 0
  fi
  # Space check
  local size_kb avail_kb
  size_kb="$(du -k "$src" | awk '{print $1}')"
  avail_kb="$(df -Pk "$dst_dir" | awk 'NR==2 {print $4}')"
  if [[ -n "$avail_kb" && -n "$size_kb" && "$avail_kb" -lt "$size_kb" ]]; then
    echo "[ERROR] Espacio insuficiente en USB para copiar $fname (necesita ${size_kb}K, disponible ${avail_kb}K)" >&2
    return 3
  fi
  cp -f "$src" "$dst"
  echo "[OK] Copiado a USB: $fname"
}

if [[ "$COPY_ALL" == "1" ]]; then
  echo "[INFO] Copiando todos los backups que no estén en USB..."
  for f in "$BACKUP_DIR"/backup_*.tar.gz; do
    [[ -e "$f" ]] || continue
    copy_file "$f" "$USB_TARGET" || true
  done
else
  echo "[INFO] Copiando el último backup: $(basename "$LATEST_LOCAL")"
  copy_file "$LATEST_LOCAL" "$USB_TARGET"
fi

# 3) Rotation on USB: keep last 30
echo "[INFO] Rotando backups en USB (mantener últimos 30)..."
ls -1t "$USB_TARGET"/backup_*.tar.gz 2>/dev/null | tail -n +31 | xargs -r rm -f

echo "[DONE] Copia a USB finalizada."
