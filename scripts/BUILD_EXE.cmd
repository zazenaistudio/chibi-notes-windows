@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0.."
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0BUILD_EXE.ps1"
set "EXIT_CODE=%ERRORLEVEL%"
echo.
if "%EXIT_CODE%"=="0" (
  echo Compilacion completada. Revisa la carpeta release.
) else (
  echo La compilacion fallo con el codigo %EXIT_CODE%.
  echo Consulta release\BUILD_ERROR.txt y release\BUILD_LOG.txt.
)
pause
exit /b %EXIT_CODE%
