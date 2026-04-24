#!/usr/bin/env bash
# Install Tailscale (userspace, rootless) into ~/.local/bin
# Safe to re-run; downloads latest stable static build.
set -euo pipefail

ARCH=$(uname -m)
case "$ARCH" in
  x86_64|amd64) TS_ARCH=amd64 ;;
  aarch64|arm64) TS_ARCH=arm64 ;;
  *) echo "Unsupported architecture: $ARCH" >&2; exit 1 ;;
esac

BIN_DIR="$HOME/.local/bin"
STATE_DIR="$HOME/.local/share/tailscale"
CACHE_DIR="$HOME/.cache/tailscale"
mkdir -p "$BIN_DIR" "$STATE_DIR" "$CACHE_DIR"

TMPDIR=$(mktemp -d)
cleanup() { rm -rf "$TMPDIR" || true; }
trap cleanup EXIT

INDEX_URL="https://pkgs.tailscale.com/stable/"
echo "Fetching latest Tailscale static build index..."
HTML=$(curl -fsSL "$INDEX_URL")
TARBALL=$(printf "%s" "$HTML" | grep -oE "tailscale_[0-9.]+_${TS_ARCH}\.tgz" | head -n1)

if [[ -z "${TARBALL:-}" ]]; then
  echo "Could not determine latest Tailscale static tarball for arch ${TS_ARCH}." >&2
  echo "Please check ${INDEX_URL} and download manually." >&2
  exit 1
fi

echo "Downloading $TARBALL ..."
curl -fsSL -o "$TMPDIR/$TARBALL" "${INDEX_URL}${TARBALL}"

echo "Extracting binaries..."
tar -xzf "$TMPDIR/$TARBALL" -C "$TMPDIR"

# The tarball contains ./tailscale_*/tailscale and tailscaled
SRC_DIR=$(find "$TMPDIR" -maxdepth 1 -type d -name "tailscale_*_${TS_ARCH}" | head -n1)
if [[ -z "${SRC_DIR:-}" ]]; then
  # fallback: any tailscale_* directory
  SRC_DIR=$(find "$TMPDIR" -maxdepth 1 -type d -name "tailscale_*" | head -n1)
fi

install -m 0755 "$SRC_DIR/tailscale" "$BIN_DIR/tailscale"
install -m 0755 "$SRC_DIR/tailscaled" "$BIN_DIR/tailscaled"

echo "Installed tailscale and tailscaled to $BIN_DIR"
echo "Ensure $BIN_DIR is in your PATH. Current PATH: $PATH"
echo "Next: run scripts/tailscale/start.sh to start in userspace and authenticate."
