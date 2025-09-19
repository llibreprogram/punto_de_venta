#!/usr/bin/env bash
# Convenience wrapper: start userspace tailscaled and run `tailscale up`.
# Usage:
#   scripts/tailscale/up.sh                 # prompts for login URL
#   TS_AUTHKEY=tskey-... scripts/tailscale/up.sh --hostname=pos-restaurant
set -euo pipefail

"$(dirname "$0")/start.sh"

BIN_DIR="$HOME/.local/bin"
RUN_DIR="$HOME/.local/run"
SOCK="$RUN_DIR/tailscaled.socket"

ARGS=("--accept-dns=false" "--ssh=true")

# Allow additional args from CLI
if [[ $# -gt 0 ]]; then
  ARGS+=("$@")
fi

echo "tailscale up ${ARGS[*]}"
"$BIN_DIR/tailscale" --socket="$SOCK" up "${ARGS[@]}"

echo "Current node IPs:"
"$BIN_DIR/tailscale" --socket="$SOCK" ip
