#!/usr/bin/env bash

# Idempotent installer for daily backup cron jobs
# - 03:00 -> scripts/backup.sh (logs to backup.log)
# - 03:10 -> scripts/backup-to-usb.sh (logs to backup-usb.log)
# Safe to run multiple times. Adds PATH for cron environment.

set -Eeuo pipefail

APP_DIR="/opt/punto_de_venta"
SCRIPTS_DIR="$APP_DIR/scripts"
BACKUPS_DIR="$APP_DIR/backups"

echo "[INFO] Preparing directories and permissions..."
mkdir -p "$BACKUPS_DIR"
chmod +x "$SCRIPTS_DIR/backup.sh" 2>/dev/null || true
chmod +x "$SCRIPTS_DIR/backup-to-usb.sh" 2>/dev/null || true

CRON_PATH_LINE="PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
CRON_BACKUP_LINE="0 3 * * * cd $APP_DIR && /usr/bin/env bash ./scripts/backup.sh >> $APP_DIR/backup.log 2>&1"
CRON_USB_LINE="10 3 * * * cd $APP_DIR && /usr/bin/env bash ./scripts/backup-to-usb.sh >> $APP_DIR/backup-usb.log 2>&1"

echo "[INFO] Configuring crontab entries..."
TMP_CRON="$(mktemp)"
crontab -l 2>/dev/null > "$TMP_CRON" || true

# Ensure PATH line exists (at top once)
if ! grep -qE "^PATH=.*\b(/usr/bin|/bin)\b" "$TMP_CRON"; then
  printf "%s\n" "$CRON_PATH_LINE" | cat - "$TMP_CRON" > "$TMP_CRON.new" && mv "$TMP_CRON.new" "$TMP_CRON"
fi

# Add backup job if missing
grep -Fq "$SCRIPTS_DIR/backup.sh" "$TMP_CRON" || printf "%s\n" "$CRON_BACKUP_LINE" >> "$TMP_CRON"

# Add USB copy job if missing
grep -Fq "$SCRIPTS_DIR/backup-to-usb.sh" "$TMP_CRON" || printf "%s\n" "$CRON_USB_LINE" >> "$TMP_CRON"

crontab "$TMP_CRON"
rm -f "$TMP_CRON"

echo "[OK] Cron installed. Current crontab:"
echo "--------------------------------------"
crontab -l
echo "--------------------------------------"
echo "[HINT] Logs: $APP_DIR/backup.log and $APP_DIR/backup-usb.log"
