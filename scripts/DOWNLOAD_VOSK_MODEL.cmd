@echo off
setlocal
cd /d "%~dp0\.."
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0DOWNLOAD_VOSK_MODEL.ps1" %*
set CODE=%ERRORLEVEL%
if not "%CODE%"=="0" (
  echo.
  echo No se pudo reparar el modelo de voz. Revisa tu conexion a Internet.
)
exit /b %CODE%
