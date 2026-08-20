# Launcher Backend Monitor
# Starts server and monitors every 5 seconds

$url = "http://localhost:8080"
$serverPath = "C:\Users\lenovo\Desktop\怀旧游戏\server.js"

Write-Host "=== Launcher Backend Monitor ===" -ForegroundColor Cyan
Write-Host ""

# Start server in background
Write-Host "[*] Starting server..." -ForegroundColor Yellow
Start-Process -FilePath "node" -ArgumentList $serverPath -WindowStyle Hidden -PassThru | Out-Null
Start-Sleep -Seconds 3

Write-Host "[*] Server started" -ForegroundColor Green
Write-Host ""
Write-Host "Monitoring backend (every 5s)" -ForegroundColor White
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Monitor loop
while ($true) {
    $ts = Get-Date -Format "HH:mm:ss"
    try {
        $r = Invoke-WebRequest -Uri $url -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        Write-Host "[$ts] OK - Status: $($r.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "[$ts] FAIL - Cannot connect" -ForegroundColor Red
    }
    Start-Sleep -Seconds 5
}
