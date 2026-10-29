Add-Type -AssemblyName System.Drawing

$size = 256
$bmp = New-Object System.Drawing.Bitmap $size, $size
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

# Clear background
$g.Clear([System.Drawing.Color]::Transparent)

# Dark charcoal rounded rect container (#06141B)
$bgBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(6, 20, 27))
$g.FillEllipse($bgBrush, 8, 8, 240, 240)

# Cyan/Mint accent border (#14FFEC)
$pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(20, 255, 236)), 6
$g.DrawEllipse($pen, 8, 8, 240, 240)

# Draw central Operations Deck emblem
$mintBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(20, 255, 236))
$whiteBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(240, 246, 252))

# Top 3 grid buttons
$g.FillRectangle($mintBrush, 56, 60, 40, 40)
$g.FillRectangle($whiteBrush, 108, 60, 40, 40)
$g.FillRectangle($mintBrush, 160, 60, 40, 40)

# Middle 3 grid buttons
$g.FillRectangle($whiteBrush, 56, 112, 40, 40)
$g.FillRectangle($mintBrush, 108, 112, 40, 40)
$g.FillRectangle($whiteBrush, 160, 112, 40, 40)

# Bottom slider track
$g.FillRectangle($mintBrush, 56, 168, 144, 28)
$knobBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 255))
$g.FillEllipse($knobBrush, 120, 162, 40, 40)

$publicDir = "c:\Users\Viver\Desktop\projecto iphone\public"
if (-not (Test-Path $publicDir)) { New-Item -ItemType Directory -Force -Path $publicDir | Out-Null }

$pngPath = Join-Path $publicDir "icon.png"
$bmp.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)

$hIcon = $bmp.GetHicon()
$ico = [System.Drawing.Icon]::FromHandle($hIcon)
$icoPath = Join-Path $publicDir "icon.ico"
$fs = New-Object System.IO.FileStream $icoPath, ([System.IO.FileMode]::Create)
$ico.Save($fs)
$fs.Close()

Write-Host "Icons generated at: $pngPath and $icoPath"
