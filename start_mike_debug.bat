@echo off
cd /d "%~dp0"
title Mike (debug)
rem Runs Mike in a visible window that shows everything he hears, says and every error.
rem Use this when Mike doesn't start or talk, and send what it shows to Claude.
if not exist ".venv\Scripts\python.exe" (
    echo Mike is not set up yet. Double-click start_windows first.
    pause
    exit /b 1
)
if not exist "api_key.txt" (
    echo No API key saved yet. Double-click start_windows first.
    pause
    exit /b 1
)
set /p ANTHROPIC_API_KEY=<api_key.txt
echo Starting Mike in debug mode. Everything he hears and says shows below.
echo Say "goodbye" or close this window to stop him.
echo.
".venv\Scripts\python.exe" assistant.py --show-text %*
echo.
echo ============================================================
echo  Mike stopped. If there is an error above, take a photo of
echo  this window (or copy the text) and send it to Claude.
echo ============================================================
pause
