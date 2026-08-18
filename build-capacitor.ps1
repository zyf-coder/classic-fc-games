$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
Write-Host '经典怀旧游戏 - Android APK 构建' -ForegroundColor Cyan
foreach ($command in @('node', 'npm', 'java')) {
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) { throw "缺少 $command。" }
}
$sdk = $env:ANDROID_SDK_ROOT
if (-not $sdk) { $sdk = $env:ANDROID_HOME }
if (-not $sdk -and (Test-Path '.android-sdk\platforms\android-35')) { $sdk = (Resolve-Path '.android-sdk').Path }
if (-not $sdk -or -not (Test-Path $sdk)) { throw '未找到 Android SDK，请设置 ANDROID_SDK_ROOT。' }
$env:ANDROID_SDK_ROOT = (Resolve-Path $sdk).Path
$env:ANDROID_HOME = $env:ANDROID_SDK_ROOT
Write-Host '[1/4] 安装依赖...' -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) { throw 'npm install 失败。' }
if (-not (Test-Path 'android')) { Write-Host '[2/4] 创建 Android 工程...' -ForegroundColor Yellow; npx cap add android } else { Write-Host '[2/4] 使用现有 Android 工程...' -ForegroundColor Yellow }
Write-Host '[3/4] 同步网页和 ROM...' -ForegroundColor Yellow
npx cap sync android
Write-Host '[4/4] 构建 APK...' -ForegroundColor Yellow
Push-Location android
try { .\gradlew.bat assembleDebug } finally { Pop-Location }
if ($LASTEXITCODE -ne 0) { throw 'Gradle 构建失败。' }
Copy-Item 'android\app\build\outputs\apk\debug\app-debug.apk' '经典怀旧游戏.apk' -Force
Write-Host "构建成功：$((Resolve-Path '经典怀旧游戏.apk').Path)" -ForegroundColor Green
