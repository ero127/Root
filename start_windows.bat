@echo off
cd /d "%~dp0"

rem ---- Find Python, or download and install it automatically ----
set "PY=python"
%PY% --version >nul 2>&1 && goto have_python
set "PY=%LocalAppData%\Programs\Python\Python312\python.exe"
if exist "%PY%" goto have_python

echo Downloading and installing Python (one time only)...
winget install -e --id Python.Python.3.12 --scope user --silent --accept-package-agreements --accept-source-agreements
if exist "%PY%" goto have_python

echo.
echo Python could not be installed automatically.
echo Please install it from https://www.python.org/downloads/ (tick "Add Python to PATH"),
echo then double-click this file again.
pause
exit /b 1

:have_python
rem ---- Download everything Jarvis needs (one time only) ----
if exist ".venv\Scripts\pythonw.exe" goto have_venv
echo Setting up Jarvis for the first time...
"%PY%" -m venv .venv
.venv\Scripts\python.exe -m pip install --upgrade pip
.venv\Scripts\python.exe -m pip install -r requirements.txt
if errorlevel 1 (
    echo Something failed while downloading. Check your internet and try again.
    pause
    exit /b 1
)

:have_venv
rem ---- API key (asked once, then remembered) ----
if exist "api_key.txt" goto have_key
set /p KEY="Paste your Anthropic API key and press Enter: "
call echo %%KEY%%> api_key.txt

:have_key
set /p ANTHROPIC_API_KEY=<api_key.txt

rem Run with no window at all: Jarvis only talks. Say "goodbye" to stop him.
start "" .venv\Scripts\pythonw.exe assistant.py %*
