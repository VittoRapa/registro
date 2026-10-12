# ==============================================================================
# Script di Ripristino e Disaster Recovery Database (Spec 19 - Sicurezza & GDPR)
# ==============================================================================
param (
  [string]$BackupFile = ""
)

$ErrorActionPreference = "Stop"

Write-Host "🔄 [REGISTRO] Avvio procedura di ripristino database..." -ForegroundColor Yellow

# Setup Node environment via fnm if present
$fnmPath = "$env:LOCALAPPDATA\Microsoft\WinGet\Links\fnm.exe"
if (Test-Path $fnmPath) {
  & $fnmPath env | Out-String | Invoke-Expression
}

try {
  if ($BackupFile) {
    node scripts/db-restore.js $BackupFile
  } else {
    node scripts/db-restore.js
  }

  if ($LASTEXITCODE -ne 0) {
    throw "Restore script exited with code $LASTEXITCODE"
  }
  Write-Host "🎉 Ripristino database completato con successo." -ForegroundColor Green
} catch {
  Write-Error "❌ Errore durante il ripristino: $_"
  exit 1
}
