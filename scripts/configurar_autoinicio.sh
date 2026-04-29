#!/usr/bin/env bash
set -euo pipefail

# Script para configurar el auto-inicio del POS al iniciar sesión en el escritorio
# Se ejecutará una sola vez para instalar la configuración.

AUTOSTART_DIR="$HOME/.config/autostart"
DESKTOP_FILE="$AUTOSTART_DIR/pos-autostart.desktop"
# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "==> Configurando Auto-inicio del Punto de Venta"

# Crear directorio si no existe
mkdir -p "$AUTOSTART_DIR"

# El script que queremos que se ejecute al iniciar sesión
SCRIPT_TO_RUN="$APP_DIR/scripts/iniciar_pos_interfaz.sh"

# Verificar si el script existe en el directorio esperado
if [ ! -f "$SCRIPT_TO_RUN" ]; then
  # Si el script se corre desde otro lugar (ej: modo desarrollo local)
  CURRENT_DIR=$(cd "$(dirname "$0")/.." && pwd)
  SCRIPT_TO_RUN="$CURRENT_DIR/scripts/iniciar_pos_interfaz.sh"
fi

if [ ! -f "$SCRIPT_TO_RUN" ]; then
  echo "❌ Error: No se encontró el script 'iniciar_pos_interfaz.sh' en $SCRIPT_TO_RUN"
  exit 1
fi

# Dar permisos de ejecución al script por si acaso
chmod +x "$SCRIPT_TO_RUN"

# Crear archivo .desktop
cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Type=Application
Exec=$SCRIPT_TO_RUN
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
Name[es_DO]=Servidor POS Auto-inicio
Name=Servidor POS Auto-inicio
Comment[es_DO]=Inicia el servidor del punto de venta y muestra la conexión
Comment=Inicia el servidor del punto de venta y muestra la conexión
Terminal=false
EOF

# Dar permisos al acceso directo
chmod +x "$DESKTOP_FILE"

echo "✅ Configuración de auto-inicio completada exitosamente."
echo "   Archivo creado en: $DESKTOP_FILE"
echo "   La próxima vez que enciendas la computadora, el servidor POS se iniciará automáticamente."
