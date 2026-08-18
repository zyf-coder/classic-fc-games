# 初始化 Git 仓库并准备上传到 GitHub

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  初始化 Git 仓库" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Git
Write-Host "[1/4] 检查 Git..." -ForegroundColor Yellow
try {
    $gitVersion = git --version
    Write-Host "  ✓ $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ 需要安装 Git" -ForegroundColor Red
    Write-Host "    下载地址: https://git-scm.com/" -ForegroundColor Cyan
    exit 1
}

# 初始化仓库
Write-Host "[2/4] 初始化 Git 仓库..." -ForegroundColor Yellow
git init

# 添加文件
Write-Host "[3/4] 添加文件..." -ForegroundColor Yellow
git add .
git status

# 创建初始提交
Write-Host "[4/4] 创建初始提交..." -ForegroundColor Yellow
git commit -m "初始提交: 经典怀旧游戏 FC/NES 模拟器

- 包含 20+ 款经典 FC 游戏
- 触屏优化的虚拟摇杆控制
- 横屏全屏适配
- PWA 离线支持
- 支持打包为 Android APK"

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "  Git 仓库初始化完成！" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "接下来推送到 GitHub：" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. 在 GitHub 上创建新仓库" -ForegroundColor White
Write-Host "     访问: https://github.com/new" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. 关联远程仓库:" -ForegroundColor White
Write-Host "     git remote add origin https://github.com/你的用户名/classic-fc-games.git" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. 推送代码:" -ForegroundColor White
Write-Host "     git push -u origin main" -ForegroundColor Gray
Write-Host ""
