# 简单的本地测试服务器
# 使用方法: .\serve.ps1

$port = 8080
$path = ".\app"

Write-Host "启动本地服务器..." -ForegroundColor Green
Write-Host "访问地址: http://localhost:$port" -ForegroundColor Cyan
Write-Host "按 Ctrl+C 停止服务器" -ForegroundColor Yellow
Write-Host ""

# 使用 Python 启动服务器
if (Get-Command python -ErrorAction SilentlyContinue) {
    Set-Location $path
    python -m http.server $port
} elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
    Set-Location $path
    python3 -m http.server $port
} else {
    Write-Host "未找到 Python，请安装 Python 或使用其他 HTTP 服务器" -ForegroundColor Red
    Write-Host "例如: npx serve $path" -ForegroundColor Yellow
}
