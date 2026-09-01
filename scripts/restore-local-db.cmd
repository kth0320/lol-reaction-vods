@echo off
setlocal
cd /d "%~dp0\.."
node scripts\restore-local-db.js
if errorlevel 1 exit /b 1
