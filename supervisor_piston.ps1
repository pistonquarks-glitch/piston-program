# ============================================================
# Supervisor de procesos - Piston Quarks (WhatsApp Bridge Stack)
# Vigila y reinicia:
#   1. Bridge Node      -> src/services/bridgeTest.js (puerto 2013)
#   2. Open-WA (Docker) -> contenedor openwa-api (puerto 2785) + sesion WhatsApp
#   3. cloudflared      -> tunel wa.pistonquarks.store -> 127.0.0.1:2013
#   4. Ollama           -> opcional, DESACTIVADO (el bot usa OpenRouter; ahorra RAM)
# Log: <projectDir>\supervisor_piston.log
# ============================================================
$ErrorActionPreference = "Continue"
$projectDir = "C:\Users\USER\Desktop\HERRAMIENTAS DE IA\Proyectos\piston program"
$logFile = Join-Path $projectDir "supervisor_piston.log"
$launcher = Join-Path $projectDir "supervisor_piston_launcher.ps1"
$dockerDesktop = "C:\Users\USER\AppData\Local\Programs\DockerDesktop\Docker Desktop.exe"
$openwaKey = "owa_k1_ebc6f4496448cbfd9bbcef5c1d29495e3917413ca92cf44a8b14089be28e239e"
$sessionId = "b1ff3640-6e6e-44bb-a601-42d5c605ceea"
$enableOllama = $false

# Instancia unica: si ya hay un supervisor, este proceso sale.
$mutex = New-Object System.Threading.Mutex($false, 'Local\PistonQuarksSupervisor')
if (-not $mutex.WaitOne(0)) {
    Write-Host "Otro supervisor de Piston Quarks ya esta corriendo. Saliendo."
    exit
}

function Write-Log {
    param([string]$msg)
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "$ts $msg"
    Add-Content -Path $logFile -Value $line -Encoding UTF8
    Write-Host $line
}

function Test-Process {
    param([string]$Name, [string]$CmdPart)
    $procs = Get-Process -Name $Name -ErrorAction SilentlyContinue
    foreach ($p in $procs) {
        try {
            $c = (Get-CimInstance Win32_Process -Filter "ProcessId = $($p.Id)").CommandLine
            if ($c -and $c.Contains($CmdPart)) { return $true }
        } catch { }
    }
    return $false
}

function Test-Port {
    param([int]$Port, [int]$TimeoutMs = 1500)
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $ar = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
        if (-not $ar.AsyncWaitHandle.WaitOne($TimeoutMs)) { $client.Close(); return $false }
        $client.EndConnect($ar)
        $client.Close()
        return $true
    } catch { return $false }
}

function Load-BotEnv {
    if (Test-Path $launcher) {
        $text = Get-Content $launcher -Raw
        if ($text -match 'OPENROUTER_API_KEY\s*=\s*"([^"]+)"') {
            $env:OPENROUTER_API_KEY = $Matches[1]
        }
    }
    $env:GSHEETS_SYNC = "1"
}

