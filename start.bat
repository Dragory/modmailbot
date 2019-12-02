@echo off

echo Installing/updating bot dependencies
call npm ci --only=production --loglevel=warn >NUL

if NOT ["%errorlevel%"]==["0"] (
  pause
  exit /b %errorlevel%
)

echo Starting the bot
call npm run start

if NOT ["%errorlevel%"]==["0"] (
  pause
  exit /b %errorlevel%
)
