@echo off
title Servidor POS

set "INSTALL_DIR=C:\Punto_de_Venta"

echo Iniciando el servidor del Punto de Venta...
:: Cambiar al directorio raiz de forma explicita
cd /d "%INSTALL_DIR%"

:: Abrir el navegador en localhost
start http://localhost:3000

:: Iniciar el servidor
call npm run start
if %errorLevel% neq 0 (
    echo [ERROR] El servidor se detuvo o fallo al iniciar.
    pause
)
