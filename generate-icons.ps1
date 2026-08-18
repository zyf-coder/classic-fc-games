# 生成图标脚本

Write-Host "生成应用图标..." -ForegroundColor Cyan

# 创建图标目录
New-Item -ItemType Directory -Path "app\icons" -Force | Out-Null
New-Item -ItemType Directory -Path "app\screenshots" -Force | Out-Null

# 创建简单的 SVG 图标（用于 PWA）
$svgIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1"/>
      <stop offset="100%" style="stop-color:#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="80" fill="url(#bg)"/>
  <text x="256" y="300" font-family="Arial, sans-serif" font-size="200" font-weight="bold" fill="white" text-anchor="middle">🎮</text>
</svg>'

$svgIcon | Out-File -FilePath "app\icons\icon.svg" -Encoding UTF8

Write-Host "图标已生成: app\icons\icon.svg" -ForegroundColor Green
Write-Host ""
Write-Host "要生成 PNG 图标，请使用在线工具转换 SVG:" -ForegroundColor Yellow
Write-Host "  https://convertio.co/svg-png/" -ForegroundColor Cyan
Write-Host "  https://cloudconvert.com/svg-to-png" -ForegroundColor Cyan
Write-Host ""
Write-Host "需要的尺寸: 72, 96, 128, 144, 152, 192, 384, 512" -ForegroundColor White
