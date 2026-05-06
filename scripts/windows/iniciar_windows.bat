@echo off
title Servidor POS

echo Iniciando el servidor del Punto de Venta...
:: Cambiar al directorio raiz (un nivel arriba de scripts\windows)
cd /d "%~dp0..\.."

:: Abrir el navegador en localhost
start http://localhost:3000

:: Iniciar el servidor
call npm run start
if %errorLevel% neq 0 (
    echo [ERROR] El servidor se detuvo o fallo al iniciar.
    pause
)
