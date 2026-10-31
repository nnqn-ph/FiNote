@echo off
title FiNote Web Server
echo ==============================================
echo   Dang khoi dong may chu FiNote...
echo   Dia chi: http://localhost:3000
echo ==============================================
cd /d "%~dp0"
start http://localhost:3000
node server.js
pause
