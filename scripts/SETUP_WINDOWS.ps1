param(
  [switch]$SkipInstall,
  [switch]$BuildOnly,
  [switch]$NoPythonAutoInstall
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = $Utf8NoBom
[Console]::InputEncoding = $Utf8NoBom
$OutputEncoding = $Utf8NoBom
if (Test-Path variable:PSNativeCommandUseErrorActionPreference) {
  $PSNativeCommandUseErrorActionPreference = $false
}

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Require-Command {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$HelpText
  )

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $Name. $HelpText"
  }
}

function Invoke-External {
  param(
    [Parameter(Mandatory = $true)][string]$Command,
    [string[]]$Arguments = @()
  )

  # Windows PowerShell converts text written to stderr by native programs into
  # ErrorRecord objects. With ErrorActionPreference=Stop that can abort a valid
  # command before LASTEXITCODE is inspected. Temporarily lower the preference
  # and decide success exclusively from the native process exit code.
  $previousPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = "Continue"
    # Merge stderr into stdout inside this process. PyInstaller writes normal
    # progress information to stderr and Windows PowerShell otherwise exposes
    # it to the caller as NativeCommandError records.
    $nativeOutput = & $Command @Arguments 2>&1
    $exitCode = $LASTEXITCODE
    foreach ($line in $nativeOutput) {
      Write-Host ([string]$line)
    }
  } finally {
    $ErrorActionPreference = $previousPreference
  }

  if ($exitCode -ne 0) {
    $display = $Command + " " + ($Arguments -join " ")
    throw "Command failed with exit code ${exitCode}: $display"
  }
}

function Test-PythonRuntime {
  param(
    [Parameter(Mandatory = $true)][string]$Command,
    [string[]]$PrefixArgs = @()
  )

  $arguments = @($PrefixArgs) + @(
    "-c",
    "import sys; raise SystemExit(0 if (3, 10) <= sys.version_info[:2] < (3, 14) else 1)"
  )

  $previousPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = "SilentlyContinue"
    $null = & $Command @arguments 2>$null
    $exitCode = $LASTEXITCODE
  } catch {
    $exitCode = 1
  } finally {
    $ErrorActionPreference = $previousPreference
  }

  return ($exitCode -eq 0)
}

function Find-CompatiblePython {
  param([switch]$ReturnNull)

  $venvPython = Join-Path $Root ".venv\Scripts\python.exe"
  if ((Test-Path $venvPython) -and (Test-PythonRuntime -Command $venvPython)) {
    return [PSCustomObject]@{ Command = $venvPython; PrefixArgs = @(); Source = "existing virtual environment" }
  }

  # The Python launcher may exist even when no runtime is installed. Every
  # selector is probed without allowing its stderr message to terminate setup.
  if (Get-Command "py.exe" -ErrorAction SilentlyContinue) {
    foreach ($selector in @("-3.12", "-3.11", "-3.13", "-3.10", "-3")) {
      if (Test-PythonRuntime -Command "py.exe" -PrefixArgs @($selector)) {
        return [PSCustomObject]@{ Command = "py.exe"; PrefixArgs = @($selector); Source = "Python launcher" }
      }
    }
  }

  foreach ($commandName in @("python.exe", "python3.exe")) {
    $command = Get-Command $commandName -ErrorAction SilentlyContinue
    if ($command -and (Test-PythonRuntime -Command $command.Source)) {
      return [PSCustomObject]@{ Command = $command.Source; PrefixArgs = @(); Source = $commandName }
    }
  }

  $commonPaths = @()
  foreach ($version in @("313", "312", "311", "310")) {
    if ($env:LOCALAPPDATA) {
      $commonPaths += Join-Path $env:LOCALAPPDATA "Programs\Python\Python$version\python.exe"
    }
    if ($env:ProgramFiles) {
      $commonPaths += Join-Path $env:ProgramFiles "Python$version\python.exe"
    }
    if (${env:ProgramFiles(x86)}) {
      $commonPaths += Join-Path ${env:ProgramFiles(x86)} "Python$version\python.exe"
    }
    $commonPaths += "C:\Python$version\python.exe"
  }

  foreach ($candidate in ($commonPaths | Select-Object -Unique)) {
    if ((Test-Path $candidate) -and (Test-PythonRuntime -Command $candidate)) {
      return [PSCustomObject]@{ Command = $candidate; PrefixArgs = @(); Source = "detected installation" }
    }
  }

  if ($ReturnNull) { return $null }
  throw "Python 3.10, 3.11, 3.12 or 3.13 was not found."
}

