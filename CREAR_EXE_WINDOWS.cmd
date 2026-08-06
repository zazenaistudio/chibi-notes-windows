@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
call "%~dp0scripts\BUILD_EXE.cmd"
exit /b %ERRORLEVEL%
