@echo off
setlocal
title UNDERSTAR Grok Event Voice Library V2
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp02026-08-30-launch-event-voice-library-v2.ps1"
set "library_exit=%errorlevel%"
endlocal & exit /b %library_exit%
