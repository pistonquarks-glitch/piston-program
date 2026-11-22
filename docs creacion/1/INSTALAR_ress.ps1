<#
.SYNOPSIS
    Script de instalacion y empaquetado para ress
    Creado por APPKIS Compiler Studio
#>

param (
    [string]$TargetFolder = "$env:LOCALAPPDATA\ress",
    [switch]$CreateDesktopShortcut = $true
)

$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   Instalador y Compilador EXE para ress" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar Node.js
if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
    Write-Host "[+] Instalando Node.js desde Winget..." -ForegroundColor Green
    winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
} else {
    Write-Host "[v] Node.js detectado en el sistema." -ForegroundColor Green
}

# 2. Crear carpeta de destino
if (-not (Test-Path $TargetFolder)) {
    New-Item -ItemType Directory -Path $TargetFolder | Out-Null
    Write-Host "[v] Carpeta creada en: $TargetFolder" -ForegroundColor Green
}

# 3. Copiar archivos del proyecto
Write-Host "[+] Copiando archivos del proyecto..." -ForegroundColor Yellow
Copy-Item -Path "$PSScriptRoot\*" -Destination $TargetFolder -Recurse -Force -Exclude "*.ps1"

# 4. Compilar proyecto en destino
Set-Location $TargetFolder
Write-Host "[+] Instalando dependencias de Node.js..." -ForegroundColor Yellow
npm install

Write-Host "[+] Compilando aplicacion..." -ForegroundColor Yellow
npm run build

# 5. Crear Acceso Directo en Escritorio
if ($CreateDesktopShortcut) {
    $DesktopPath = [System.IO.Path]::Combine([System.Environment]::GetFolderPath("Desktop"), "ress.lnk")
    $WshShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut($DesktopPath)
    $Shortcut.TargetPath = "$TargetFolder\EJECUTAR_ress.bat"
    $Shortcut.WorkingDirectory = $TargetFolder
    $Shortcut.Description = "Proyecto exportado de Google AI Studio"
    $Shortcut.Save()
    Write-Host "[v] Acceso directo creado en el Escritorio: $DesktopPath" -ForegroundColor Green
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   INSTALACION COMPLETADA CON EXITO POR APPKIS" -ForegroundColor Green
Write-Host "   Puedes iniciar la app desde el acceso directo del escritorio" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan
