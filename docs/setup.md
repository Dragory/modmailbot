# 🛠️ Setting up the bot
**Note:** This bot is run on your own machine or a server.  
To keep it online, you need to keep the bot process running.

## Terminology
* **Main server** (or main guild) is the server where users will be contacting modmail from
* **Inbox server** (or inbox guild, or mail guild) is the server where modmail threads will be created.
  In a "single-server setup" this is the same server as the main server.
* A **modmail thread** is a channel on the **inbox server** that contains the current exchange with the **user**.
  These threads can be closed to archive them. One **user** can only have 1 modmail thread open at once.
* A **moderator**, in modmail's context, is a server staff member who responds to and manages modmail threads
* A **user**, in modmail's context, is a Discord user who is contacting modmail by DMing the bot

## Prerequisites
1. Create a bot account through the [Discord Developer Portal](https://discordapp.com/developers/)
2. Invite the created bot to your server
3. Install Node.js 10, 11, or 12
    - Node.js 13 is currently not supported
4. Download the latest bot version from [the releases page](https://github.com/Dragory/modmailbot/releases) and extract it to a folder
5. Make a copy of the file `config.example.ini` in the bot's folder and name the copy `config.ini`

## Two-server setup
In this setup, modmail threads are opened on a separate inbox server.
1. Create an inbox server on Discord
2. Invite the bot to the inbox server.
3. Open `config.ini` in a text editor and fill in the values
4. Make sure the bot has the `Manage Channels`, `Manage Messages`, and `Attach Files` permissions on the **inbox** server
5. **[🏃 Start the bot!](starting-the-bot.md)**
5. Want to change other bot options? See **[📝 Configuration](configuration.md)**

## Single-server setup
In this setup, modmail threads are opened on the main server in a special category.
1. Open `config.ini` in a text editor and fill in the required values. `mainGuildId` and `mailGuildId` should both be set to your server's id.
2. On a new line at the end of `config.ini`, add `categoryAutomation.newThread = CATEGORY_ID_HERE`
    - Replace `CATEGORY_ID_HERE` with the ID of the category where new modmail threads should go
3. Make sure the bot has `Manage Channels`, `Manage Messages`, and `Attach Files` permissions in the category
4. **[🏃 Start the bot!](starting-the-bot.md)**
5. Want to change other bot options? See **[📝 Configuration](configuration.md)**
