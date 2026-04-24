#!/usr/bin/env bash
set -euo pipefail
RUN_DIR="$HOME/.local/run"
SOCK="$RUN_DIR/tailscaled.socket"
PIDFILE="$RUN_DIR/tailscaled.pid"

if [[ -S "$SOCK" ]]; then
  echo "Stopping tailscaled at $SOCK"
  rm -f "$SOCK"
fi

if [[ -f "$PIDFILE" ]]; then
  PID=$(cat "$PIDFILE" || true)
  if [[ -n "${PID:-}" ]] && kill -0 "$PID" 2>/dev/null; then
    kill "$PID" || true
  fi
  rm -f "$PIDFILE"
fi

echo "Stopped tailscaled (if it was running)."
