$ErrorActionPreference = 'Stop'

$projectDir = "c:\Users\Viver\Desktop\projecto iphone\OpsDeck.Mobile"
$sdkBuildTools = "C:\Users\Viver\AppData\Local\Android\Sdk\build-tools\android-14"
$androidJar = "C:\Users\Viver\AppData\Local\Android\Sdk\platforms\android-34\android.jar"
$jdkBin = "C:\Program Files\Java\jdk-26.0.1\bin"
$keystore = "c:\Users\Viver\Desktop\projecto iphone\assets\opsdeck.keystore"

Write-Host "--- 1. Preparing directories ---"
$binDir = Join-Path $projectDir "bin"
$resDir = Join-Path $projectDir "res"
$manifest = Join-Path $projectDir "AndroidManifest.xml"

if (Test-Path $binDir) { Remove-Item -Recurse -Force $binDir }
New-Item -ItemType Directory -Force -Path $binDir | Out-Null

Write-Host "--- 2. Compiling Native Java ---"
$srcJava = Get-ChildItem -Recurse -Filter "*.java" (Join-Path $projectDir "src") | ForEach-Object { $_.FullName }
$javac = Join-Path $jdkBin "javac.exe"
& $javac -cp $androidJar -source 8 -target 8 -d $binDir $srcJava
if ($LASTEXITCODE -ne 0) { throw "javac failed with exit code $LASTEXITCODE" }
Write-Host "Java compilation succeeded."

Write-Host "--- 3. Running D8 Dexer ---"
$d8 = Join-Path $sdkBuildTools "d8.bat"
$classes = Get-ChildItem -Recurse -Filter "*.class" $binDir | ForEach-Object { $_.FullName }
& $d8 --output $binDir --lib $androidJar $classes
if ($LASTEXITCODE -ne 0) { throw "d8 failed with exit code $LASTEXITCODE" }
Write-Host "classes.dex generated."

Write-Host "--- 4. Packaging APK with AAPT ---"
$aapt = Join-Path $sdkBuildTools "aapt.exe"
$unalignedApk = Join-Path $projectDir "unaligned.apk"
if (Test-Path $unalignedApk) { Remove-Item -Force $unalignedApk }

& $aapt package -f -M $manifest -I $androidJar -S $resDir -F $unalignedApk
if ($LASTEXITCODE -ne 0) { throw "aapt package failed with exit code $LASTEXITCODE" }

Push-Location $binDir
$jar = Join-Path $jdkBin "jar.exe"
& $jar uf0 $unalignedApk "classes.dex"
Pop-Location
Write-Host "Base APK packaged with classes.dex."

Write-Host "--- 5. Zipalign (4-byte alignment) ---"
$zipalign = Join-Path $sdkBuildTools "zipalign.exe"
$alignedApk = Join-Path $projectDir "aligned.apk"
if (Test-Path $alignedApk) { Remove-Item -Force $alignedApk }
& $zipalign -p -f 4 $unalignedApk $alignedApk
if ($LASTEXITCODE -ne 0) { throw "zipalign failed with exit code $LASTEXITCODE" }

Write-Host "--- 6. Signing APK with apksigner (v2 & v3) ---"
$apksignerJar = Join-Path $sdkBuildTools "lib\apksigner.jar"
$java = Join-Path $jdkBin "java.exe"
$finalApk = Join-Path $projectDir "OpsDeck-Mobile.apk"
$desktopApk = "c:\Users\Viver\Desktop\OpsDeck-Mobile.apk"

& $java -jar $apksignerJar sign --ks $keystore --ks-pass pass:opsdeck2026 --key-pass pass:opsdeck2026 --ks-key-alias opsdeck --out $finalApk $alignedApk
if ($LASTEXITCODE -ne 0) { throw "apksigner failed with exit code $LASTEXITCODE" }

Copy-Item -Force $finalApk $desktopApk
Copy-Item -Force $finalApk "c:\Users\Viver\Desktop\projecto iphone\OpsDeck.Desktop\OpsDeck-Mobile.apk"

Write-Host "--- 7. Verifying APK ---"
& $java -jar $apksignerJar verify --verbose $finalApk
Write-Host "SUCCESS! Native Android APK created: $finalApk ($((Get-Item $finalApk).Length) bytes)"
