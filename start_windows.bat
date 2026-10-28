@echo off
setlocal
cd /d "%~dp0"
title Mike

rem ---- Make sure Mike was unzipped (Windows runs files inside a zip from a temp folder alone) ----
if exist "assistant.py" if exist "requirements.txt" goto files_ok
echo.
echo ============================================================
echo  PROBLEM: Mike is still inside the zip file.
echo.
echo  1. Close this window.
echo  2. Right-click Mike.zip and choose "Extract All...", then click Extract.
echo  3. Open the new Mike folder and double-click start_windows there.
echo ============================================================
goto fail

:files_ok

rem ---- Find Python 3.10 to 3.13, or download and install 3.12 automatically ----
rem (Python 3.14+ has no ready-made microphone part for Windows yet, so it can't be used.)
call :find_python
if defined PY goto have_python

echo Downloading and installing Python (one time only). This can take a few minutes...
winget install -e --id Python.Python.3.12 --scope user --silent --accept-package-agreements --accept-source-agreements
call :find_python
if defined PY goto have_python

echo.
echo ============================================================
echo  PROBLEM: Python could not be installed automatically.
echo.
echo  Please install Python 3.12 yourself from
echo  https://www.python.org/downloads/release/python-31210/
echo  (scroll down to "Windows installer 64-bit"). When installing,
echo  tick the box "Add Python to PATH".
echo  Then double-click start_windows again.
echo ============================================================
goto fail

:have_python
rem ---- Download everything Mike needs (one time only) ----
if exist ".venv\mike_ready.txt" goto have_key
echo Setting up Mike for the first time. This downloads everything he needs
echo and can take a few minutes. Please wait...
echo.
if exist ".venv" rmdir /s /q ".venv"
"%PY%" -m venv .venv
if not exist ".venv\Scripts\python.exe" (
    echo.
    echo ============================================================
    echo  PROBLEM: Could not set up Mike's folder. Try moving the Mike
    echo  folder to your Desktop and double-click start_windows again.
    echo ============================================================
    goto fail
)
".venv\Scripts\python.exe" -m pip install --upgrade pip
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 (
    echo.
    echo ============================================================
    echo  PROBLEM: Something failed while downloading Mike's parts.
    echo  Check your internet connection and double-click start_windows again.
    echo ============================================================
    goto fail
)
rem Only mark setup as done once everything installed, so a failed setup is retried.
echo ok> ".venv\mike_ready.txt"

:have_key
rem ---- API key (asked once, then remembered) ----
if exist "api_key.txt" goto start_mike
echo.
echo Almost done! Paste your Anthropic API key below (right-click to paste),
echo then press Enter. It starts with sk-ant-
set /p KEY="API key: "
if not defined KEY (
    echo No key was entered.
    goto fail
)
call echo %%KEY%%> api_key.txt

:start_mike
echo.
echo Starting Mike... he will say "Hi, I'm Mike" in a few seconds.
echo He runs in a small window at the bottom of your screen (the taskbar).
echo If he doesn't talk, click that "Mike" window to see what went wrong.
rem Minimized window: Mike only talks, but any error stays visible there.
start "Mike" /min "%~dp0run_mike.bat" %*
timeout /t 15 >nul
exit /b 0

:fail
echo.
echo  Take a photo of this window and send it to Claude.
echo  Then press any key to close it.
pause >nul
exit /b 1

rem ---- Helpers ----
:find_python
set "PY="
call :try_python py -3.12
if not defined PY call :try_python py -3.13
if not defined PY call :try_python py -3.11
if not defined PY call :try_python python
for /d %%d in ("%LocalAppData%\Programs\Python\Python3*" "%ProgramFiles%\Python3*") do (
    if not defined PY if exist "%%~d\python.exe" call :try_python "%%~d\python.exe"
)
exit /b 0

:try_python
rem Sets PY to the full path of this Python, but only if it is version 3.10 to 3.13.
for /f "delims=" %%i in ('call %* -c "import sys; (3, 10) <= sys.version_info[:2] <= (3, 13) and print(sys.executable)" 2^>nul') do set "PY=%%i"
exit /b 0
