$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$keystore = Join-Path $PSScriptRoot "keystore.jks"
$keystorePass = if ($env:ANDROID_KEYSTORE_PASSWORD) { $env:ANDROID_KEYSTORE_PASSWORD } else { "password123" }
$keyAlias = "key0"
$keyPass = if ($env:ANDROID_KEY_PASSWORD) { $env:ANDROID_KEY_PASSWORD } else { $keystorePass }

npm run build
npx cap sync android

Set-Location (Join-Path $PSScriptRoot "android")
.\gradlew bundleRelease `
  "-Pandroid.injected.signing.store.file=$keystore" `
  "-Pandroid.injected.signing.store.password=$keystorePass" `
  "-Pandroid.injected.signing.key.alias=$keyAlias" `
  "-Pandroid.injected.signing.key.password=$keyPass"

Set-Location $PSScriptRoot
Write-Host "✅ AAB完成: android\app\build\outputs\bundle\release\app-release.aab"
