@echo off
cd /d "%~dp0"
title Compilando ress a .EXE con Electron
color 0B
echo ======================================================
echo   COMPILADOR DE ARCHIVO .EXE (ELECTRON BUILDER)
echo ======================================================
echo.

echo [1/3] Instalando Electron y Electron-Builder...
call npm install --save-dev electron electron-builder
if errorlevel 1 goto :ON_ERROR

echo [2/3] Compilando codigo web del proyecto...
call npm run build
if errorlevel 1 goto :ON_ERROR

echo [3/3] Generando archivo .EXE Portable de Windows...
call npx electron-builder --win portable
if errorlevel 1 goto :ON_ERROR

echo.
echo ======================================================
echo ¡EXITO! Revisa la carpeta dist_electron\ o dist\
echo Alli encontraras tu archivo .EXE ejecutable final.
echo ======================================================
pause
exit /b 0

:ON_ERROR
echo.
echo ======================================================
echo [ERROR] Ocurrio un fallo durante la compilacion a .EXE.
echo La ventana permanecera abierta para revisar el log.
echo ======================================================
echo.
pause
exit /b 1