function Install-CompatiblePython {
  if ($NoPythonAutoInstall) { return $null }

  $winget = Get-Command "winget.exe" -ErrorAction SilentlyContinue
  if (-not $winget) { return $null }

  Write-Host "No compatible Python runtime was found." -ForegroundColor Yellow
  Write-Host "Installing Python 3.12 for the current user with winget..." -ForegroundColor Cyan

  Invoke-External $winget.Source @(
    "install",
    "--exact",
    "--id", "Python.Python.3.12",
    "--scope", "user",
    "--silent",
    "--disable-interactivity",
    "--accept-package-agreements",
    "--accept-source-agreements"
  )

  # winget cannot refresh the parent PowerShell PATH. Find-CompatiblePython
  # therefore also checks Python's standard installation directories directly.
  foreach ($attempt in 1..12) {
    Start-Sleep -Milliseconds 500
    $python = Find-CompatiblePython -ReturnNull
    if ($python) { return $python }
  }

  return $null
}

Write-Host "Chibi Notes 0.4.26 - Windows setup" -ForegroundColor Magenta
Write-Host "Project folder: $Root" -ForegroundColor DarkGray

Write-Host "[1/7] Checking tools..." -ForegroundColor Cyan
Require-Command "node.exe" "Install Node.js LTS, then restart VS Code."
Require-Command "npm.cmd" "npm is installed with Node.js."
Require-Command "cargo.exe" "Install Rust from rustup.rs, then restart VS Code."
Require-Command "rustc.exe" "Install the Rust MSVC toolchain."

$pythonInfo = Find-CompatiblePython -ReturnNull
if (-not $pythonInfo) {
  $pythonInfo = Install-CompatiblePython
}
if (-not $pythonInfo) {
  throw "Python 3.10-3.13 is required. Install Python 3.12 and run this script again. Make sure 'Add python.exe to PATH' is enabled, or install it with: winget install -e --id Python.Python.3.12 --scope user"
}

$PythonCommand = $pythonInfo.Command
$PythonPrefixArgs = @($pythonInfo.PrefixArgs)

Write-Host ("Node: " + (& node.exe --version)) -ForegroundColor DarkGray
Write-Host ("npm: " + (& npm.cmd --version)) -ForegroundColor DarkGray
Write-Host ("Rust: " + (& rustc.exe --version)) -ForegroundColor DarkGray
Write-Host ("Python: " + $PythonCommand + " " + ($PythonPrefixArgs -join " ") + " [" + $pythonInfo.Source + "]") -ForegroundColor DarkGray

if (-not $SkipInstall) {
  Write-Host "[2/7] Installing React and Tauri dependencies..." -ForegroundColor Cyan
  Invoke-External "npm.cmd" @("install")

  Write-Host "[3/7] Creating the Python virtual environment..." -ForegroundColor Cyan
  if (-not (Test-Path ".venv\Scripts\python.exe")) {
    $venvArgs = $PythonPrefixArgs + @("-m", "venv", ".venv")
    Invoke-External $PythonCommand $venvArgs
  }

  Write-Host "[4/7] Installing Vosk, audio and PyInstaller..." -ForegroundColor Cyan
  $VenvPython = Join-Path $Root ".venv\Scripts\python.exe"
  Invoke-External $VenvPython @("-m", "pip", "install", "--upgrade", "pip")
  $Requirements = Join-Path $Root "backend\requirements.txt"
  if (-not (Test-Path $Requirements)) { throw "Missing backend requirements file: $Requirements. Use the complete project ZIP or copy the patch over the complete v0.4.20 project." }
  Invoke-External $VenvPython @("-m", "pip", "install", "-r", $Requirements)
} else {
  Write-Host "[2-4/7] Dependency installation skipped." -ForegroundColor Yellow
}

