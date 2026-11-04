@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo Đang tạo Shortcut "Outsource PM" ra Desktop...
powershell -ExecutionPolicy Bypass -File "%~dp0setup-shortcuts.ps1"

echo.
echo ===================================================
echo [THÀNH CÔNG] Đã tạo 2 biểu tượng trên Desktop:
echo 1. "Outsource PM" (Khuyên dùng: Click đúp mở web ngay, không hiện cửa sổ đen)
echo 2. "Outsource PM - Console" (Chạy có cửa sổ CMD để xem log nếu muốn)
echo ===================================================
timeout /t 3 >nul
exit /b 0
