@echo off
setlocal
cd /d "%~dp0"
npm ci
exit /b %ERRORLEVEL%
