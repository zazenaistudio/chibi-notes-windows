@echo off
setlocal
cd /d "%~dp0.."
if not exist "node_modules" (
  echo Installing npm dependencies...
  npm.cmd install
  if errorlevel 1 goto ERROR
)
npm.cmd run dev
set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" pause
exit /b %EXIT_CODE%
:ERROR
echo npm install failed.
pause
exit /b 1
