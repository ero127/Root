@echo off
cd /d "%~dp0"
title Mike
rem Started minimized by start_windows. Shows what Mike hears and says, and keeps
rem any error on screen so it can be sent to Claude.
set /p ANTHROPIC_API_KEY=<api_key.txt
".venv\Scripts\python.exe" assistant.py --show-text %*
if errorlevel 1 (
    echo.
    echo ============================================================
    echo  Mike stopped because of an error. Copy the text above, or take
    echo  a photo of this window, and send it to Claude.
    echo ============================================================
    pause
)
