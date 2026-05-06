@echo off
title Actualizar Sistema POS

set "INSTALL_DIR=C:\Punto_de_Venta"

echo =======================================================
echo     Actualizando Sistema de Punto de Venta
echo =======================================================
echo.

:: Cambiar al directorio raiz del proyecto de forma explicita
cd /d "%INSTALL_DIR%"

echo Obteniendo ultimos cambios desde GitHub...
:: Respaldar la base de datos antes de actualizar para evitar que Git la elimine o sobreescriba
if exist "prisma\*.db" (
    echo Respaldando base de datos...
    mkdir "backup_db" 2>nul
    copy "prisma\*.db" "backup_db\" >nul
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

:: Restaurar la base de datos
if exist "backup_db\*.db" (
    echo Restaurando base de datos...
    copy "backup_db\*.db" "prisma\" >nul
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
