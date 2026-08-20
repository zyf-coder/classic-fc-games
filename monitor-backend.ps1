# launcher 后端状态监控
# 每 5 秒检查一次 localhost:8080 状态

$url = "http://localhost:8080"
$checkInterval = 5

Write-Host "🎮 经典怀旧游戏 - launcher 后端监控" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "检查地址: $url" -ForegroundColor White
Write-Host "检查间隔: ${checkInterval}秒" -ForegroundColor White
Write-Host "按 Ctrl+C 停止监控" -ForegroundColor Yellow
Write-Host ""

while ($true) {
    $timestamp = Get-Date -Format "HH:mm:ss"
    try {
        $response = Invoke-WebRequest -Uri $url -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        $status = $response.StatusCode
        Write-Host "[$timestamp] ✅ 后端正常 - 状态码: $status" -ForegroundColor Green
    } catch {
        Write-Host "[$timestamp] ❌ 连接异常 - 无法访问后端" -ForegroundColor Red
    }
    Start-Sleep -Seconds $checkInterval
}
