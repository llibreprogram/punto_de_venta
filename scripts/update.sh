#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

echo "==> Script de Actualización del Punto de Venta =="

# 1. Detener el servicio
echo "
[1/7] Deteniendo el servicio POS..."
sudo systemctl stop pos

# 2. Navegar al directorio
echo "
[2/7] Navegando al directorio de la aplicación..."
cd /opt/punto_de_venta

# 3. Actualizar el código desde GitHub
echo "
[3/7] Actualizando el código desde GitHub..."
sudo git config --global --add safe.directory /opt/punto_de_venta # Añadir excepción de seguridad para Git
sudo git fetch origin
sudo git reset --hard origin/main

# 4. Reinstalar dependencias
echo "
[4/7] Instalando dependencias (npm ci)..."
sudo -u restaurante npm ci

# 5. Corregir permisos
echo "
[5/7] Corrigiendo permisos de archivo..."
sudo chown -R restaurante:restaurante .

# 6. Reconstruir la aplicación
echo "
[6/7] Reconstruyendo la aplicación para producción..."
NODE_ENV=production sudo -u restaurante npm run build

# 7. Reiniciar el servicio
echo "
[7/7] Reiniciando el servicio POS..."
sudo systemctl start pos

echo "
==> ¡Actualización completada! Verificando estado del servicio:"
sudo systemctl status pos
