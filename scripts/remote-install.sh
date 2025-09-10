#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-https://github.com/llibreprogram/punto_de_venta.git}"
BRANCH="${BRANCH:-main}"
APP_DIR="${APP_DIR:-/opt/punto_de_venta}"

echo "==> Descargando instalador desde $REPO (branch $BRANCH)"
tmp=$(mktemp -d)
git clone --depth=1 -b "$BRANCH" "$REPO" "$tmp/repo"
cd "$tmp/repo"
sudo bash scripts/quick-install.sh REPO_URL="$REPO" BRANCH="$BRANCH" APP_DIR="$APP_DIR" "${@:2}" || {
  echo "Fallo instalación" >&2; exit 1; }
echo "==> Limpieza"; rm -rf "$tmp"
echo "==> Completado"