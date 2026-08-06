@echo off
setlocal
cd /d "%~dp0\.."

echo Chibi Notes - Reparacion completa del reconocimiento de voz

echo.
if not exist ".venv\Scripts\python.exe" (
  echo No existe el entorno Python.
  echo Ejecuta primero CREAR_EXE_WINDOWS.cmd para instalar las dependencias.
  exit /b 1
)

set "PYTHON=.venv\Scripts\python.exe"

echo [1/4] Comprobando las dependencias de voz...
"%PYTHON%" -m pip install -r "backend\requirements.txt"
if errorlevel 1 exit /b 1

echo [2/4] Comprobando el modelo espanol de Vosk...
"%PYTHON%" -c "from vosk import Model; Model(r'backend\models\vosk-model-small-es-0.42'); print('Modelo Vosk espanol correcto')"
if errorlevel 1 (
  echo El modelo esta incompleto. Descargando una copia limpia...
  call "%~dp0DOWNLOAD_VOSK_MODEL.cmd" -Language es -Force
  if errorlevel 1 exit /b 1
)

echo [3/4] Reconstruyendo el sidecar con PortAudio como binario nativo...
if exist "backend\build" rmdir /s /q "backend\build"
if exist "backend\dist" rmdir /s /q "backend\dist"
del /q "src-tauri\binaries\chibi-notes-backend-*.exe" >nul 2>nul
"%PYTHON%" "backend\build_sidecar.py"
if errorlevel 1 exit /b 1

echo [4/4] Reparacion validada.
echo.
echo El nuevo sidecar ha superado las pruebas de Vosk y PortAudio.
echo Ejecuta CREAR_EXE_WINDOWS.cmd para generar e instalar el nuevo EXE.
exit /b 0
