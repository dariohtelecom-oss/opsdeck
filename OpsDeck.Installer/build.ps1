$ErrorActionPreference = 'Stop'

$installerDir = "c:\Users\Viver\Desktop\projecto iphone\OpsDeck.Installer"
$desktopAppDir = "c:\Users\Viver\Desktop\projecto iphone\OpsDeck.Desktop"
$mobileAppDir = "c:\Users\Viver\Desktop\projecto iphone\OpsDeck.Mobile"
$assetsDir = "c:\Users\Viver\Desktop\projecto iphone\assets"
$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"

Write-Host "--- 1. Verifying source binaries ---"
$exeSrc = Join-Path $desktopAppDir "OpsDeck.exe"
$apkSrc = Join-Path $mobileAppDir "OpsDeck-Mobile.apk"
$iconSrc = Join-Path $assetsDir "icon.ico"

if (-not (Test-Path $exeSrc)) { throw "OpsDeck.exe not found at $exeSrc. Run desktop build first." }
if (-not (Test-Path $apkSrc)) { throw "OpsDeck-Mobile.apk not found at $apkSrc. Run mobile build first." }

Write-Host "--- 2. Compiling Windows Installer (Setup.exe) ---"
$setupExe = Join-Path $installerDir "OpsDeck-Setup.exe"
$srcCs = Join-Path $installerDir "SetupProgram.cs"

& $csc /target:winexe /optimize+ /win32icon:$iconSrc /out:$setupExe /r:System.dll /r:System.Windows.Forms.dll /r:System.Drawing.dll /r:System.Core.dll $srcCs
if ($LASTEXITCODE -ne 0) { throw "Installer compilation failed" }

Write-Host "--- 3. Packaging payload for installer directory ---"
Copy-Item -Force $exeSrc (Join-Path $installerDir "OpsDeck.exe")
Copy-Item -Force $apkSrc (Join-Path $installerDir "OpsDeck-Mobile.apk")
Copy-Item -Force $iconSrc (Join-Path $installerDir "icon.ico")

$desktopInstaller = "C:\Users\Viver\Desktop\OpsDeck-Installer-v2.5.exe"
Copy-Item -Force $setupExe $desktopInstaller
Copy-Item -Force $exeSrc "C:\Users\Viver\Desktop\OpsDeck.exe"
Copy-Item -Force $apkSrc "C:\Users\Viver\Desktop\OpsDeck-Mobile.apk"
Copy-Item -Force $iconSrc "C:\Users\Viver\Desktop\icon.ico"

Unblock-File $desktopInstaller -ErrorAction SilentlyContinue
Unblock-File (Join-Path $installerDir "OpsDeck-Setup.exe") -ErrorAction SilentlyContinue

Write-Host "SUCCESS! Windows Installer ready at: $desktopInstaller ($((Get-Item $desktopInstaller).Length) bytes)"
