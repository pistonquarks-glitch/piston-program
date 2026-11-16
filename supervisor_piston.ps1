# ============================================================
# Supervisor de procesos — Piston Quarks (WhatsApp Bridge Stack)
# Reinicia automaticamente los servicios que se caen:
#   1. Bridge Node        -> src/services/bridgeTest.js (puerto 2013)
#   2. cloudflared        -> tunnel run 4290f2da-49ad-45fd-b10e-f6c38a208c35
#                            (puerto tunel: wa.pistonquarks.store -> 127.0.0.1:2013)
#   3. Ollama             -> ollama serve (puerto 11434)
# Log: <projectDir>\supervisor_piston.log
# ============================================================
$ErrorActionPreference = "Continue"
$projectDir = "C:\Users\USER\Desktop\HERRAMIENTAS DE IA\Proyectos\piston program"
$logFile = Join-Path $projectDir "supervisor_piston.log"

function Write-Log {
    param([string]$msg)
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "$ts $msg"
    $line | Out-File -FilePath $logFile -Append
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

Write-Log "Supervisor iniciado."

while ($true) {
    Start-Sleep -Seconds 20
    if (-not (Test-Process -Name "node" -CmdPart "bridgeTest.js")) {
        Write-Log "Bridge no detectado. Reiniciando..."
        Start-Process -FilePath "node.exe" -ArgumentList "`"$projectDir\src\services\bridgeTest.js`"" -WorkingDirectory $projectDir -WindowStyle Minimized
        Start-Sleep -Seconds 20
        Write-Log "Bridge reiniciado."
    }
    if (-not (Test-Process -Name "cloudflared" -CmdPart "tunnel run 4290f2da")) {
        Write-Log "cloudflared no detectado. Reiniciando..."
        Start-Process -FilePath "C:\Program Files (x86)\cloudflared\cloudflared.exe" -ArgumentList "tunnel run 4290f2da-49ad-45fd-b10e-f6c38a208c35" -WorkingDirectory "C:\Users\USER" -WindowStyle Hidden
        Start-Sleep -Seconds 25
        Write-Log "cloudflared reiniciado."
    }
    if (-not (Test-Process -Name "ollama" -CmdPart "serve")) {
        Write-Log "Ollama no detectado. Reiniciando..."
        Start-Process -FilePath "C:\Users\USER\AppData\Local\Programs\Ollama\ollama.exe" -ArgumentList "serve" -WindowStyle Hidden
        Start-Sleep -Seconds 20
        Write-Log "Ollama reiniciado."
    }
}
