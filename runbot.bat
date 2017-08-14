@echo off
Echo Hello, %username% i will check for updates then run the bot.
Echo Current time is
time /t
timeout /t 3
cls
cd %~dp0
echo Checking For Updates!
echo.
call npm install
echo.
:: I had to put a timeout here so people can see if the update left any errors.
timeout /t 10
cls
echo Starting Bot!
npm start
pause
