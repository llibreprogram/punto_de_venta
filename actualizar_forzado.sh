# Script de actualización forzada
# Ejecuta esto en el servidor remoto

echo '=== ACTUALIZACIÓN FORZADA DEL SERVIDOR ==='
echo ''

echo '1. Deteniendo servicios...'
sudo systemctl stop punto_de_venta 2>/dev/null || echo 'Servicio no encontrado, continuando...'
pkill -f 'next\|node.*3001' 2>/dev/null || echo 'No se encontraron procesos para detener'
echo ''

echo '2. Forzando actualización desde GitHub...'
cd /opt/punto_de_venta
git fetch origin
git reset --hard origin/main
echo ''

echo '3. Limpiando cache de Next.js...'
rm -rf .next
echo ''

echo '4. Instalando dependencias...'
npm ci
echo ''

echo '5. Reconstruyendo aplicación...'
npm run build
echo ''

echo '6. Reiniciando servicios...'
sudo systemctl restart punto_de_venta 2>/dev/null || echo 'Servicio no encontrado'
echo ''

echo '7. Verificando que el servidor esté corriendo...'
sleep 3
curl -s -o /dev/null -w 'Estado del servidor: HTTP %{http_code} (%{time_total}s)\n' http://localhost:3001
echo ''

echo '=== ACTUALIZACIÓN COMPLETADA ==='
