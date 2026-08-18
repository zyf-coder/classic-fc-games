# 使用 .NET 生成简单图标
# 需要 Windows PowerShell

Add-Type -AssemblyName System.Drawing

function Create-Icon {
    param(
        [int]$Size,
        [string]$OutputPath
    )
    
    $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    
    # 背景渐变
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.Point(0, 0)),
        (New-Object System.Drawing.Point($Size, $Size)),
        [System.Drawing.Color]::FromArgb(99, 102, 241),  # #6366f1
        [System.Drawing.Color]::FromArgb(139, 92, 246)   # #8b5cf6
    )
    
    # 绘制圆角矩形背景
    $radius = [int]($Size * 0.15)
    $rect = New-Object System.Drawing.Rectangle(0, 0, $Size, $Size)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc($rect.X, $rect.Y, $radius * 2, $radius * 2, 180, 90)
    $path.AddArc($rect.Width - $radius * 2, $rect.Y, $radius * 2, $radius * 2, 270, 90)
    $path.AddArc($rect.Width - $radius * 2, $rect.Height - $radius * 2, $radius * 2, $radius * 2, 0, 90)
    $path.AddArc($rect.X, $rect.Height - $radius * 2, $radius * 2, $radius * 2, 90, 90)
    $path.CloseFigure()
    
    $graphics.FillPath($brush, $path)
    
    # 绘制文字 "FC"
    $fontSize = [int]($Size * 0.35)
    $font = New-Object System.Drawing.Font("Arial", $fontSize, [System.Drawing.FontStyle]::Bold)
    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $textSize = $graphics.MeasureString("FC", $font)
    $x = ($Size - $textSize.Width) / 2
    $y = ($Size - $textSize.Height) / 2
    $graphics.DrawString("FC", $font, $textBrush, $x, $y)
    
    # 保存
    $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    # 清理
    $graphics.Dispose()
    $bitmap.Dispose()
    $brush.Dispose()
    $textBrush.Dispose()
    $font.Dispose()
    
    Write-Host "  已生成: $OutputPath ($Size x $Size)" -ForegroundColor Green
}

Write-Host "生成应用图标..." -ForegroundColor Cyan
Write-Host ""

# 创建图标目录
New-Item -ItemType Directory -Path "app\icons" -Force | Out-Null

# 生成不同尺寸的图标
$sizes = @(72, 96, 128, 144, 152, 192, 384, 512)
foreach ($size in $sizes) {
    Create-Icon -Size $size -OutputPath "app\icons\icon-${size}x${size}.png"
}

Write-Host ""
Write-Host "所有图标已生成完成！" -ForegroundColor Green
