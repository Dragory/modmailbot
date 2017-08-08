@echo off
Echo Hello, I will check for updates then run the bot.
timeout /nobreak /t 3
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
