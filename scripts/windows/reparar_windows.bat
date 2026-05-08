@echo off
title Reparar Sistema POS Windows
set "INSTALL_DIR=C:\Punto_de_Venta"

echo =======================================================
echo     Herramienta de Reparacion - Punto de Venta
echo =======================================================
echo.

:: Verificar permisos de administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ADVERTENCIA] No se esta ejecutando como Administrador.
    echo Por favor, cierra esta ventana, haz clic derecho sobre el archivo
    echo "reparar_windows.bat" y selecciona "Ejecutar como administrador".
    echo.
    pause
    exit /b 1
)

:: 1. Arreglar Firewall
echo [1/3] Configurando Firewall para permitir que la tableta se conecte...
powershell -Command "New-NetFirewallRule -DisplayName 'Punto de Venta POS' -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue"
echo [OK] Regla de Firewall agregada.

:: 2. Restaurar Base de Datos y Usuarios
cd /d "%INSTALL_DIR%"
echo.
echo [2/3] Restaurando usuarios y configuracion inicial...
call npm run db:seed

echo.
echo [3/3] Reseteando contraseñas a los valores por defecto...
call npm run user:reset -- admin@local admin123
call npm run user:reset -- cajero@local cajero123

echo.
echo =======================================================
echo     Reparacion completada. 
echo =======================================================
echo Credenciales restauradas:
echo Administrador: admin@local / admin123
echo Cajero:        cajero@local / cajero123
echo.
echo La tableta ya deberia poder conectarse.
echo.
pause
