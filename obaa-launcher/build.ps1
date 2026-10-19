# OBAA Launcher - build script (aapt2 + javac + d8 + apksigner)
$ErrorActionPreference = 'Stop'
$Root      = 'C:\Users\techn\OneDrive\Documents\Default Project'
$Tools     = "$Root\tools"
$BT        = "$Tools\x-build-tools\android-9"
$PLATFORM  = "$Tools\x-platform\android-9\android.jar"
$JDK       = (Get-ChildItem "$Tools\x-jdk8" -Directory | Select-Object -First 1).FullName
$Proj      = "$Root\obaa-launcher"
$Build     = "$Proj\build"
$Ks        = "$Tools\obaa.keystore"

$env:JAVA_HOME = $JDK
$env:PATH = "$JDK\bin;$BT;$env:PATH"

Write-Host "JDK: $JDK"
Remove-Item -Recurse -Force $Build -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path "$Build\gen","$Build\classes","$Build\dex" | Out-Null

if (-not (Test-Path $Ks)) {
    Write-Host '== create keystore =='
    & "$JDK\bin\keytool.exe" -genkeypair -keystore $Ks -alias obaa -keyalg RSA -keysize 2048 -validity 10950 -storepass obaa123456 -keypass obaa123456 -dname "CN=OBAA Launcher,OU=OBAA,O=OBAA,C=IN"
    if ($LASTEXITCODE -ne 0) { exit 1 }
}

Write-Host '== aapt2 compile =='
& "$BT\aapt2.exe" compile --dir "$Proj\res" -o "$Build\res.zip"
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host '== aapt2 link =='
& "$BT\aapt2.exe" link -o "$Build\base.apk" -I $PLATFORM --manifest "$Proj\AndroidManifest.xml" --java "$Build\gen" --min-sdk-version 26 --target-sdk-version 28 "$Build\res.zip"
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host '== javac =='
$srcs = @(Get-ChildItem -Recurse -Filter *.java -Path "$Proj\java" | ForEach-Object { $_.FullName })
$srcs += @(Get-ChildItem -Recurse -Filter R.java -Path "$Build\gen" | ForEach-Object { $_.FullName })
& "$JDK\bin\javac.exe" -encoding UTF-8 -source 1.8 -target 1.8 -bootclasspath $PLATFORM -classpath $PLATFORM -d "$Build\classes" @srcs
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host '== d8 =='
$classes = @(Get-ChildItem -Recurse -Filter *.class -Path "$Build\classes" | ForEach-Object { $_.FullName })
& "$JDK\bin\java.exe" -cp "$BT\lib\d8.jar" com.android.tools.r8.D8 --release --min-api 26 --lib $PLATFORM --output "$Build\dex" @classes
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host '== add classes.dex =='
Push-Location "$Build\dex"
& "$BT\aapt.exe" add "$Build\base.apk" classes.dex
$rc = $LASTEXITCODE
Pop-Location
if ($rc -ne 0) { exit 1 }

Write-Host '== zipalign =='
& "$BT\zipalign.exe" -f 4 "$Build\base.apk" "$Build\aligned.apk"
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host '== sign =='
& "$JDK\bin\java.exe" -jar "$BT\lib\apksigner.jar" sign --ks $Ks --ks-pass pass:obaa123456 --key-pass pass:obaa123456 --out "$Build\ObaaLauncher-1.1.apk" --min-sdk-version 26 "$Build\aligned.apk"
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host '== verify =='
& "$JDK\bin\java.exe" -jar "$BT\lib\apksigner.jar" verify --print-certs "$Build\ObaaLauncher-1.1.apk"
if ($LASTEXITCODE -ne 0) { exit 1 }
& "$BT\aapt.exe" dump badging "$Build\ObaaLauncher-1.1.apk" | Select-Object -First 10
Write-Host ''
Write-Host "APK: $Build\ObaaLauncher-1.1.apk"
