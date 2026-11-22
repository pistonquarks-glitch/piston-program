@echo off
title APPKIS - Creador de Ejecutable Autodescomprimible (.EXE SFX)
color 0E
echo ====================================================================
echo   CREADOR DE EJECUTABLE UNICO .EXE MEDIANTE POWERSHELL / 7-ZIP
echo ====================================================================
echo.

echo Este script empaqueta todo este proyecto en un unico ejecutable .EXE
echo que al hacer doble clic se extrae temporalmente y ejecuta la app.
echo.

set OUTPUT_EXE=ress_Portable.exe

powershell -Command "$compress = @{ Path = '.*'; DestinationPath = 'app_bundle.zip' }; Compress-Archive @compress -Force"

echo [+] Creado archivo app_bundle.zip
echo [+] Generando script de autoextraccion ejecutable...

(
echo @echo off
echo set TEMP_DIR=%%TEMP%%\APPKIS_%RANDOM%
echo mkdir %%TEMP_DIR%%
echo powershell -Command "Expand-Archive -Path '%%~f0' -DestinationPath '%%TEMP_DIR%%' -Force" 2^>nul
echo cd /d %%TEMP_DIR%%
echo call EJECUTAR_ress.bat
) > launcher_wrapper.bat

echo.
echo ====================================================================
echo Instrucciones para obtener un archivo .EXE final unico:
echo 1. Usa la herramienta 'Bat To Exe Converter' o 7-Zip SFX.
echo 2. Convierte el archivo 'EJECUTAR_ress.bat' a '%OUTPUT_EXE%'.
echo ====================================================================
pause
