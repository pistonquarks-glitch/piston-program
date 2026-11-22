# Carga OPENROUTER_API_KEY desde el entorno o desde .env (no hardcodear secretos)
if (-not $env:OPENROUTER_API_KEY) {
  $envFile = Join-Path $PSScriptRoot ".env"
  if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
      if ($_ -match '^\s*OPENROUTER_API_KEY\s*=\s*(.+)\s*$') { $env:OPENROUTER_API_KEY = $Matches[1].Trim('"').Trim("'") }
    }
  }
}
& (Join-Path $PSScriptRoot "supervisor_piston.ps1")
