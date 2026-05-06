@echo off
setlocal EnableDelayedExpansion
title Instalador Automatico de Punto de Venta

set "INSTALL_DIR=C:\Punto_de_Venta"

echo =======================================================
echo     Instalador del Sistema de Punto de Venta (POS)
echo =======================================================
echo.
echo El sistema se instalara de forma segura en: %INSTALL_DIR%
echo.

:: 1. Verificar permisos de administrador
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Permisos de Administrador detectados.
) else (
    echo [ADVERTENCIA] No se esta ejecutando como Administrador.
    echo Es recomendable ejecutar este archivo como Administrador haciendo clic derecho
    echo y seleccionando "Ejecutar como administrador" para instalar Git y Node.
    echo.
    pause
)

:: 2. Verificar e Instalar Git
echo Verificando si Git esta instalado...
git --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [!] Git no encontrado. Instalando Git via winget...
    winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
    if !errorLevel! neq 0 (
        echo [ERROR] No se pudo instalar Git. Por favor, instalalo manualmente.
        pause
        exit /b 1
    )
    echo [OK] Git instalado correctamente.
    set "PATH=%PATH%;C:\Program Files\Git\cmd"
) else (
    echo [OK] Git ya esta instalado.
)

:: 3. Verificar e Instalar Node.js
echo Verificando si Node.js esta instalado...
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [!] Node.js no encontrado. Instalando Node.js via winget...
    winget install --id OpenJS.NodeJS -e --source winget --accept-package-agreements --accept-source-agreements
    if !errorLevel! neq 0 (
        echo [ERROR] No se pudo instalar Node.js. Por favor, instalalo manualmente.
        pause
        exit /b 1
    )
    echo [OK] Node.js instalado correctamente.
    set "PATH=%PATH%;C:\Program Files\nodejs\"
) else (
    echo [OK] Node.js ya esta instalado.
)

:: 4. Crear carpeta principal e ingresar
echo.
echo Preparando el directorio de instalacion en %INSTALL_DIR%...
if not exist "%INSTALL_DIR%" (
    mkdir "%INSTALL_DIR%"
)
cd /d "%INSTALL_DIR%"

:: 5. Verificar el repositorio
echo.
echo Descargando/Verificando archivos del sistema...
if not exist "package.json" (
    echo Clonando el repositorio desde GitHub...
    git clone https://github.com/llibreprogram/punto_de_venta.git .
    if !errorLevel! neq 0 (
        echo [ERROR] No se pudo clonar el repositorio. Verifica tu conexion a internet o permisos de Git.
        pause
        exit /b 1
    )
) else (
    echo [OK] Archivos del sistema encontrados.
)

:: 6. Configurar .env
if not exist ".env" (
    echo Creando archivo de configuracion .env...
    copy .env.example .env >nul
    echo [OK] Archivo .env creado.
)

:: 7. Instalar dependencias
echo.
echo Instalando dependencias de Node.js (esto puede tardar unos minutos)...
call npm install
if %errorLevel% neq 0 (
    echo [ERROR] Fallo al instalar las dependencias.
    pause
    exit /b 1
)

:: 8. Configurar Base de Datos
echo.
echo Configurando la base de datos...
call npm run prisma:generate
call npm run prisma:push
call npm run db:seed

:: 9. Compilar el sistema
echo.
echo Compilando el sistema para produccion (esto tomara unos minutos)...
call npm run build
if %errorLevel% neq 0 (
    echo [ERROR] Fallo al compilar el sistema.
    pause
    exit /b 1
)

:: 10. Crear accesos directos
echo.
echo Creando accesos directos en el Escritorio...
set SHORTCUT_START="%USERPROFILE%\Desktop\Iniciar POS.lnk"
set SHORTCUT_UPDATE="%USERPROFILE%\Desktop\Actualizar POS.lnk"

set VBS_SCRIPT="%TEMP%\CrearAccesos.vbs"
echo Set oWS = WScript.CreateObject("WScript.Shell") > %VBS_SCRIPT%
echo sLinkFile = %SHORTCUT_START% >> %VBS_SCRIPT%
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> %VBS_SCRIPT%
echo oLink.TargetPath = "%INSTALL_DIR%\scripts\windows\iniciar_windows.bat" >> %VBS_SCRIPT%
echo oLink.WorkingDirectory = "%INSTALL_DIR%" >> %VBS_SCRIPT%
echo oLink.Description = "Iniciar el Sistema de Punto de Venta" >> %VBS_SCRIPT%
echo oLink.Save >> %VBS_SCRIPT%

echo sLinkFile = %SHORTCUT_UPDATE% >> %VBS_SCRIPT%
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> %VBS_SCRIPT%
echo oLink.TargetPath = "%INSTALL_DIR%\scripts\windows\actualizar_windows.bat" >> %VBS_SCRIPT%
echo oLink.WorkingDirectory = "%INSTALL_DIR%" >> %VBS_SCRIPT%
echo oLink.Description = "Actualizar el Sistema de Punto de Venta" >> %VBS_SCRIPT%
echo oLink.Save >> %VBS_SCRIPT%

cscript //nologo %VBS_SCRIPT%
del %VBS_SCRIPT%

echo.
echo =======================================================
echo      ¡Instalacion Completada con Exito!
echo =======================================================
echo Ya puedes iniciar el sistema usando el acceso directo "Iniciar POS" 
echo que se ha creado en tu Escritorio.
echo.
pause
