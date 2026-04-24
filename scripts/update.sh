#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

echo "==> Script de Actualización del Punto de Venta =="

# 1. Detener el servicio
echo "
[1/8] Deteniendo el servicio POS..."
sudo systemctl stop pos

# 2. Navegar al directorio
echo "
[2/8] Navegando al directorio de la aplicación..."
cd /opt/punto_de_venta

# 3. Actualizar el código desde GitHub
echo "
[3/8] Actualizando el código desde GitHub..."
sudo git config --global --add safe.directory /opt/punto_de_venta # Añadir excepción de seguridad para Git
sudo git fetch origin
sudo git reset --hard origin/main

# 4. Reinstalar dependencias
echo "
[4/8] Instalando dependencias (npm ci)..."
sudo -u restaurante npm ci

# 5. Aplicar cambios de base de datos
echo "
[5/8] Aplicando cambios de base de datos (prisma db push)..."
sudo -u restaurante npx prisma db push --skip-generate

# 6. Corregir permisos
echo "
[6/8] Corrigiendo permisos de archivo..."
sudo chown -R restaurante:restaurante .

# 7. Reconstruir la aplicación
echo "
[7/8] Reconstruyendo la aplicación para producción..."
NODE_ENV=production sudo -u restaurante npm run build

# 8. Reiniciar el servicio
echo "
[8/8] Reiniciando el servicio POS..."
sudo systemctl start pos

echo "
==> ¡Actualización completada! Verificando estado del servicio:"
sudo systemctl status pos
