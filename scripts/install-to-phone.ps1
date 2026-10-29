$ErrorActionPreference = "Continue"
$adb = "C:\Users\Viver\AppData\Local\Android\Sdk\platform-tools\adb.exe"
$apk = "c:\Users\Viver\Desktop\projecto iphone\WinDock-android-debug.apk"
$env:ADB_USB_LEGACY = "1"
$env:ADB_LIBUSB = "0"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  OpsDeck v2.5 - Instalador USB Directo (Infinix X6852)   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

& $adb start-server | Out-Null

for ($i = 1; $i -le 120; $i++) {
    $out = & $adb devices -l 2>&1 | Out-String
    if ($out -match "(\S+)\s+device\b") {
        $serial = $Matches[1]
        Write-Host "[OK] Dispositivo autorizado detectado: $serial" -ForegroundColor Green

        Write-Host "[1/3] Configurando Tunel USB 0ms (adb reverse tcp:5173 / tcp:8620)..." -ForegroundColor Yellow
        & $adb -s $serial reverse tcp:5173 tcp:5173
        & $adb -s $serial reverse tcp:8620 tcp:8620

        Write-Host "[2/3] Instalando APK en $serial..." -ForegroundColor Yellow
        & $adb -s $serial install -r $apk

        Write-Host "[3/3] Abriendo OpsDeck v2.5 en el telefono..." -ForegroundColor Yellow
        & $adb -s $serial shell am start -a android.intent.action.VIEW -d "http://localhost:5173"
        Write-Host "[COMPLETADO] APK instalado y OpsDeck v2.5 abierto en tu movil." -ForegroundColor Green
        exit 0
    } elseif ($out -match "(\S+)\s+unauthorized") {
        Write-Host "[$i/120] Esperando que aceptes 'Permitir depuracion por USB' en la pantalla de tu Infinix ($($Matches[1]))..." -ForegroundColor Yellow
    } else {
        Write-Host "[$i/120] Esperando conexion USB activa (cambia el modo USB del celular a 'Transferencia de archivos / MTP')..." -ForegroundColor DarkGray
    }
    Start-Sleep -Seconds 2
}
