$ws = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath('Desktop')

# 1. Main Shortcut: Click dup la mo web, server chay ngam
$linkPath = Join-Path $desktop "Outsource PM.lnk"
$s = $ws.CreateShortcut($linkPath)
$s.TargetPath = "wscript.exe"
$s.Arguments = "`"D:\qlduan\start-hidden.vbs`""
$s.WorkingDirectory = "D:\qlduan"
$s.IconLocation = "D:\qlduan\app.ico,0"
$s.Description = "Mo ung dung Outsource PM (Click dup chay ngay)"
$s.Save()

# 2. Console Shortcut: Mo co cua so den de theo doi log
$linkPath2 = Join-Path $desktop "Outsource PM - Console.lnk"
$s2 = $ws.CreateShortcut($linkPath2)
$s2.TargetPath = "D:\qlduan\start.bat"
$s2.WorkingDirectory = "D:\qlduan"
$s2.IconLocation = "D:\qlduan\app.ico,0"
$s2.Description = "Khoi dong Outsource PM (Hien cua so Console theo doi)"
$s2.Save()

# 3. Stop Shortcut: Tat chuong trinh nhanh ngay tu Desktop
$linkPath3 = Join-Path $desktop "Dung Outsource PM.lnk"
$s3 = $ws.CreateShortcut($linkPath3)
$s3.TargetPath = "D:\qlduan\stop.bat"
$s3.WorkingDirectory = "D:\qlduan"
$s3.IconLocation = "C:\Windows\System32\imageres.dll,229"
$s3.Description = "Tat hoan toan may chu Outsource PM"
$s3.Save()

Write-Output "Successfully updated Desktop shortcuts at $desktop"
