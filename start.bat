@echo off
cd /d "%~dp0"
title Musical English - local server

where py >nul 2>nul
if not errorlevel 1 (
  py -3 server.py %*
  goto :eof
)

where python >nul 2>nul
if not errorlevel 1 (
  python server.py %*
  goto :eof
)

echo.
echo Python 3 not found. Install it from https://www.python.org/downloads/
echo Then double-click start.bat again.
echo.
pause
