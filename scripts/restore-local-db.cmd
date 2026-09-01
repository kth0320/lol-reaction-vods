@echo off
setlocal
cd /d "%~dp0\.."

echo Fetching the snapshot...
git fetch origin cursor/restore-vod-db-527e
if errorlevel 1 exit /b 1

echo Writing prisma\dev.db (this will not print the file)...
node -e "const {execFileSync}=require('child_process'); const {writeFileSync}=require('fs'); const b=execFileSync('git',['show','origin/cursor/restore-vod-db-527e:prisma/dev.db'],{maxBuffer:20*1024*1024}); writeFileSync('prisma/dev.db', b); console.log('Wrote', b.length, 'bytes to prisma/dev.db');"
if errorlevel 1 (
  echo.
  echo If the file is locked: Ctrl+C the npm window, close Cursor, run this again.
  exit /b 1
)

echo.
echo OK. Start the app with: npm.cmd run dev
