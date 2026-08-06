@echo off
setlocal EnableExtensions
echo Chibi Notes - requirements check
echo.
call :CHECK node.exe "Node.js LTS"
call :CHECK npm.cmd "npm"
call :CHECK cargo.exe "Rust Cargo"
call :CHECK rustc.exe "Rust compiler"
call :CHECK_PYTHON
echo.
echo SETUP_WINDOWS.cmd can install Python 3.12 automatically with winget when needed.
echo If the required versions appear above, run SETUP_WINDOWS.cmd.
pause
exit /b 0

:CHECK
where %~1 >nul 2>nul
if errorlevel 1 (
  echo [MISSING] %~2
) else (
  echo [OK] %~2
  %~1 --version
)
exit /b 0

:CHECK_PYTHON
set "PYTHON_FOUND="
where py.exe >nul 2>nul
if not errorlevel 1 (
  for %%S in (-3.12 -3.11 -3.13 -3.10 -3) do (
    if not defined PYTHON_FOUND (
      py.exe %%S -c "import sys; raise SystemExit(0 if sys.version_info.major==3 and sys.version_info.minor in (10,11,12,13) else 1)" >nul 2>nul
      if not errorlevel 1 (
        echo [OK] Python runtime through py.exe %%S
        py.exe %%S --version
        set "PYTHON_FOUND=1"
      )
    )
  )
)
if not defined PYTHON_FOUND (
  where python.exe >nul 2>nul
  if not errorlevel 1 (
    python.exe -c "import sys; raise SystemExit(0 if sys.version_info.major==3 and sys.version_info.minor in (10,11,12,13) else 1)" >nul 2>nul
    if not errorlevel 1 (
      echo [OK] Python runtime through python.exe
      python.exe --version
      set "PYTHON_FOUND=1"
    )
  )
)
if not defined PYTHON_FOUND echo [MISSING] Python 3.10-3.13 ^(setup will try to install Python 3.12 automatically^)
exit /b 0
