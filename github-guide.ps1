# GitHub 上传指南

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  上传到 GitHub" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "请按以下步骤操作：" -ForegroundColor Yellow
Write-Host ""

Write-Host "第一步：创建 GitHub 仓库" -ForegroundColor Green
Write-Host "  1. 打开浏览器访问: https://github.com/new" -ForegroundColor White
Write-Host "  2. 仓库名称填写: classic-fc-games" -ForegroundColor White
Write-Host "  3. 选择 Public 或 Private" -ForegroundColor White
Write-Host "  4. 不要勾选任何初始化选项" -ForegroundColor White
Write-Host "  5. 点击 Create repository" -ForegroundColor White
Write-Host ""

Write-Host "第二步：关联并推送" -ForegroundColor Green
Write-Host "  复制以下命令在终端执行：" -ForegroundColor White
Write-Host ""
Write-Host '  git remote add origin https://github.com/zyf/classic-fc-games.git' -ForegroundColor Cyan
Write-Host '  git branch -M main' -ForegroundColor Cyan
Write-Host '  git push -u origin main' -ForegroundColor Cyan
Write-Host ""

Write-Host "注意：请将 'zyf' 替换为你的 GitHub 用户名" -ForegroundColor Yellow
Write-Host ""
