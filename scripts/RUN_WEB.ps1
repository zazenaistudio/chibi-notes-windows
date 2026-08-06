$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path "node_modules")) {
  & npm.cmd install
  if ($LASTEXITCODE -ne 0) { throw "npm install failed." }
}
& npm.cmd run dev
if ($LASTEXITCODE -ne 0) { throw "Vite failed." }