function Start-Bridge {
    Load-BotEnv
    Write-Log "Bridge no detectado. Reiniciando con OPENROUTER_API_KEY=$(if ($env:OPENROUTER_API_KEY) {'SI'} else {'NO'}) y GSHEETS_SYNC=$($env:GSHEETS_SYNC)..."
    Start-Process -FilePath "node.exe" -ArgumentList "`"$projectDir\src\services\bridgeTest.js`"" -WorkingDirectory $projectDir -WindowStyle Hidden
    Start-Sleep -Seconds 8
}

function Ensure-DockerEngine {
    docker info --format "{{.ServerVersion}}" 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { return $true }
    if (-not (Test-Path $dockerDesktop)) {
        Write-Log "Docker Desktop no encontrado en $dockerDesktop"
        return $false
    }
    Write-Log "Docker engine caido. Lanzando Docker Desktop..."
    Start-Process $dockerDesktop
    for ($i = 0; $i -lt 36; $i++) {
        Start-Sleep -Seconds 5
        docker info --format "{{.ServerVersion}}" 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { Write-Log "Docker engine listo."; return $true }
    }
    Write-Log "Docker engine no respondio en 180 s."
    return $false
}

function Ensure-OpenWA {
    $headers = @{ "X-API-Key" = $openwaKey }

    if (Test-Port -Port 2785) {
        try {
            $s = Invoke-RestMethod -Uri "http://127.0.0.1:2785/api/sessions/$sessionId" -Headers $headers -TimeoutSec 10
            if ($s.status -eq "ready") { return }
            if ($s.status -eq "disconnected") {
                Write-Log "Open-WA sesion disconnected. Iniciando..."
                try {
                    Invoke-RestMethod -Uri "http://127.0.0.1:2785/api/sessions/$sessionId/start" -Method POST -Headers $headers -ContentType "application/json" -Body "{}" -TimeoutSec 60 | Out-Null
                    Write-Log "Open-WA start enviado (puede tardar ~2 min en quedar ready)."
                } catch { Write-Log "Open-WA start error: $($_.Exception.Message)" }
                return
            }
            # initializing: esperar sin insistir
            return
        } catch {
            Write-Log "Open-WA responde pero fallo la consulta: $($_.Exception.Message)"
            return
        }
    }

    # Puerto cerrado: contenedor o engine caidos.
    if (-not (Ensure-DockerEngine)) { return }
    Write-Log "Open-WA no escucha en 2785. Arrancando contenedor openwa-api..."
    docker start openwa-api 2>&1 | Out-Null
    for ($i = 0; $i -lt 20; $i++) {
        Start-Sleep -Seconds 3
        if (Test-Port -Port 2785) { Write-Log "Open-WA escuchando."; break }
    }
    if (-not (Test-Port -Port 2785)) { Write-Log "Open-WA no levanto el puerto 2785."; return }
    Start-Sleep -Seconds 4
    try {
        Invoke-RestMethod -Uri "http://127.0.0.1:2785/api/sessions/$sessionId/start" -Method POST -Headers $headers -ContentType "application/json" -Body "{}" -TimeoutSec 60 | Out-Null
        Write-Log "Open-WA sesion iniciada tras arrancar el contenedor."
    } catch { Write-Log "Open-WA start error: $($_.Exception.Message)" }
}

Load-BotEnv
Write-Log "Supervisor iniciado. IA key=$(if ($env:OPENROUTER_API_KEY) {'SI'} else {'NO'}) GSHEETS_SYNC=$($env:GSHEETS_SYNC) Ollama=$enableOllama"

$lastOpenwaCheck = [DateTime]::MinValue

while ($true) {
    Start-Sleep -Seconds 20

    if (-not (Test-Process -Name "node" -CmdPart "bridgeTest.js")) {
        Start-Bridge
    }

    if (-not (Test-Process -Name "cloudflared" -CmdPart "tunnel run 4290f2da")) {
        $cf = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
        if (-not (Test-Path $cf)) { $cf = Join-Path $projectDir "cloudflared.exe" }
        if (Test-Path $cf) {
            Write-Log "cloudflared no detectado. Reiniciando..."
            Start-Process -FilePath $cf -ArgumentList "tunnel run 4290f2da-49ad-45fd-b10e-f6c38a208c35" -WorkingDirectory "C:\Users\USER" -WindowStyle Hidden
            Start-Sleep -Seconds 10
        } else {
            Write-Log "cloudflared no encontrado."
        }
    }

    if (((Get-Date) - $lastOpenwaCheck).TotalSeconds -ge 60) {
        $lastOpenwaCheck = Get-Date
        Ensure-OpenWA
    }

    if ($enableOllama -and -not (Test-Process -Name "ollama" -CmdPart "serve")) {
        $ollama = "C:\Users\USER\AppData\Local\Programs\Ollama\ollama.exe"
        if (Test-Path $ollama) {
            Write-Log "Ollama no detectado. Reiniciando..."
            Start-Process -FilePath $ollama -ArgumentList "serve" -WindowStyle Hidden
            Start-Sleep -Seconds 10
        }
    }
}
