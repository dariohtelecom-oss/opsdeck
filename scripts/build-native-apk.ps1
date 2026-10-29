$ErrorActionPreference = 'Stop'

$workDir = "C:\Users\Viver\.gemini\antigravity\brain\bd76ec50-23fe-479b-b6b8-3528c29badbf\scratch\native-apk"
$distDir = "c:\Users\Viver\Desktop\projecto iphone\dist"
$sdkBuildTools = "C:\Users\Viver\AppData\Local\Android\Sdk\build-tools\android-14"
$androidJar = "C:\Users\Viver\AppData\Local\Android\Sdk\platforms\android-34\android.jar"
$jdkBin = "C:\Program Files\Java\jdk-26.0.1\bin"
$keystore = "c:\Users\Viver\Desktop\projecto iphone\scripts\opsdeck.keystore"

Write-Host "--- 1. Preparing assets and folders ---"
$assetsDir = Join-Path $workDir "assets"
$binDir = Join-Path $workDir "bin"
$resDir = Join-Path $workDir "res"

if (Test-Path $assetsDir) { Remove-Item -Recurse -Force $assetsDir }
if (Test-Path $binDir) { Remove-Item -Recurse -Force $binDir }
New-Item -ItemType Directory -Force -Path $assetsDir | Out-Null
New-Item -ItemType Directory -Force -Path $binDir | Out-Null
New-Item -ItemType Directory -Force -Path $resDir | Out-Null

Copy-Item -Recurse -Force "$distDir\*" $assetsDir
Write-Host "Assets copied. Total files: $((Get-ChildItem -Recurse $assetsDir).Count)"

Write-Host "--- 2. Compiling Java Source ---"
$srcJava = Get-ChildItem -Recurse -Filter "*.java" (Join-Path $workDir "src") | ForEach-Object { $_.FullName }
$javac = Join-Path $jdkBin "javac.exe"
& $javac -cp $androidJar -source 8 -target 8 -d $binDir $srcJava
if ($LASTEXITCODE -ne 0) { throw "javac failed with exit code $LASTEXITCODE" }
Write-Host "Java compilation succeeded."

Write-Host "--- 3. Running D8 Dexer ---"
$d8 = Join-Path $sdkBuildTools "d8.bat"
$classes = Get-ChildItem -Recurse -Filter "*.class" $binDir | ForEach-Object { $_.FullName }
& $d8 --output $binDir --lib $androidJar $classes
if ($LASTEXITCODE -ne 0) { throw "d8 failed with exit code $LASTEXITCODE" }
Write-Host "D8 dexer succeeded. classes.dex generated."

Write-Host "--- 4. Packaging APK with AAPT ---"
$aapt = Join-Path $sdkBuildTools "aapt.exe"
$manifest = Join-Path $workDir "AndroidManifest.xml"
$unalignedApk = Join-Path $workDir "unaligned.apk"
if (Test-Path $unalignedApk) { Remove-Item -Force $unalignedApk }

& $aapt package -f -M $manifest -I $androidJar -S $resDir -A $assetsDir -F $unalignedApk
if ($LASTEXITCODE -ne 0) { throw "aapt package failed with exit code $LASTEXITCODE" }
Write-Host "Base APK packaged."

Write-Host "--- 5. Adding classes.dex to APK ---"
Push-Location $binDir
$jar = Join-Path $jdkBin "jar.exe"
& $jar uf0 $unalignedApk "classes.dex"
Pop-Location
Write-Host "classes.dex added to APK."

Write-Host "--- 6. Zipalign APK (4-byte alignment) ---"
$zipalign = Join-Path $sdkBuildTools "zipalign.exe"
$alignedApk = Join-Path $workDir "aligned.apk"
if (Test-Path $alignedApk) { Remove-Item -Force $alignedApk }
& $zipalign -p -f 4 $unalignedApk $alignedApk
if ($LASTEXITCODE -ne 0) { throw "zipalign failed with exit code $LASTEXITCODE" }
Write-Host "Zipalign completed."

Write-Host "--- 7. Signing APK with apksigner ---"
$apksignerJar = Join-Path $sdkBuildTools "lib\apksigner.jar"
$java = Join-Path $jdkBin "java.exe"
$finalApk = "c:\Users\Viver\Desktop\projecto iphone\OpsDeck-Android-ES.apk"
$fallbackApk = "c:\Users\Viver\Desktop\projecto iphone\WinDock-android-debug.apk"

& $java -jar $apksignerJar sign --ks $keystore --ks-pass pass:opsdeck2026 --key-pass pass:opsdeck2026 --ks-key-alias opsdeck --out $finalApk $alignedApk
if ($LASTEXITCODE -ne 0) { throw "apksigner failed with exit code $LASTEXITCODE" }

Copy-Item -Force $finalApk $fallbackApk
Write-Host "--- 8. Verifying APK Signature ---"
& $java -jar $apksignerJar verify --verbose $finalApk
Write-Host "DONE! Final APK created at: $finalApk ($((Get-Item $finalApk).Length) bytes)"
