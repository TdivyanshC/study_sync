@echo off
cd /d "%~dp0"
for /f "tokens=1,2 delims==" %%i in (.env) do set %%i=%%j
python -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload
pause