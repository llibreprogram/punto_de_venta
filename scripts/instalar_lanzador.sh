#!/usr/bin/env bash
# Script para instalar el lanzador de actualización en el escritorio local

# Obtener la ruta absoluta de la carpeta del programa
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ESCRITORIO_DIR="$HOME/Escritorio"

# Si no existe "Escritorio", probar con "Desktop"
if [ ! -d "$ESCRITORIO_DIR" ]; then
    ESCRITORIO_DIR="$HOME/Desktop"
fi

echo "==> Instalando lanzador de actualización en: $ESCRITORIO_DIR"

# 1. Crear el script ejecutable en el escritorio
cat <<INNEREOF > "$ESCRITORIO_DIR/Actualizar_POS.sh"
#!/usr/bin/env bash
# Script generado automáticamente para actualizar el POS

echo "=========================================="
echo "Iniciando Actualización desde GitHub..."
echo "=========================================="

# Ejecutar el auto-update real dentro de la carpeta del programa
bash "$APP_DIR/scripts/auto-update.sh"

if [ \$? -eq 0 ]; then
    echo ""
    echo "✅ ACTUALIZACIÓN COMPLETADA EXITOSAMENTE."
else
    echo ""
    echo "❌ ERROR: La actualización falló."
fi

echo ""
echo "Presiona ENTER para cerrar esta ventana."
read
INNEREOF

# 2. Dar permisos de ejecución al script
chmod +x "$ESCRITORIO_DIR/Actualizar_POS.sh"

# 3. Crear el archivo .desktop para el doble clic
cat <<INNEREOF > "$ESCRITORIO_DIR/Actualizar_POS.desktop"
[Desktop Entry]
Version=1.0
Type=Application
Terminal=true
Exec=$ESCRITORIO_DIR/Actualizar_POS.sh
Name=Actualizar POS
Comment=Actualiza el sistema de Punto de Venta
Icon=system-software-update
Categories=Utility;
INNEREOF

# 4. Dar permisos al archivo .desktop
chmod +x "$ESCRITORIO_DIR/Actualizar_POS.desktop"

echo "✅ ¡Instalación terminada!"
echo "Ahora verás un icono llamado 'Actualizar POS' en tu escritorio."
echo "Recuerda hacerle clic derecho y seleccionar 'Permitir el lanzamiento' si es necesario."
