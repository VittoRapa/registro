# ==============================================================================
# Script di Backup Logico e Disaster Recovery (Spec 19 - Sicurezza & GDPR)
# ==============================================================================
param (
  [string]$DestinationDir = "./backups"
)

$ErrorActionPreference = "Stop"

Write-Host "🛡️ [REGISTRO] Avvio procedura di backup logico database..." -ForegroundColor Cyan

# Setup Node environment via fnm if present
$fnmPath = "$env:LOCALAPPDATA\Microsoft\WinGet\Links\fnm.exe"
if (Test-Path $fnmPath) {
  & $fnmPath env | Out-String | Invoke-Expression
}

if (-not (Test-Path $DestinationDir)) {
  New-Item -ItemType Directory -Path $DestinationDir -Force | Out-Null
}

$env:BACKUPS_DIR = $DestinationDir

try {
  node scripts/db-backup.js
  if ($LASTEXITCODE -ne 0) {
    throw "Backup script exited with code $LASTEXITCODE"
  }
  Write-Host "🎉 Backup completato con successo." -ForegroundColor Green
} catch {
  Write-Error "❌ Errore durante l'esecuzione del backup: $_"
  exit 1
}
