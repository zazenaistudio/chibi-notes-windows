@echo off
chcp 65001 >nul
title Cerrar Chibi Notes antes de instalar

echo Cerrando Chibi Notes y el backend de voz...
taskkill /F /T /IM chibi-notes.exe >nul 2>&1
taskkill /F /T /IM "Chibi Notes.exe" >nul 2>&1
taskkill /F /T /IM chibi-notes-backend.exe >nul 2>&1
taskkill /F /T /IM chibi-notes-backend-x86_64-pc-windows-msvc.exe >nul 2>&1

timeout /t 2 /nobreak >nul
echo.
echo [OK] Los procesos de Chibi Notes se han cerrado.
echo Ya puedes volver a ejecutar el instalador.
echo.
pause
