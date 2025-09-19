#!/usr/bin/env bash
# Start tailscaled in userspace (rootless) and bring the node up if TS_ARGS provided.
set -euo pipefail

BIN_DIR="$HOME/.local/bin"
STATE_DIR="$HOME/.local/share/tailscale"
RUN_DIR="$HOME/.local/run"
LOG_DIR="$HOME/.local/state"
mkdir -p "$STATE_DIR" "$RUN_DIR" "$LOG_DIR"

SOCK="$RUN_DIR/tailscaled.socket"
PIDFILE="$RUN_DIR/tailscaled.pid"
LOGFILE="$LOG_DIR/tailscaled.log"

if [[ ! -x "$BIN_DIR/tailscaled" ]]; then
  echo "tailscaled not found in $BIN_DIR. Run scripts/tailscale/install.sh first." >&2
  exit 1
fi

if [[ -n ${TAILSCALE_AUTHKEY:-} ]]; then
  export TS_AUTHKEY="$TAILSCALE_AUTHKEY"
fi

if [[ -S "$SOCK" ]]; then
  echo "tailscaled socket exists at $SOCK"
else
  echo "Starting tailscaled (userspace)..."
  nohup "$BIN_DIR/tailscaled" \
    --state="$STATE_DIR/tailscaled.state" \
    --socket="$SOCK" \
    --port=41641 \
    --tun=userspace-networking \
    >>"$LOGFILE" 2>&1 &
  echo $! > "$PIDFILE"
  sleep 1
fi

export PATH="$BIN_DIR:$PATH"

echo "tailscaled status:"
"$BIN_DIR/tailscale" --socket="$SOCK" status || true

if [[ "${1:-}" == "up" ]]; then
  shift || true
  echo "Bringing Tailscale up..."
  "$BIN_DIR/tailscale" --socket="$SOCK" up "${@:-}"
  "$BIN_DIR/tailscale" --socket="$SOCK" ip -4
fi
