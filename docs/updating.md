# ✨ Updating the bot

**Before updating the bot, always take a backup of your `db/data.sqlite` file.**

**⚠ Note on updating to v3.0.0:** If you're currently using a *very* old version of the bot, from before February 2018, you'll first need to update to v2.30.1 and run the bot once before updating to v3.0.0.

## To update the bot, follow these steps:

1. Shut down the bot
2. Take a backup of your `db/data.sqlite` file
    * If you're using a different supported database, take database backups from there
3. Download the latest version of the bot from https://github.com/Dragory/modmailbot/releases/latest
4. Extract the new version's files over the old files
5. Read the [CHANGELOG](https://github.com/Dragory/modmailbot/blob/master/CHANGELOG.md) to see if there are any config changes you have to make
    * Especially note changes to supported Node.js versions!
    * If you're updating from a version prior to v3.0.0, make sure to enable the **Server Members** intent on the bot's Discord Developer Portal page ([Image](https://raw.githubusercontent.com/Dragory/modmailbot/master/docs/server-members-intent-2.png))
6. Start the bot:
    * If you're using `start.bat` to run the bot, just run it again
    * If you're running the bot via command line, first run `npm ci` and then start the bot again

👉 If you run into any issues, **[join the support server for help!](https://discord.gg/vRuhG9R)**
