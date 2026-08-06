@echo off
setlocal
cd /d "%~dp0.."
if not exist "node_modules" goto FIRST_SETUP
if not exist ".venv\Scripts\python.exe" goto FIRST_SETUP
if not exist "backend\models\vosk-model-small-es-0.42" goto download_vosk
if not exist "backend\models\vosk-model-small-en-us-0.15" goto download_vosk
goto vosk_ready
:download_vosk
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0DOWNLOAD_VOSK_MODEL.ps1"
:vosk_ready
npm.cmd run tauri:dev
set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" pause
exit /b %EXIT_CODE%
:FIRST_SETUP
echo The project has not been prepared yet. Starting first setup...
call "%~dp0SETUP_WINDOWS.cmd"
exit /b %ERRORLEVEL%
