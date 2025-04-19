@echo off
echo Starting Trump News Tracker application...
echo.
echo Please wait while the server starts...
start /B node server.js
echo.
echo Server starting on port 3000...
timeout /t 3 /nobreak >nul
echo Opening application in your default browser...
start http://localhost:3000
echo.
echo If the application doesn't open automatically, please navigate to:
echo http://localhost:3000
echo.
echo To stop the server, press Ctrl+C in this window and then type 'Y' to confirm.
echo.
cmd /k 