@echo off
REM Double-click this file to launch the whole project:
REM   all 3 SOA services + the web UI, and open the browser.
REM   (Start MySQL first from the XAMPP Control Panel.)
powershell -ExecutionPolicy Bypass -File "%~dp0run_all.ps1"
pause
