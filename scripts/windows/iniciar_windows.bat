@echo off
title Servidor POS

set "INSTALL_DIR=C:\Punto_de_Venta"

echo Iniciando el servidor del Punto de Venta...
:: Cambiar al directorio raiz de forma explicita
cd /d "%INSTALL_DIR%"

:: Abrir el navegador en localhost
start http://localhost:3000

echo.
echo ========================================================
echo El servidor esta listo. Si deseas conectar una tableta
echo o celular en esta misma red WiFi, abre el navegador en
echo el dispositivo y usa alguna de las siguientes IPs:
ipconfig | findstr /i "IPv4"
echo.
echo Ejemplo: http://192.168.1.50:3000
echo ========================================================
echo.

:: Iniciar el servidor
call npm run start -- -H 0.0.0.0 -p 3000
if %errorLevel% neq 0 (
    echo [ERROR] El servidor se detuvo o fallo al iniciar.
    pause
)
