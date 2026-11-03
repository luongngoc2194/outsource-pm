@echo off
chcp 65001 >nul
title Outsource PM - Server
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [LOI] Chua cai Node.js. Tai tai https://nodejs.org roi chay lai.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Dang cai thu vien lan dau...
  call npm install
)

rem Giai phong cong 3000 neu server cu dang chay
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000 " ^| findstr LISTENING') do taskkill /F /PID %%p >nul 2>nul

echo Dang khoi dong Outsource PM tai http://localhost:3000 ...
start "" /b cmd /c "timeout /t 3 >nul & start http://localhost:3000"
node backend\server.js
pause
