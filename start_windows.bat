@echo off
cd /d "%~dp0"

if not exist ".venv" (
    echo Setting up Jarvis for the first time...
    python -m venv .venv || (echo Python is not installed. Get it from python.org & pause & exit /b 1)
    call .venv\Scripts\activate.bat
    pip install -r requirements.txt
) else (
    call .venv\Scripts\activate.bat
)

if not exist "api_key.txt" (
    set /p KEY="Paste your Anthropic API key and press Enter: "
    call echo %%KEY%%> api_key.txt
)
set /p ANTHROPIC_API_KEY=<api_key.txt

python assistant.py %*
pause
