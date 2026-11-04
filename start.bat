@echo off
title Outsource PM - Server
cd /d "%~dp0"

echo ===================================================
echo        DU AN QUAN LY OUTSOURCE PM
echo ===================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [LOI] May tinh chua cai dat Node.js!
  echo Vui long tai va cai dat Node.js tai: https://nodejs.org
  echo Sau khi cai dat xong, hay bam dup lai file nay.
  echo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo [1/3] Dang cai dat thu vien lan dau...
  call npm install
  echo.
)

echo [2/3] Kiem tra va giai phong cong 3000...
powershell -Command "Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"

echo [3/3] Dang khoi dong Server Outsource PM...
echo Ung dung se tu dong mo tren trinh duyet tai: http://localhost:3000
echo.
echo ===================================================
echo Meo: Ban co the thu nho (Minimize) cua so nay xuong.
echo De tat hoan toan: Bam dup file "stop.bat" hoac dong cua so nay.
echo ===================================================
echo.

start "" /b powershell -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:3000'"
node backend\server.js

if errorlevel 1 (
  echo.
  echo [CANH BAO] Server da dung hoac gap su co.
  pause
)
