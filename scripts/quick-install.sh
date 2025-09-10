#!/usr/bin/env bash
set -euo pipefail

# Permitir pasar argumentos KEY=VAL para sobreescribir variables sin export previo.
for arg in "$@"; do
  if [[ "$arg" == *=* ]]; then
    key="${arg%%=*}"; val="${arg#*=}"; export "$key"="$val"
  fi
done

REPO_URL="${REPO_URL:-}"       # Opcional: si se ejecuta fuera del repo
BRANCH="${BRANCH:-main}"
APP_DIR="${APP_DIR:-/opt/punto_de_venta}"
SERVICE_NAME="pos"
PORT="${PORT:-3000}"

echo "==> Instalador rápido POS (branch: $BRANCH, dir: $APP_DIR, puerto: $PORT)"

if [[ $EUID -ne 0 ]]; then
  echo "Ejecuta con sudo o como root" >&2
  exit 1
fi

command -v git >/dev/null 2>&1 || apt update && apt install -y git

if ! command -v node >/dev/null 2>&1; then
  echo "==> Instalando Node 20 LTS" 
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi

if ! command -v pnpm >/dev/null 2>&1; then
  npm install -g pnpm@9 >/dev/null 2>&1 || true
fi

mkdir -p "$APP_DIR"

if [[ -n "$REPO_URL" && ! -d "$APP_DIR/.git" ]]; then
  echo "==> Clonando repositorio"
  git clone --depth=1 -b "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"

if [[ -d .git ]]; then
  echo "==> Actualizando código (git pull)"
  git fetch --depth=1 origin "$BRANCH" || true
  git checkout "$BRANCH" 2>/dev/null || true
  git pull --ff-only origin "$BRANCH" || true
fi

echo "==> Instalando dependencias (npm ci)"
npm ci --no-audit --no-fund

if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    echo "==> Creando .env desde .env.example"
    cp .env.example .env
  else
    echo "==> .env.example no encontrado, creando .env mínimo"
    cat > .env <<EOF
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_LOCALE=es-DO
NEXT_PUBLIC_CURRENCY=DOP
NEXT_PUBLIC_TAX_PCT=0
EOF
  fi
fi

# Si el usuario pasó DATABASE_URL=... como argumento y no está reflejado en .env, lo añadimos preservando el archivo existente.
if [[ -n "${DATABASE_URL:-}" ]] && ! grep -q "DATABASE_URL" .env; then
  echo "DATABASE_URL=\"${DATABASE_URL}\"" >> .env
fi

echo "==> Generando Prisma client"
npm run prisma:generate

echo "==> Aplicando esquema (db push)"
NODE_ENV=production npx prisma db push

# Ejecutar seed si existe script
if grep -q '"db:seed"' package.json; then
  echo "==> Seed inicial (usuarios, ajustes)"
  NODE_ENV=production npm run db:seed || echo "(aviso) Seed falló, continúa instalación"
fi

echo "==> Build producción"
NODE_ENV=production npm run build

SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
echo "==> Creando servicio systemd: $SERVICE_FILE"
cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=POS Restaurante
After=network.target

[Service]
Type=simple
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=PORT=$PORT
ExecStart=$(command -v npx) next start -p $PORT
Restart=always
RestartSec=5
User=$(logname)
Group=$(id -gn $(logname))

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now ${SERVICE_NAME}.service

echo "==> Servicio iniciado. Estado:" 
systemctl --no-pager status ${SERVICE_NAME}.service || true

IP_LOCAL=$(hostname -I | awk '{print $1}') || IP_LOCAL=localhost
echo "==> Listo. Accede en: http://$IP_LOCAL:$PORT"
echo "   Usuario inicial: admin@local  (cambia la contraseña)."
echo "   Para logs: journalctl -u ${SERVICE_NAME} -f"
echo "   Reinstalar/actualizar: cd $APP_DIR && git pull && NODE_ENV=production npm run build && systemctl restart ${SERVICE_NAME}"

exit 0
