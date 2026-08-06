$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# Keep Spanish text readable in Windows Terminal and VS Code.
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = $Utf8NoBom
[Console]::InputEncoding = $Utf8NoBom
$OutputEncoding = $Utf8NoBom
if (Test-Path variable:PSNativeCommandUseErrorActionPreference) {
  $PSNativeCommandUseErrorActionPreference = $false
}

$Root = Split-Path -Parent $PSScriptRoot
$ReleaseDir = Join-Path $Root "release"
$LogFile = Join-Path $ReleaseDir "BUILD_LOG.txt"
$ErrorFile = Join-Path $ReleaseDir "BUILD_ERROR.txt"
$Version = "0.4.26"

New-Item -ItemType Directory -Force -Path $ReleaseDir | Out-Null
Remove-Item $LogFile, $ErrorFile -Force -ErrorAction SilentlyContinue
Set-Location $Root

function Write-Step([string]$Text) {
  Write-Host $Text -ForegroundColor Cyan
  Add-Content -Path $LogFile -Value $Text -Encoding UTF8
}

function Assert-ProjectFile([string]$RelativePath) {
  $Path = Join-Path $Root $RelativePath
  if (-not (Test-Path $Path)) {
    throw "Falta un archivo obligatorio del proyecto completo: $RelativePath"
  }
}

function Invoke-LoggedProcess {
  param(
    [Parameter(Mandatory = $true)][string]$FilePath,
    [string[]]$Arguments = @(),
    [string]$WorkingDirectory = $Root
  )

  # PyInstaller writes normal INFO messages to stderr. Windows PowerShell turns
  # those lines into NativeCommandError records. Capture and merge both streams,
  # then decide success solely from the real native exit code.
  $previousPreference = $ErrorActionPreference
  $previousLocation = Get-Location
  try {
    $ErrorActionPreference = "Continue"
    Set-Location $WorkingDirectory
    $nativeOutput = & $FilePath @Arguments 2>&1
    $exitCode = $LASTEXITCODE
  } finally {
    Set-Location $previousLocation
    $ErrorActionPreference = $previousPreference
  }

  foreach ($line in $nativeOutput) {
    $text = [string]$line
    Write-Host $text
    Add-Content -Path $LogFile -Value $text -Encoding UTF8
  }

  if ($exitCode -ne 0) {
    $display = $FilePath + " " + ($Arguments -join " ")
    throw "El proceso terminó con el código ${exitCode}: $display"
  }
}

try {
  Write-Step "Chibi Notes $Version - Generador de EXE para Windows"
  Write-Step "Proyecto: $Root"

  foreach ($required in @(
    "package.json",
    "src-tauri\Cargo.toml",
    "src-tauri\tauri.conf.json",
    "backend\main.py",
    "backend\requirements.txt",
    "backend\build_sidecar.py",
    "scripts\SETUP_WINDOWS.ps1",
    "public\assets"
  )) {
    Assert-ProjectFile $required
  }

  Write-Step "[1/4] Preparando dependencias, modelos Vosk, sidecar Python e instalador Tauri..."
  $PowerShell = (Get-Command "powershell.exe" -ErrorAction Stop).Source
  $SetupScript = Join-Path $PSScriptRoot "SETUP_WINDOWS.ps1"
  Invoke-LoggedProcess `
    -FilePath $PowerShell `
    -Arguments @(
      "-NoLogo",
      "-NoProfile",
      "-ExecutionPolicy", "Bypass",
      "-File", $SetupScript,
      "-BuildOnly"
    )

  Write-Step "[2/4] Localizando el instalador NSIS..."
  $BundleDir = Join-Path $Root "src-tauri\target\release\bundle\nsis"
  $Installer = Get-ChildItem -Path $BundleDir -Filter "*.exe" -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
  if (-not $Installer) {
    # Builds with an explicit target keep artifacts below target/<triple>/release.
    $Installer = Get-ChildItem -Path (Join-Path $Root "src-tauri\target") -Filter "*.exe" -File -Recurse -ErrorAction SilentlyContinue |
      Where-Object { $_.FullName -match "bundle[\\/]nsis" } |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 1
  }
  if (-not $Installer) {
    throw "Tauri terminó sin generar un instalador NSIS .exe. Revisa $LogFile"
  }

  Write-Step "[3/4] Copiando el instalador final..."
  $OutputInstaller = Join-Path $ReleaseDir "Chibi-Notes-v$Version-Setup-x64.exe"
  Copy-Item $Installer.FullName $OutputInstaller -Force

  $Hash = (Get-FileHash -Algorithm SHA256 -Path $OutputInstaller).Hash
  $HashFile = Join-Path $ReleaseDir "Chibi-Notes-v$Version-SHA256.txt"
  "${Hash}  Chibi-Notes-v$Version-Setup-x64.exe" | Set-Content -Path $HashFile -Encoding ASCII

  $Manifest = @"
Chibi Notes v$Version
=====================

Instalador: $OutputInstaller
SHA-256:    $Hash
Generado:   $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Arquitectura: Windows x64
Formato: instalador NSIS (.exe)

El instalador incluye la aplicación Tauri, el sidecar Python/Vosk y los recursos de Chibi Notes.
Windows puede mostrar SmartScreen porque el archivo no posee un certificado comercial de firma de código.
"@
  $Manifest | Set-Content -Path (Join-Path $ReleaseDir "BUILD_RESULT.txt") -Encoding UTF8

  Write-Step "[4/4] Compilación terminada correctamente."
  Write-Host ""
  Write-Host "Instalador:" -ForegroundColor Green
  Write-Host $OutputInstaller -ForegroundColor White
  Write-Host "SHA-256: $Hash" -ForegroundColor DarkGray
  exit 0
} catch {
  $message = $_ | Out-String
  $message | Set-Content -Path $ErrorFile -Encoding UTF8
  Add-Content -Path $LogFile -Value $message -Encoding UTF8
  Write-Host $message -ForegroundColor Red
  exit 1
}
