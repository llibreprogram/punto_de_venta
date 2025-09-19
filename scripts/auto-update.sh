#!/usr/bin/env bash
set -euo pipefail

# Weekly auto-update for POS app without sudo.
# - Pulls latest main, installs deps, builds, restarts Next.js on port 3001
# - Logs to /opt/punto_de_venta/logs/auto-update.log
# - Uses a flock-based lock to avoid overlapping runs

APP_DIR="/opt/punto_de_venta"
LOG_DIR="$APP_DIR/logs"
LOCK_FILE="$LOG_DIR/auto-update.lock"
LOG_FILE="$LOG_DIR/auto-update.log"

mkdir -p "$LOG_DIR"

exec 9>"$LOCK_FILE" || true
if ! flock -n 9; then
  echo "[$(date -Is)] Another auto-update is running. Exiting." | tee -a "$LOG_FILE"
  exit 0
fi

log() {
  echo "[$(date -Is)] $*" | tee -a "$LOG_FILE"
}

export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"

cd "$APP_DIR"
log "==> Starting auto-update in $APP_DIR"

# Ensure git trusts this worktree for this user (idempotent)
git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true

log "[1/5] Git fetch/reset to origin/main"
git fetch origin
git reset --hard origin/main

log "[2/5] npm ci (fallback npm install)"
if ! npm ci; then
  log "npm ci failed, attempting npm install"
  npm install
fi

log "[3/5] Building (production)"
if ! NODE_ENV=production npm run build; then
  log "ERROR: Build failed"
  "$APP_DIR/scripts/notify.sh" "POS auto-update: build failed" "$LOG_FILE" || true
  exit 1
fi

log "[4/5] Restarting Next server on :3001"
pkill -f "next start -p 3001" 2>/dev/null || true
nohup npm start -- -p 3001 >>/tmp/pos.log 2>&1 &
NEW_PID=$!
log "Started next-server pid=$NEW_PID"

log "[5/5] Verifying port 3001"
if ss -tlnp | grep -q ":3001"; then
  log "Port 3001 is listening."
else
  sleep 2
  if ss -tlnp | grep -q ":3001"; then
    log "Port 3001 is listening after short wait."
  else
    log "WARNING: Port 3001 not found listening. Check /tmp/pos.log"
  fi
fi

log "==> Auto-update finished"
