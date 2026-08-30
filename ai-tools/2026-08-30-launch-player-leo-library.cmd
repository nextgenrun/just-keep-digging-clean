@echo off
setlocal
title UNDERSTAR Player Character LEO Library
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp02026-08-30-launch-player-leo-library.ps1"
set "voice_exit=%errorlevel%"
endlocal & exit /b %voice_exit%
