@echo off
setlocal
echo Instalando Conector Nativo de Google Chrome...

set "DIR=%~dp0"
set "DIR=%DIR:\=\\%"
set "JSON_PATH=%~dp0com.lankamar.compressor.json"

echo { > "%JSON_PATH%"
echo   "name": "com.lankamar.compressor", >> "%JSON_PATH%"
echo   "description": "NotebookLM Compressor Native Host", >> "%JSON_PATH%"
echo   "path": "%DIR%native_host.bat", >> "%JSON_PATH%"
echo   "type": "stdio", >> "%JSON_PATH%"
echo   "allowed_origins": [ >> "%JSON_PATH%"
echo     "chrome-extension://cmillkglagbniikakogcpnoakijamkgi/" >> "%JSON_PATH%"
echo   ] >> "%JSON_PATH%"
echo } >> "%JSON_PATH%"

reg add "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.lankamar.compressor" /ve /t REG_SZ /d "%JSON_PATH%" /f
echo.
echo ==============================================================
echo EXITOSO: El boton "Encender Servidor" en Chrome ya deberia funcionar.
echo Podes cerrar esta ventana.
echo ==============================================================
pause
