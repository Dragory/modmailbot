# 🏃 Starting the bot
Haven't set up the bot yet? Check out [Setting up the bot](setup.md) first!

## Windows
* To start the bot, double-click on `start.bat` in the bot's folder
* To shut down the bot, close the console window
* To restart the bot, close the console window and then double-click on `start.bat` again

## Linux / macOS / Advanced on Windows
The following assumes basic knowledge about using command line tools.
1. Before first start-up and after every update, run `npm ci` in the bot's folder
2. Run `npm start` in the bot's folder to start the bot

## Process managers
If you're using a process manager like PM2, the command to run is `npm start`.
A PM2 process file, `modmailbot-pm2.json`, is included in the repository.
