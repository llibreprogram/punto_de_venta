#!/usr/bin/env bash
# SCRIPT DE ACTUALIZACIÓN INTELIGENTE - Diseñado para usuarios no técnicos

echo "=================================================="
echo "   SISTEMA DE ACTUALIZACIÓN AUTOMÁTICA POS"
echo "=================================================="
echo "Buscando el programa en esta computadora..."

# 1. BUSCAR LA CARPETA DEL PROGRAMA
POSIBLES_RUTAS=(
    "$HOME/punto_de_venta"
    "$HOME/Escritorio/punto_de_venta"
    "$HOME/Desktop/punto_de_venta"
    "$HOME/Documentos/punto_de_venta"
    "$HOME/Documents/punto_de_venta"
    "/opt/punto_de_venta"
)

APP_DIR=""

for ruta in "${POSIBLES_RUTAS[@]}"; do
    if [ -d "$ruta/.git" ]; then
        APP_DIR="$ruta"
        break
    fi
done

# Si no se encuentra en las rutas comunes, buscar de forma más profunda (limitado para ser rápido)
if [ -z "$APP_DIR" ]; then
    echo "Buscando en más carpetas (esto puede tardar un poco)..."
    APP_DIR=$(find "$HOME" -maxdepth 3 -name "punto_de_venta" -type d -exec test -d "{}/.git" \; -print -quit 2>/dev/null)
fi

if [ -z "$APP_DIR" ]; then
    echo "❌ ERROR: No pude encontrar la carpeta 'punto_de_venta' en esta máquina."
    echo "Asegúrate de que la carpeta del programa esté en tu Carpeta Personal o en el Escritorio."
    read -p "Presiona ENTER para salir..."
    exit 1
fi

echo "✅ Programa encontrado en: $APP_DIR"
cd "$APP_DIR" || exit 1

# 2. ACTUALIZAR DESDE GITHUB
echo "--------------------------------------------------"
echo "Descargando la última versión desde GitHub..."
echo "--------------------------------------------------"

# Forzar el uso de SSH si está disponible, o seguir con lo que tenga
git fetch origin
git reset --hard origin/main

if [ $? -ne 0 ]; then
    echo "❌ ERROR: No se pudo conectar con GitHub. Revisa el internet."
    read -p "Presiona ENTER para salir..."
    exit 1
fi

# 3. EJECUTAR EL PROCESO DE ACTUALIZACIÓN INTERNO
echo "--------------------------------------------------"
echo "Instalando y reiniciando el sistema..."
echo "--------------------------------------------------"

# Usamos el script auto-update que ya tenemos, que ahora es portátil
bash "$APP_DIR/scripts/auto-update.sh"

if [ $? -eq 0 ]; then
    echo ""
    echo "=================================================="
    echo "   ✅ ¡SISTEMA ACTUALIZADO CON ÉXITO!"
    echo "=================================================="
    echo "El programa ya está funcionando con la última versión."
else
    echo ""
    echo "❌ HUBO UN PROBLEMA durante la instalación."
    echo "Por favor, contacta al administrador."
fi

echo ""
echo "Presiona ENTER para cerrar esta ventana."
read
