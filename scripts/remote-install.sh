#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-https://github.com/llibreprogram/punto_de_venta.git}"
BRANCH="${BRANCH:-main}"
APP_DIR="${APP_DIR:-/opt/punto_de_venta}"

echo "==> Verificando dependencias (git, curl)"
need_pkgs=()
command -v git >/dev/null 2>&1 || need_pkgs+=(git)
command -v curl >/dev/null 2>&1 || need_pkgs+=(curl)
if ((${#need_pkgs[@]})); then
  echo "==> Instalando paquetes: ${need_pkgs[*]} (requiere sudo)"
  sudo apt update -y
  sudo apt install -y "${need_pkgs[@]}"
fi

echo "==> Descargando instalador desde $REPO (branch $BRANCH)"
tmp=$(mktemp -d)
git clone --depth=1 -b "$BRANCH" "$REPO" "$tmp/repo"
cd "$tmp/repo"
echo "==> Ejecutando quick-install (se solicitará sudo si no eres root)"
if [[ $EUID -ne 0 ]]; then
  sudo bash scripts/quick-install.sh REPO_URL="$REPO" BRANCH="$BRANCH" APP_DIR="$APP_DIR" "${@:2}" || { echo "Fallo instalación" >&2; exit 1; }
else
  bash scripts/quick-install.sh REPO_URL="$REPO" BRANCH="$BRANCH" APP_DIR="$APP_DIR" "${@:2}" || { echo "Fallo instalación" >&2; exit 1; }
fi
echo "==> Limpieza"
rm -rf "$tmp"
echo "==> Completado"