@echo off
cd /d "%~dp0"
echo Iniciando servidor interno de compresion (uvicorn)...
uvicorn server:app --host 127.0.0.1 --port 8000
