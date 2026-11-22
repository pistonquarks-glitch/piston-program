@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title ress - Lanzador APPKIS
color 0A
cls

echo ======================================================================
echo    ress - APPKIS Studio Launcher
echo    Version: 1.0.0
echo ======================================================================
echo.

:: 1. Verificar si Node.js esta instalado
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js no se encuentra instalado en este sistema.
    echo Se requiere Node.js 18+ para ejecutar esta aplicacion.
    echo.
    echo Intentando instalar Node.js automaticamente con Winget...
    winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    where node >nul 2>nul
    if errorlevel 1 (
        echo.
        echo [!] No se pudo instalar Node.js automaticamente.
        echo Por favor descarga e instala Node.js manualmente desde: https://nodejs.org/
        goto :ON_ERROR
    )
)

:: 2. Configurar variables de entorno
echo [INFO] Cargando configuracion de entorno...
set PORT=30787
set NODE_ENV=production
set GEMINI_API_KEY=Tu_API_Key_Aqui

:: 3. Verificar e instalar dependencias si no existen
if not exist "node_modules" (
    echo [INFO] Instalando dependencias necesarias (primera ejecucion)...
    call npm install
    if errorlevel 1 (
        echo.
        echo [ERROR] Fallo la instalacion de dependencias con npm install.
        goto :ON_ERROR
    )
)

:: 4. Compilar proyecto si no existe la carpeta dist
if not exist "dist" (
    echo [INFO] Compilando el proyecto web (npm run build)...
    call npm run build
    if errorlevel 1 (
        echo [WARNING] Fallo npm run build, se intentara modo desarrollo (npm run dev)...
    )
)

:: 5. Abrir navegador automaticamente
echo [INFO] Abriendo navegador en http://localhost:30787/
timeout /t 3 /nobreak >nul
start http://localhost:30787/

:: 6. Iniciar la aplicacion
echo.
echo ======================================================================
echo    Aplicacion activa en http://localhost:30787/
echo    Manten esta ventana abierta para mantener la aplicacion activa.
echo ======================================================================
echo.


if exist "dist\server.cjs" (
    node dist\server.cjs
) else if exist "server.ts" (
    call npx tsx server.ts
) else (
    call npm run dev
)


if errorlevel 1 (
    echo.
    echo [ERROR] Ocurrio un error durante la ejecucion del servidor.
    goto :ON_ERROR
)

echo.
echo Aplicacion finalizada.
pause
exit /b 0

:ON_ERROR
echo.
echo ======================================================================
echo [ERROR CRITICO] Ocurrio un error al ejecutar la aplicacion.
echo La ventana permanecera abierta para que puedas revisar el mensaje arriba.
echo ======================================================================
echo.
pause
exit /b 1
