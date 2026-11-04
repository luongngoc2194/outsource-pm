@echo off
chcp 65001 >nul
cd /d "%~dp0"

powershell -Command ^
  "$startup = [Environment]::GetFolderPath('Startup'); " ^
  "$target = Join-Path $startup 'Outsource PM.lnk'; " ^
  "if (Test-Path $target) { Remove-Item $target -Force; Write-Output 'Da tat tu dong khoi dong cung Windows.'; } else { Write-Output 'Chua bat tu dong khoi dong cung Windows.'; }"

echo.
echo ===================================================
echo [THÀNH CÔNG] Đã tắt tự động khởi động cùng Windows.
echo ===================================================
timeout /t 3 >nul
exit /b 0
