# 构建 APK 脚本
# 本脚本将帮助您将 Web 应用打包成 Android APK

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "   经典怀旧游戏 - APK 构建工具" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Node.js
Write-Host "[1/5] 检查 Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "  ✓ Node.js 已安装: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ 未找到 Node.js，请先安装 Node.js" -ForegroundColor Red
    exit 1
}

# 检查 Java
Write-Host "[2/5] 检查 Java..." -ForegroundColor Yellow
try {
    $javaVersion = java -version 2>&1 | Select-Object -First 1
    Write-Host "  ✓ Java 已安装: $javaVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ 未找到 Java，请先安装 JDK" -ForegroundColor Red
    exit 1
}

# 安装 Cordova
Write-Host "[3/5] 安装 Cordova..." -ForegroundColor Yellow
npm install -g cordova

# 创建 Cordova 项目
Write-Host "[4/5] 创建 Cordova 项目..." -ForegroundColor Yellow
cordova create fc-mobile com.classicfc.games "经典怀旧游戏"

# 复制 Web 文件
Write-Host "[5/5] 复制文件..." -ForegroundColor Yellow
Copy-Item -Path ".\app\*" -Destination ".\fc-mobile\www\" -Recurse -Force

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "   准备完成！" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "接下来请执行以下命令来构建 APK：" -ForegroundColor Cyan
Write-Host ""
Write-Host "  cd fc-mobile" -ForegroundColor White
Write-Host "  cordova platform add android" -ForegroundColor White
Write-Host "  cordova build android" -ForegroundColor White
Write-Host ""
Write-Host "构建完成后，APK 文件位于：" -ForegroundColor Yellow
Write-Host "  fc-mobile\platforms\android\app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor White
Write-Host ""
Write-Host "注意：需要安装 Android SDK 才能构建 APK" -ForegroundColor Red
Write-Host "推荐安装 Android Studio: https://developer.android.com/studio" -ForegroundColor Cyan
