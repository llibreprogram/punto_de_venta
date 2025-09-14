# Script para actualizar forzosamente el servidor remoto
# Ejecuta esto como usuario 'restaurante' en 192.168.1.35

echo '=== ACTUALIZACIÓN FORZADA DEL SERVIDOR ==='
echo 'Usuario: restaurante'
echo 'Servidor: 192.168.1.35:3001'
echo ''

echo '1. Deteniendo servicios existentes...'
sudo systemctl stop punto-de-venta 2>/dev/null || echo 'Servicio no estaba corriendo'
pkill -f 'next dev' 2>/dev/null || echo 'No había procesos de Next.js corriendo'
pkill -f 'node.*3001' 2>/dev/null || echo 'No había procesos en puerto 3001'
echo ''

echo '2. Limpiando caché y dependencias...'
rm -rf .next node_modules/.cache 2>/dev/null || echo 'No había caché que limpiar'
echo ''

echo '3. Forzando actualización desde GitHub...'
git fetch origin
git reset --hard origin/main
git pull origin main --force
echo ''

echo '4. Instalando dependencias...'
npm install --production=false
echo ''

echo '5. Construyendo la aplicación...'
npm run build
echo ''

echo '6. Iniciando el servicio...'
sudo systemctl start punto-de-venta 2>/dev/null || npm run dev -- -p 3001 &
echo ''

echo '7. Verificando que esté corriendo...'
sleep 3
curl -s http://localhost:3001 | head -5 || echo 'No se pudo conectar a localhost:3001'
echo ''

echo '8. Verificación de cambios aplicados:'
echo '- Layout responsivo:'
grep -r 'min-h-dvh' src/app/pos/page.tsx 2>/dev/null | head -1 || echo 'No encontrado'
echo ''
echo '- Panel móvil:'
grep -r 'mobileCartOpen' src/app/pos/page.tsx 2>/dev/null | head -1 || echo 'No encontrado'
echo ''
echo '- Fuentes del sistema:'
grep -r 'system-ui' src/app/globals.css 2>/dev/null | head -1 || echo 'No encontrado'
echo ''

echo '=== ACTUALIZACIÓN COMPLETADA ==='
echo 'Verifica en http://192.168.1.35:3001 que los cambios estén visibles'
