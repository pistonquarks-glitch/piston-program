# Reinicia el bridge de Pistón Bot con la clave de OpenRouter y Google Sheets.
# Uso:  powershell -ExecutionPolicy Bypass -File tools\restart_bridge.ps1
#       powershell -ExecutionPolicy Bypass -File tools\restart_bridge.ps1 -NoSheets
param(
    [switch]$NoSheets
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# 1. Clave de OpenRouter desde el launcher del supervisor
$launcher = Join-Path $root 'supervisor_piston_launcher.ps1'
if (Test-Path $launcher) {
    $text = Get-Content $launcher -Raw
    if ($text -match 'OPENROUTER_API_KEY\s*=\s*"([^"]+)"') {
        $env:OPENROUTER_API_KEY = $Matches[1]
        Write-Output 'KEY_LOADED'
    } else {
        Write-Output 'KEY_MISSING (el bridge arranca, pero la IA no respondera)'
    }
} else {
    Write-Output 'LAUNCHER_NOT_FOUND (define OPENROUTER_API_KEY a mano)'
}

# 2. Sincronizacion con Google Sheets
if (-not $NoSheets) {
    $env:GSHEETS_SYNC = '1'
    Write-Output 'GSHEETS_SYNC=1'
}

# 3. Detener solo el bridge (no otros procesos node)
$conn = Get-NetTCPConnection -LocalPort 2013 -State Listen -ErrorAction SilentlyContinue
foreach ($c in $conn) {
    $p = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue
    if ($p -and $p.ProcessName -eq 'node') {
        Write-Output ('KILL_BRIDGE ' + $p.Id)
        Stop-Process -Id $p.Id -Force
    }
}
Start-Sleep -Seconds 2

# 4. Arrancar y verificar
Start-Process -FilePath 'node' -ArgumentList 'src/services/bridgeTest.js' -WindowStyle Hidden
Start-Sleep -Seconds 5
netstat -ano | Select-String ':2013' | Select-Object -First 4
try {
    Invoke-WebRequest -Uri 'http://localhost:2013/admin/state' -UseBasicParsing -TimeoutSec 8 | Out-Null
    Write-Output 'STATE_OK'
} catch {
    Write-Output ('STATE_ERR ' + $_.Exception.Message)
}
try {
    $gate = Invoke-RestMethod -Uri 'http://localhost:2013/admin/gate' -TimeoutSec 8
    Write-Output ('GATE_OK chats=' + $gate.chats + ' strong=' + $gate.strongTriggers + ' weak=' + $gate.weakTriggers)
} catch {
    Write-Output ('GATE_ERR ' + $_.Exception.Message)
}
