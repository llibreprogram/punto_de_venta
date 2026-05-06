@echo off
title Actualizar Sistema POS

echo =======================================================
echo     Actualizando Sistema de Punto de Venta
echo =======================================================
echo.

:: Cambiar al directorio raiz (un nivel arriba de scripts\windows)
cd /d "%~dp0..\.."

echo Obteniendo ultimos cambios desde GitHub...
:: Guardamos cambios locales temporales para evitar conflictos, aunque no deberia haberlos
git stash >nul 2>&1
git pull origin main
if %errorLevel% neq 0 (
    echo [ERROR] No se pudieron obtener las actualizaciones desde GitHub.
    echo Verifica tu conexion a internet o permisos de Git.
    pause
    exit /b 1
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
