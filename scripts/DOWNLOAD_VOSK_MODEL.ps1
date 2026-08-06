param(
  [ValidateSet("all","es","en")]
  [string]$Language = "all",
  [switch]$Force
)
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$Root = Split-Path -Parent $PSScriptRoot
$Models = Join-Path $Root "backend\models"
New-Item -ItemType Directory -Force -Path $Models | Out-Null

function Test-VoskModel {
  param([Parameter(Mandatory=$true)][string]$Path)
  return (Test-Path (Join-Path $Path "am\final.mdl")) -and
         (Test-Path (Join-Path $Path "conf\mfcc.conf")) -and
         ((Test-Path (Join-Path $Path "graph\HCLr.fst")) -or (Test-Path (Join-Path $Path "graph\HCLG.fst")))
}

$Requested = @()
if ($Language -eq "all" -or $Language -eq "es") {
  $Requested += @{ Name = "vosk-model-small-es-0.42"; Label = "español"; Size = "aprox. 39 MB" }
}
if ($Language -eq "all" -or $Language -eq "en") {
  $Requested += @{ Name = "vosk-model-small-en-us-0.15"; Label = "inglés"; Size = "aprox. 40 MB" }
}

foreach ($Model in $Requested) {
  $Target = Join-Path $Models $Model.Name
  if ((-not $Force) -and (Test-VoskModel $Target)) {
    Write-Host "[OK] El modelo $($Model.Label) ya está instalado y validado." -ForegroundColor Green
    continue
  }

  if (Test-Path $Target) {
    Write-Host "El modelo $($Model.Label) está incompleto o dañado. Se volverá a descargar." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $Target
  }

  $Zip = Join-Path $env:TEMP "$($Model.Name)-$([guid]::NewGuid().ToString('N')).zip"
  $Extract = Join-Path $env:TEMP "$($Model.Name)-extract-$([guid]::NewGuid().ToString('N'))"
  $Url = "https://alphacephei.com/vosk/models/$($Model.Name).zip"
  try {
    Write-Host "Descargando el modelo de Vosk en $($Model.Label) ($($Model.Size))..." -ForegroundColor Cyan
    Invoke-WebRequest -Uri $Url -OutFile $Zip -UseBasicParsing
    New-Item -ItemType Directory -Force -Path $Extract | Out-Null
    Write-Host "Descomprimiendo $($Model.Name)..." -ForegroundColor Cyan
    Expand-Archive -Path $Zip -DestinationPath $Extract -Force

    $ExtractedTarget = Join-Path $Extract $Model.Name
    if (-not (Test-VoskModel $ExtractedTarget)) {
      $Candidate = Get-ChildItem -Path $Extract -Directory -Recurse | Where-Object { Test-VoskModel $_.FullName } | Select-Object -First 1
      if ($Candidate) { $ExtractedTarget = $Candidate.FullName }
    }
    if (-not (Test-VoskModel $ExtractedTarget)) {
      throw "El archivo descargado no contiene una estructura Vosk válida."
    }

    Move-Item -Path $ExtractedTarget -Destination $Target -Force
    if (-not (Test-VoskModel $Target)) { throw "No se pudo validar el modelo instalado en $Target" }
    Write-Host "[OK] Modelo $($Model.Label) instalado y validado." -ForegroundColor Green
  } finally {
    Remove-Item $Zip -Force -ErrorAction SilentlyContinue
    Remove-Item $Extract -Recurse -Force -ErrorAction SilentlyContinue
  }
}
Write-Host "[OK] Dictado local español/inglés preparado." -ForegroundColor Green
