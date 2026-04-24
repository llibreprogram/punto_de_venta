#!/usr/bin/env bash
# =============================================================
# ACTUALIZADOR SIMPLIFICADO - Para ejecutar en la máquina local
# Uso: doble clic o "bash actualizar.sh" en la terminal
# =============================================================

# Detectar si hay terminal disponible para mostrar output
if [ -z "$TERM" ] && command -v x-terminal-emulator &>/dev/null; then
  exec x-terminal-emulator -e "bash '$0'"
  exit
fi

echo ""
echo "============================================"
echo "   ACTUALIZACIÓN PUNTO DE VENTA"
echo "============================================"
echo ""

# Pedir contraseña de sudo una sola vez
if ! sudo -n true 2>/dev/null; then
  echo "Se necesita la contraseña de administrador para actualizar:"
  sudo -v || { echo "Error: no se pudo obtener permisos de administrador."; read -rp "Presiona Enter para salir..."; exit 1; }
fi

echo "[1/5] Descargando nueva versión del código..."
cd /opt/punto_de_venta || { echo "Error: no se encontró la aplicación en /opt/punto_de_venta"; read -rp "Presiona Enter para salir..."; exit 1; }
sudo git config --global --add safe.directory /opt/punto_de_venta 2>/dev/null || true
sudo git fetch origin main
sudo git reset --hard origin/main

echo ""
echo "[2/5] Instalando dependencias..."
sudo -u restaurante npm ci --silent 2>/dev/null || sudo npm ci --silent

echo ""
echo "[3/5] Actualizando base de datos..."
sudo -u restaurante npx prisma db push --skip-generate 2>/dev/null || sudo npx prisma db push --skip-generate

echo ""
echo "[4/5] Reconstruyendo la aplicación (esto puede tardar unos minutos)..."
NODE_ENV=production sudo -u restaurante npm run build 2>/dev/null || NODE_ENV=production sudo npm run build

echo ""
echo "[5/5] Reiniciando el servicio..."
sudo systemctl restart pos

echo ""
echo "============================================"
echo "   ¡ACTUALIZACIÓN COMPLETADA!"
echo "============================================"
echo ""

# Verificar que el servicio quedó corriendo
if sudo systemctl is-active --quiet pos; then
  echo "✔ El servicio está funcionando correctamente."
else
  echo "⚠ El servicio no arrancó. Revisa los logs con:"
  echo "   sudo journalctl -u pos -n 50"
fi

echo ""
read -rp "Presiona Enter para cerrar..."
