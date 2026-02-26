Set fso = CreateObject("Scripting.FileSystemObject")
ScriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run chr(34) & ScriptDir & "\start_server.bat" & Chr(34), 0
Set WshShell = Nothing
