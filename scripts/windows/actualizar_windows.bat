@echo off
title Actualizar Sistema POS

set "INSTALL_DIR=C:\Punto_de_Venta"

echo =======================================================
echo     Actualizando Sistema de Punto de Venta
echo =======================================================
echo.

:: Cambiar al directorio raiz del proyecto de forma explicita
cd /d "%INSTALL_DIR%"

:: Detener cualquier servidor Node en ejecucion para liberar archivos
echo Deteniendo el servidor POS activo...
taskkill /F /IM node.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul

echo Obteniendo ultimos cambios desde GitHub...
:: Respaldar la base de datos antes de actualizar para evitar que Git la elimine o sobreescriba
mkdir "backup_db" 2>nul
if exist "prisma\dev.db" (
    echo Respaldando base de datos prisma...
    copy /Y "prisma\dev.db" "backup_db\dev.db" >nul
)

:: Guardamos cambios locales temporales
git stash >nul 2>&1
git pull origin main
if %errorLevel% neq 0 (
    echo [ERROR] No se pudieron obtener las actualizaciones desde GitHub.
    echo Verifica tu conexion a internet o permisos de Git.
    pause
    exit /b 1
)

:: Restaurar la base de datos de forma segura
if exist "backup_db\dev.db" (
    echo Restaurando base de datos...
    copy /Y "backup_db\dev.db" "prisma\dev.db" >nul
)

echo.
echo Instalando nuevas dependencias si las hay...
call npm install
if %errorLevel% neq 0 (
    echo [ERROR] Fallo al instalar las dependencias.
    pause
    exit /b 1
)

echo.
echo Actualizando base de datos...
call npm run prisma:generate
call npm run prisma:push

echo.
echo Verificando usuarios por defecto...
call npm run db:seed

echo.
echo Recompilando el sistema para produccion...
call npm run build
if %errorLevel% neq 0 (
    echo [ERROR] Fallo al compilar el sistema.
    pause
    exit /b 1
)

echo.
echo =======================================================
echo      ¡Actualizacion Completada!
echo =======================================================
pause
