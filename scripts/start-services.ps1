# scripts/start-services.ps1
$fnm = "C:\Users\paolo\AppData\Local\Microsoft\WinGet\Links\fnm.exe"
$root = "c:\Users\paolo\Documents\registro"

Write-Host "Avvio servizi in background persistente..."

# 1. Avvia DB (PostgreSQL)
Start-Process powershell -ArgumentList "-NoProfile", "-Command", "Set-Location '$root'; & '$fnm' env | Out-String | Invoke-Expression; node scripts/db-server.js *>> scripts/db.log" -WindowStyle Hidden
Start-Sleep -Seconds 3

# 2. Avvia API (NestJS)
Start-Process powershell -ArgumentList "-NoProfile", "-Command", "Set-Location '$root'; & '$fnm' env | Out-String | Invoke-Expression; node apps/api/dist/main.js *>> scripts/api.log" -WindowStyle Hidden
Start-Sleep -Seconds 3

# 3. Avvia Web (Next.js)
Start-Process powershell -ArgumentList "-NoProfile", "-Command", "Set-Location '$root'; & '$fnm' env | Out-String | Invoke-Expression; pnpm --filter @registro/web start *>> scripts/web.log" -WindowStyle Hidden
Start-Sleep -Seconds 3

Write-Host "Verifica porte:"
Write-Host "Porta 5432 (DB):" (Test-NetConnection -ComputerName localhost -Port 5432 -InformationLevel Quiet)
Write-Host "Porta 4000 (API):" (Test-NetConnection -ComputerName localhost -Port 4000 -InformationLevel Quiet)
Write-Host "Porta 3000 (Web):" (Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet)
