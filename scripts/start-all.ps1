# ==============================================================================
# Registro Elettronico - Avvio Servizi Completi (DB + API + Web)
# ==============================================================================

$fnm = "C:\Users\paolo\AppData\Local\Microsoft\WinGet\Links\fnm.exe"
$root = "c:\Users\paolo\Documents\registro"

Set-Location $root

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "  AVVIO REGISTRO ELETTRONICO - STACK COMPLETO CON PROFILI DEMO" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

# 1. Arresto preventivo di eventuali processi appesi
powershell -ExecutionPolicy Bypass -File scripts/stop-services.ps1

# 2. Avvio Database PostgreSQL su porta 5432
Write-Host "`n[1/3] Avvio motore PostgreSQL 16..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoProfile", "-Command", "Set-Location '$root'; & '$fnm' env | Out-String | Invoke-Expression; node scripts/db-server.js *>> scripts/db.log" -WindowStyle Hidden

$dbReady = $false
for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Seconds 1
    if (Test-NetConnection -ComputerName localhost -Port 5432 -InformationLevel Quiet) {
        $dbReady = $true
        break
    }
}

if (-not $dbReady) {
    Write-Host "ERRORE: Timeout avvio PostgreSQL. Controlla scripts/db.log" -ForegroundColor Red
    exit 1
}
Write-Host "  PostgreSQL attivo su localhost:5432" -ForegroundColor Green

# 3. Aggiornamento schema e seed dei profili demo
Write-Host "`n[1b/3] Sincronizzazione profili demo e voti nel database..." -ForegroundColor Yellow
& "$fnm" env | Out-String | Invoke-Expression
pnpm --filter @registro/api prisma:push --skip-generate
pnpm --filter @registro/api prisma:seed

# 4. Avvio Backend API NestJS su porta 4000
Write-Host "`n[2/3] Avvio Backend API NestJS su porta 4000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoProfile", "-Command", "Set-Location '$root'; & '$fnm' env | Out-String | Invoke-Expression; node apps/api/dist/main.js *>> scripts/api.log" -WindowStyle Hidden

$apiReady = $false
for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Seconds 1
    if (Test-NetConnection -ComputerName localhost -Port 4000 -InformationLevel Quiet) {
        $apiReady = $true
        break
    }
}

if (-not $apiReady) {
    Write-Host "ERRORE: Timeout avvio Backend API. Controlla scripts/api.log" -ForegroundColor Red
    exit 1
}
Write-Host "  Backend API attivo su http://localhost:4000/api/v1 (Docs: /docs)" -ForegroundColor Green

# 5. Avvio Frontend Next.js su porta 3000
Write-Host "`n[3/3] Avvio Frontend Next.js su porta 3000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoProfile", "-Command", "Set-Location '$root'; & '$fnm' env | Out-String | Invoke-Expression; pnpm --filter @registro/web start *>> scripts/web.log" -WindowStyle Hidden

$webReady = $false
for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Seconds 1
    if (Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet) {
        $webReady = $true
        break
    }
}

if (-not $webReady) {
    Write-Host "ERRORE: Timeout avvio Frontend Web. Controlla scripts/web.log" -ForegroundColor Red
    exit 1
}
Write-Host "  Frontend Web attivo su http://localhost:3000" -ForegroundColor Green

# 6. Riepilogo e Credenziali di Test
Write-Host "`n==================================================================" -ForegroundColor Green
Write-Host "  TUTTI I SERVIZI SONO ATTIVI E PRONTI PER IL TEST!" -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Green
Write-Host "  Web App:       http://localhost:3000" -ForegroundColor White
Write-Host "  Rete Locale:   http://192.168.1.121:3000 (da smartphone o tablet)" -ForegroundColor White
Write-Host "  Swagger Docs:  http://localhost:4000/docs" -ForegroundColor White
Write-Host "  API Health:    http://localhost:4000/api/v1/health" -ForegroundColor White
Write-Host "`nCredenziali di Test (oppure clicca i pulsanti rapidi al login):" -ForegroundColor Cyan
Write-Host "  - Studente (1A):       studente.20250001 / Password123!#" -ForegroundColor White
Write-Host "  - Studente (Debito):   studente.20250002 / Password123!#" -ForegroundColor White
Write-Host "  - Docente:             docente.bianchi0  / Password123!#" -ForegroundColor White
Write-Host "  - Genitore:            genitore.rossi    / Password123!#" -ForegroundColor White
Write-Host "  - Admin Scuola:        admin.davinci     / Password123!#" -ForegroundColor White
Write-Host "  - Vicepreside:         vicepreside.davinci / Password123!#" -ForegroundColor White
Write-Host "  - Super Admin:         superadmin        / SuperAdmin2026!#" -ForegroundColor White
Write-Host "==================================================================`n" -ForegroundColor Green
