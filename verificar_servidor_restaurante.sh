# Script para verificar el estado del servidor remoto
# Ejecuta esto como usuario 'restaurante' en 192.168.1.35

echo '=== VERIFICACIÓN DEL SERVIDOR REMOTO ==='
echo 'Usuario: restaurante'
echo 'Servidor: 192.168.1.35:3001'
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
netstat -tlnp | grep :3001 || ss -tlnp | grep :3001 || echo 'Puerto 3001 no está en uso'
echo ''

echo '7. Verificación de cambios específicos:'
echo '- Layout responsivo (min-h-dvh):'
grep -r 'min-h-dvh' src/ 2>/dev/null | head -1 || echo 'No encontrado'
echo ''
echo '- Panel móvil (hidden md:flex):'
grep -r 'hidden md:flex' src/ 2>/dev/null | head -1 || echo 'No encontrado'
echo ''
echo '- Fuentes del sistema (antialiased):'
grep -r 'antialiased' src/ 2>/dev/null | head -1 || echo 'No encontrado'
echo ''

echo '=== DIAGNÓSTICO COMPLETADO ==='
