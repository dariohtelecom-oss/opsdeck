Write-Host "=========================================================="
Write-Host "     OPSDECK ENTERPRISE v2.5 - MASTER BUILD SYSTEM        "
Write-Host "=========================================================="

Write-Host "`n>>> [1/3] Compilando OpsDeck Desktop (.NET Nativo C#)..."
Copy-Item -Force "assets\QRCoder.dll" "OpsDeck.Desktop\QRCoder.dll"
& "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe" /target:winexe /optimize+ /win32icon:"assets\icon.ico" /out:"OpsDeck.Desktop\OpsDeck.exe" /r:System.dll /r:System.Windows.Forms.dll /r:System.Drawing.dll /r:System.Core.dll /r:assets\QRCoder.dll OpsDeck.Desktop\*.cs
if ($LASTEXITCODE -ne 0) { throw "Fallo compilando Desktop" }
Write-Host "OpsDeck.Desktop compilado con exito."

Write-Host "`n>>> [2/3] Compilando OpsDeck Mobile (Android Nativo Java/SDK)..."
powershell -ExecutionPolicy Bypass -File "OpsDeck.Mobile\build.ps1"
if ($LASTEXITCODE -ne 0) { throw "Fallo compilando Mobile" }

Write-Host "`n>>> [3/3] Compilando Instalador de Windows (OpsDeck-Setup.exe)..."
powershell -ExecutionPolicy Bypass -File "OpsDeck.Installer\build.ps1"
if ($LASTEXITCODE -ne 0) { throw "Fallo compilando Instalador" }

Write-Host "`n=========================================================="
Write-Host "     COMPILACION COMPLETA - ARQUITECTURA 100% NATIVA      "
Write-Host "=========================================================="
Write-Host "Archivos generados en tu Escritorio:"
Write-Host "1. C:\Users\Viver\Desktop\OpsDeck-Installer-v2.5.exe"
Write-Host "2. C:\Users\Viver\Desktop\OpsDeck.exe"
Write-Host "3. C:\Users\Viver\Desktop\OpsDeck-Mobile.apk"
