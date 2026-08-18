# 使用 Capacitor 构建 APK 的脚本
# Capacitor 是 Cordova 的现代替代品，更易于使用

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  经典怀旧游戏 - Capacitor 构建" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 设置项目名称
$projectName = "fc-mobile"
$appName = "经典怀旧游戏"
$bundleId = "com.classicfc.games"

# 检查 Node.js
Write-Host "[1/6] 检查 Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "  ✓ Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ 需要安装 Node.js" -ForegroundColor Red
    Write-Host "    下载地址: https://nodejs.org/" -ForegroundColor Cyan
    exit 1
}

# 创建项目目录
Write-Host "[2/6] 创建项目..." -ForegroundColor Yellow
if (Test-Path $projectName) {
    Remove-Item -Recurse -Force $projectName
}
New-Item -ItemType Directory -Path $projectName | Set-Location

# 初始化 npm 项目
npm init -y | Out-Null

# 安装 Capacitor
Write-Host "[3/6] 安装 Capacitor..." -ForegroundColor Yellow
npm install @capacitor/core @capacitor/cli @capacitor/android | Out-Null

# 复制 Web 文件
Write-Host "[4/6] 复制 Web 文件..." -ForegroundColor Yellow
Copy-Item -Path "..\app\*" -Destination "www\" -Recurse -Force

# 初始化 Capacitor
Write-Host "[5/6] 初始化 Capacitor..." -ForegroundColor Yellow
npx cap init "$appName" "$bundleId" --web-dir www

# 添加 Android 平台
Write-Host "[6/6] 添加 Android 平台..." -ForegroundColor Yellow
npx cap add android

# 同步文件
npx cap sync android

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "  构建准备完成！" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "下一步操作：" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. 安装 Android Studio" -ForegroundColor White
Write-Host "     下载: https://developer.android.com/studio" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. 打开 Android 项目" -ForegroundColor White
Write-Host "     目录: $projectName\android" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. 在 Android Studio 中构建 APK" -ForegroundColor White
Write-Host "     Build -> Build Bundle(s) / APK(s) -> Build APK(s)" -ForegroundColor Gray
Write-Host ""
Write-Host "  或者使用命令行构建:" -ForegroundColor White
Write-Host "     cd $projectName\android" -ForegroundColor Gray
Write-Host "     .\gradlew assembleDebug" -ForegroundColor Gray
Write-Host ""
Write-Host "APK 输出位置:" -ForegroundColor Yellow
Write-Host "  $projectName\android\app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor White
Write-Host ""
