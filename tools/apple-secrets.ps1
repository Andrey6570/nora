# Nora: подготовка секретов Apple для GitHub Actions. Запуск: powershell -ExecutionPolicy Bypass -File apple-secrets.ps1
$ErrorActionPreference = "Stop"
$ssl = "C:\Program Files\Git\usr\bin\openssl.exe"
if (!(Test-Path $ssl)) { throw "Установите Git for Windows (git-scm.com): в нём есть openssl." }
$dir = "$HOME\nora-apple"; New-Item -ItemType Directory -Force $dir | Out-Null; Set-Location $dir

if (!(Test-Path ios.key)) {
  & $ssl genrsa -out ios.key 2048
  & $ssl req -new -key ios.key -out ios.csr -subj "/emailAddress=megavolt.ag@gmail.com/CN=Andrey/C=CY"
}
Write-Host "`nШАГ 1. На developer.apple.com -> Certificates -> + -> Apple Distribution загрузите файл:`n  $dir\ios.csr`nСкачайте distribution.cer (или distribution*.cer) в эту же папку."
Write-Host "ШАГ 2. Profiles -> + -> App Store Connect -> App ID com.andrey6570.nora -> этот сертификат -> скачайте .mobileprovision в эту же папку."
Write-Host "ШАГ 3. Firebase -> Project settings -> Add app iOS (com.andrey6570.nora) -> скачайте GoogleService-Info.plist в эту же папку."
Read-Host "`nКогда три файла лежат в папке, нажмите Enter"

$cer = Get-ChildItem *.cer | Select-Object -First 1
$prov = Get-ChildItem *.mobileprovision | Select-Object -First 1
if (!$cer -or !$prov -or !(Test-Path GoogleService-Info.plist)) { throw "Не хватает файла: нужны .cer, .mobileprovision и GoogleService-Info.plist" }

$pw = -join ((48..57 + 65..90 + 97..122) | Get-Random -Count 20 | ForEach-Object { [char]$_ })
& $ssl x509 -inform DER -in $cer.FullName -out dist.pem
& $ssl pkcs12 -export -legacy -inkey ios.key -in dist.pem -out dist.p12 -password "pass:$pw"
if ($LASTEXITCODE -ne 0) { & $ssl pkcs12 -export -inkey ios.key -in dist.pem -out dist.p12 -password "pass:$pw" }

$b64 = { param($f) [Convert]::ToBase64String([IO.File]::ReadAllBytes($f)) }
Set-Content -NoNewline IOS_CERT_P12_B64.txt (& $b64 "$dir\dist.p12")
Set-Content -NoNewline IOS_CERT_PASSWORD.txt $pw
Set-Content -NoNewline IOS_PROFILE_B64.txt (& $b64 $prov.FullName)
Set-Content -NoNewline IOS_GOOGLE_SERVICE_INFO_B64.txt (& $b64 "$dir\GoogleService-Info.plist")
Write-Host "`nГотово. В папке $dir четыре файла .txt: имя файла = имя секрета, содержимое = значение."
Write-Host "Добавьте их в GitHub: репозиторий nora -> Settings -> Secrets and variables -> Actions -> New repository secret."
Invoke-Item $dir
