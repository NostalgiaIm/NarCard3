@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

if not exist "node_modules" (
  echo [NarCard] Local dependencies are missing. Running one-click setup first...
  call "%~dp0setup-windows.cmd"
  if errorlevel 1 exit /b %ERRORLEVEL%
)

npm run tauri:dev
exit /b %ERRORLEVEL%
