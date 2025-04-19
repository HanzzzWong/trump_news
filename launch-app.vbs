Set oShell = CreateObject("WScript.Shell")
' Get the directory where this script is located
strPath = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
' Change to that directory
oShell.CurrentDirectory = strPath
' Run the batch file
oShell.Run "start-app.bat", 1, False

MsgBox "Trump News Tracker is starting...", 64, "Application Launcher" 