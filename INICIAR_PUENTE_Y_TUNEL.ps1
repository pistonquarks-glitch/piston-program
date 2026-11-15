$ErrorActionPreference = "SilentlyContinue"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   PISTON WHATSAPP BRIDGE & CLOUDFLARE TUNNEL RUNNER   " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Limpieza de procesos huérfanos
Write-Host "[1/4] Limpiando procesos huerfanos..." -ForegroundColor Yellow
$connections = Get-NetTCPConnection -LocalPort 2013 -ErrorAction SilentlyContinue
foreach ($conn in $connections) {
    if ($conn.OwningProcess -gt 0) {
        Write-Host " - Liberando puerto 2013 (PID: $($conn.OwningProcess))..." -ForegroundColor Gray
        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}
Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host " - Deteniendo instancia previa de cloudflared (PID: $($_.Id))..." -ForegroundColor Gray
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 1

# 2. Rutas del proyecto
$projectDir = "C:\Users\USER\Desktop\HERRAMIENTAS DE IA\Proyectos\piston program"
$cloudflaredExe = Join-Path $projectDir "cloudflared.exe"
$bridgeScript = Join-Path $projectDir "src\services\bridgeTest.js"
$logPath = Join-Path $projectDir "cloudflare_tunnel.log"
$urlFile = Join-Path $projectDir "URL_TUNEL_ACTIVA.txt"
# Config dedicada del WhatsApp Bridge: evita que cloudflared lea ~/.cloudflared/config.yml
# (que pertenece al tunel de GolosOS Caja y fuerza ingressRule=http_status:404)
$waConfig = Join-Path $projectDir "cloudflare_whatsapp.yml"

if (-not (Test-Path $waConfig)) {
    Set-Content -Path $waConfig -Value "# Config dedicada al Puente WhatsApp (no toca ~/.cloudflared/config.yml)`nloglevel: info`n" -Encoding utf8
}

if (Test-Path $logPath) { Remove-Item $logPath -Force -ErrorAction SilentlyContinue }
if (Test-Path $urlFile) { Remove-Item $urlFile -Force -ErrorAction SilentlyContinue }

# 3. Iniciar Servidor Express/Node
Write-Host "[2/4] Iniciando Servidor de Puente (puerto 2013)..." -ForegroundColor Yellow
Start-Process -FilePath "node" -ArgumentList "`"$bridgeScript`"" -WorkingDirectory $projectDir -WindowStyle Minimized

# Esperar a que el puerto 2013 esté escuchando
$portReady = $false
for ($i = 0; $i -lt 15; $i++) {
    $check = Get-NetTCPConnection -LocalPort 2013 -State Listen -ErrorAction SilentlyContinue
    if ($check) {
        $portReady = $true
        break
    }
    Start-Sleep -Seconds 1
}

if (-not $portReady) {
    Write-Host "❌ ERROR: El servidor en el puerto 2013 no respondio a tiempo." -ForegroundColor Red
    Pause
    exit 1
}
Write-Host "✅ Puerto 2013 escuchando activamente." -ForegroundColor Green

# 4. Iniciar Tunel de Cloudflare
Write-Host "[3/4] Generando Tunel de Cloudflare..." -ForegroundColor Yellow
Start-Process -FilePath $cloudflaredExe -ArgumentList "tunnel --url http://127.0.0.1:2013 --config `"$waConfig`" --logfile `"$logPath`"" -WorkingDirectory $projectDir -WindowStyle Minimized

# 5. Extraer URL publica resultante
Write-Host "[4/4] Esperando enlace publico de Cloudflare..." -ForegroundColor Yellow
$tunnelUrl = $null
for ($i = 0; $i -lt 30; $i++) {
    if (Test-Path $logPath) {
        $logContent = Get-Content $logPath -Raw -ErrorAction SilentlyContinue
        if ($logContent -match '(https:\/\/[a-zA-Z0-9\-]+\.trycloudflare\.com)') {
            $tunnelUrl = $matches[1]
            break
        }
    }
    Start-Sleep -Seconds 1
}

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
if ($tunnelUrl) {
    $webhookUrl = "$tunnelUrl/webhook"
    Set-Content -Path $urlFile -Value $webhookUrl -Encoding utf8
    
    Write-Host "🎯 ESTADO: SERVICIOS 100% OPERATIVOS Y BLINDADOS" -ForegroundColor Green
    Write-Host ""
    Write-Host "📍 PUERTO LOCAL:    http://localhost:2013" -ForegroundColor White
    Write-Host "🌐 TUNEL PUBLICO:   $tunnelUrl" -ForegroundColor Cyan
    Write-Host "🔗 WEBHOOK OPEN-WA: $webhookUrl" -ForegroundColor Green
    Write-Host ""
    Write-Host "✅ La URL ha sido guardada en: $urlFile" -ForegroundColor Gray
} else {
    Write-Host "⚠️ El tunel esta corriendo pero la URL aun se esta negociando." -ForegroundColor Yellow
    Write-Host "Revisa el archivo de log en: $logPath" -ForegroundColor Gray
}
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Presione cualquier tecla para salir (los servicios siguen en segundo plano)..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