$VenvPython = Join-Path $Root ".venv\Scripts\python.exe"
if (-not (Test-Path $VenvPython)) {
  throw "The Python virtual environment is missing. Run scripts\SETUP_WINDOWS.cmd without -SkipInstall first."
}

$VoskSpanish = Join-Path $Root "backend\models\vosk-model-small-es-0.42"
$VoskEnglish = Join-Path $Root "backend\models\vosk-model-small-en-us-0.15"
function Test-VoskModelFolder([string]$Path) {
  return (Test-Path (Join-Path $Path "am\final.mdl")) -and (Test-Path (Join-Path $Path "conf\mfcc.conf")) -and ((Test-Path (Join-Path $Path "graph\HCLr.fst")) -or (Test-Path (Join-Path $Path "graph\HCLG.fst")))
}
if (-not (Test-VoskModelFolder $VoskSpanish) -or -not (Test-VoskModelFolder $VoskEnglish)) {
  Write-Host "[5/7] Installing or repairing the Spanish and English Vosk models..." -ForegroundColor Cyan
  Invoke-External "powershell.exe" @(
    "-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass",
    "-File", (Join-Path $PSScriptRoot "DOWNLOAD_VOSK_MODEL.ps1")
  )
} else {
  Write-Host "[5/7] Spanish and English Vosk models validated." -ForegroundColor DarkGray
}

Write-Host "[6/7] Validating Vosk and building the Python sidecar..." -ForegroundColor Cyan
$VoiceTest = "from vosk import Model; Model(r'" + $VoskSpanish + "'); print('Vosk Spanish model OK')"
function Test-VoskLoad {
  $previousPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = "SilentlyContinue"
    $null = & $VenvPython -c $VoiceTest 2>$null
    return ($LASTEXITCODE -eq 0)
  } finally {
    $ErrorActionPreference = $previousPreference
  }
}
if (-not (Test-VoskLoad)) {
  Write-Host "The Spanish Vosk model exists but cannot be opened. Downloading a clean copy..." -ForegroundColor Yellow
  Invoke-External "powershell.exe" @(
    "-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass",
    "-File", (Join-Path $PSScriptRoot "DOWNLOAD_VOSK_MODEL.ps1"),
    "-Language", "es", "-Force"
  )
  if (-not (Test-VoskLoad)) { throw "The Spanish Vosk model is still invalid after repair." }
}
Write-Host "Vosk Spanish model loaded successfully." -ForegroundColor DarkGray
Remove-Item -Recurse -Force "backend\build", "backend\dist" -ErrorAction SilentlyContinue
Remove-Item -Force "src-tauri\binaries\chibi-notes-backend-*.exe" -ErrorAction SilentlyContinue
Invoke-External $VenvPython @("backend\build_sidecar.py")

if ($BuildOnly) {
  Write-Host "[7/7] Building Windows installers..." -ForegroundColor Green
  Invoke-External "npm.cmd" @("run", "tauri:build")
  $bundlePath = Join-Path $Root "src-tauri\target\release\bundle"
  Write-Host "Installers generated in: $bundlePath" -ForegroundColor Green
} else {
  Write-Host "[7/7] Starting Chibi Notes in development mode..." -ForegroundColor Green
  Invoke-External "npm.cmd" @("run", "tauri:dev")
}
