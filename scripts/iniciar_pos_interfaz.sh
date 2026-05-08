#!/usr/bin/env bash
set -euo pipefail

# Script para iniciar el servidor POS y mostrar la información de conexión
# Diseñado para ejecutarse automáticamente al inicio del entorno de escritorio.

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PORT="3001"

# Asegurar que el PATH incluya node/npm (importante cuando corre desde autostart)
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"

# Navegar al directorio de la app
if [ -d "$APP_DIR" ]; then
  cd "$APP_DIR"
else
  # Si no existe, intentar ejecutarlo desde donde esté el script
  cd "$(dirname "$0")/.."
fi

# Iniciar servidor si no está corriendo en el puerto 3001
SERVER_READY=false
if ! ss -tlnp 2>/dev/null | grep -q ":$PORT"; then
  echo "Iniciando servidor POS en producción en el puerto $PORT..."
  # Usar nohup para que sobreviva al script
  export DATABASE_URL="file:./dev.db"
  NODE_ENV=production nohup npm start -- -p $PORT >> /tmp/pos.log 2>&1 &
  
  # Esperar a que el servidor esté listo
  echo "Esperando a que el servidor responda..."
  for i in {1..20}; do
    if ss -tlnp 2>/dev/null | grep -q ":$PORT"; then
      SERVER_READY=true
      break
    fi
    sleep 1
  done
else
  SERVER_READY=true
fi

# Detectar IP Local (ignorando localhost y docker)
IP_LOCAL=$(hostname -I 2>/dev/null | awk '{print $1}')
if [ -z "$IP_LOCAL" ]; then
  IP_LOCAL="127.0.0.1"
fi

if [ "$SERVER_READY" = true ]; then
  MENSAJE="✅ <b>Servidor POS Iniciado</b>\n\nEl sistema está funcionando correctamente en modo producción.\n\nPara conectarte desde esta u otras computadoras, abre el navegador y visita:\n\n<span size='large'><b>http://$IP_LOCAL:$PORT</b></span>"
  TITULO="Punto de Venta"
  ICONO="info"
else
  MENSAJE="❌ <b>Error al Iniciar Servidor</b>\n\nEl servidor no respondió en el puerto $PORT tras 20 segundos.\n\nRevisa los logs en:\n/tmp/pos.log"
  TITULO="Error POS"
  ICONO="error"
fi

# Mostrar ventana gráfica si zenity está disponible
if command -v zenity >/dev/null 2>&1; then
  zenity --$ICONO --title="$TITULO" --text="$MENSAJE" --width=400
else
  # Fallback si no hay zenity
  if command -v gnome-terminal >/dev/null 2>&1; then
    gnome-terminal -- bash -c "echo -e '\n$MENSAJE\n\nPresiona ENTER para cerrar esta ventana.'; read"
  else
    notify-send "$TITULO" "$MENSAJE" || true
  fi
fi
