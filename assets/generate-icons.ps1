Add-Type -AssemblyName System.Drawing

$size = 256
$bmp = New-Object System.Drawing.Bitmap $size, $size
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$g.Clear([System.Drawing.Color]::Transparent)

# Deep slate rounded background
$bg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(10, 15, 29))
$g.FillEllipse($bg, 6, 6, 244, 244)

# Vibrant Cyan rim
$penCyan = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(34, 211, 238)), 7
$g.DrawEllipse($penCyan, 12, 12, 232, 232)

# Grid deck buttons
$cyanBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(34, 211, 238))
$slateBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(30, 41, 59))
$whiteBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(248, 250, 252))

# Row 1
$g.FillRectangle($cyanBrush, 58, 62, 40, 40)
$g.FillRectangle($slateBrush, 108, 62, 40, 40)
$g.FillRectangle($cyanBrush, 158, 62, 40, 40)

# Row 2
$g.FillRectangle($slateBrush, 58, 112, 40, 40)
$g.FillRectangle($whiteBrush, 108, 112, 40, 40)
$g.FillRectangle($slateBrush, 158, 112, 40, 40)

# Slider bar
$g.FillRectangle($cyanBrush, 58, 168, 140, 24)
$knob = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 255))
$g.FillEllipse($knob, 118, 160, 36, 36)

$targetDir = "c:\Users\Viver\Desktop\projecto iphone\assets"
$pngPath = Join-Path $targetDir "icon.png"
$icoPath = Join-Path $targetDir "icon.ico"

$bmp.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)

$hIcon = $bmp.GetHicon()
$ico = [System.Drawing.Icon]::FromHandle($hIcon)
$fs = New-Object System.IO.FileStream $icoPath, ([System.IO.FileMode]::Create)
$ico.Save($fs)
$fs.Close()

Write-Host "Icons generated: $pngPath and $icoPath"
