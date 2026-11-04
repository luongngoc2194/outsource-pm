@echo off
chcp 65001 >nul
cd /d "%~dp0"

powershell -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$startup = [Environment]::GetFolderPath('Startup'); " ^
  "$s = $ws.CreateShortcut((Join-Path $startup 'Outsource PM.lnk')); " ^
  "$s.TargetPath = 'wscript.exe'; " ^
  "$s.Arguments = '`"D:\qlduan\start-hidden.vbs`"'; " ^
  "$s.WorkingDirectory = 'D:\qlduan'; " ^
  "$s.IconLocation = 'D:\qlduan\app.ico,0'; " ^
  "$s.Description = 'Tự động chạy ngầm Outsource PM khi bật máy'; " ^
  "$s.Save(); " ^
  "Write-Output 'Da bat tu dong khoi dong cung Windows!'"

echo.
echo ===================================================
echo [THÀNH CÔNG] Đã bật tự động khởi động cùng Windows.
echo Mỗi khi bật máy tính, Outsource PM sẽ tự động chạy ngầm sẵn.
echo ===================================================
timeout /t 3 >nul
exit /b 0
