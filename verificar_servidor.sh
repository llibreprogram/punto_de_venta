# Script para verificar el estado del servidor remoto
# Ejecuta esto en el servidor remoto (192.168.1.35)

echo '=== VERIFICACIÓN DEL SERVIDOR REMOTO ==='
echo ''

echo '1. Versión de Git actual:'
git log --oneline -3
echo ''

echo '2. Estado del repositorio:'
git status --porcelain
echo ''

echo '3. Última actualización:'
git log -1 --format='%h %s (%ar)'
echo ''

echo '4. Archivos modificados recientemente:'
find . -name '*.tsx' -o -name '*.ts' -o -name '*.js' | xargs ls -lt | head -5
echo ''

echo '5. Proceso de Node.js corriendo:'
ps aux | grep -E '(node|next)' | grep -v grep || echo 'No se encontraron procesos de Node.js'
echo ''

echo '6. Puerto 3001 en uso:'
netstat -tlnp | grep :3001 || echo 'Puerto 3001 no está en uso'
