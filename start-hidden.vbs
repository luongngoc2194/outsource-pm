Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = currentDir

' Giai phong cong 3000 neu da co server chay
WshShell.Run "powershell -WindowStyle Hidden -Command ""Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }""", 0, True

' Khoi dong node server chay an
WshShell.Run "node backend\server.js", 0, False

' Cho 2 giay de server khoi dong va mo trinh duyet
WScript.Sleep 2000
WshShell.Run "http://localhost:3000"
