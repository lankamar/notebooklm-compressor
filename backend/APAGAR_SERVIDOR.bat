@echo off
echo Apagando todos los servidores uvicorn...
taskkill /F /IM uvicorn.exe /T
taskkill /F /IM python.exe /FI "WINDOWTITLE eq uvicorn" /T
echo Listo.
pause
