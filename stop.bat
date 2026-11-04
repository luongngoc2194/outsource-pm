@echo off
title Tat Outsource PM Server
cd /d "%~dp0"

echo Dang dung Outsource PM Server (Port 3000)...
powershell -Command "$p = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue; if ($p) { $p | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }; Write-Output '[THANH CONG] Da dung server thanh cong.' } else { Write-Output '[THONG BAO] Server khong chay.' }"

powershell -Command "Start-Sleep -Milliseconds 1500"
exit /b 0
