# scripts/stop-services.ps1
Write-Host "Arresto servizi in corso..."

# Find and kill processes on ports 3000, 4000, 5432
$ports = @(3000, 4000, 5432)
foreach ($port in $ports) {
    $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conns) {
        $pids = $conns.OwningProcess | Select-Object -Unique
        foreach ($pidToKill in $pids) {
            Write-Host "Chiusura processo PID $pidToKill (Porta $port)..."
            Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
        }
    }
}

Write-Host "✅ Tutti i servizi sono stati arrestati."
