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
1. Create a bot on the [Discord Developer Portal](https://discordapp.com/developers/)
2. Turn on **Server Members Intent** in the bot's settings page on the developer portal ([Image](server-members-intent-2.png))
3. Install Node.js 14 (LTS)
    * Node.js 15 is not currently officially supported
4. [Download the latest bot release here](https://github.com/Dragory/modmailbot/releases/latest) (click on "Source code (zip)")
5. Extract the downloaded Zip file to a new folder
6. In the bot's folder (that you extracted from the zip file), make a copy of the file `config.example.ini` and rename the copy to `config.ini`
    * If you're on Windows, the file may be named `config.example` (without `.ini` at the end)

## Single-server setup
In this setup, modmail threads are opened on the main server in a special category.
This is the recommended setup for small and medium sized servers.

1. **Go through the [prerequisites](#prerequisites) above first!**
2. Open `config.ini` in a text editor and fill in the required values. `mainServerId` and `inboxServerId` should both be set to your server's id.
3. Invite the bot to the server
4. On a new line at the end of `config.ini`, add `categoryAutomation.newThread = CATEGORY_ID_HERE`
    * Replace `CATEGORY_ID_HERE` with the ID of the category where new modmail threads should go
5. Make sure the bot has `Manage Channels`, `Manage Messages`, and `Attach Files` permissions in the category
    * It is not recommended to give the bot Administrator permissions under *any* circumstances
6. **[🏃 Start the bot!](starting-the-bot.md)**
7. Want to change other bot options? See **[📝 Configuration](configuration.md)**
8. Have any other questions? Check out the **[🙋 Frequently Asked Questions](faq.md)** or
   **[join the support server!](../README.md#support-server)**

## Two-server setup
In this setup, modmail threads are opened on a separate inbox server.
This is the recommended setup for large servers that get a lot of modmails, where a single-server setup could get messy.
You might also want this setup for privacy concerns*.

1. **Go through the [prerequisites](#prerequisites) above first!**
2. Create an inbox server on Discord
3. Open `config.ini` in a text editor and fill in the required values
    * Set `mainServerId` to the ID of the *main* server where users will message the bot from
    * Set `inboxServerId` to the ID of the *inbox* server created in step 2
4. Invite the bot to both the main server and the newly-created inbox server
5. Open `config.ini` in a text editor and fill in the values
6. Make sure the bot has the `Manage Channels`, `Manage Messages`, and `Attach Files` permissions on the **inbox** server
    * The bot does not need any permissions on the main server
7. **[🏃 Start the bot!](starting-the-bot.md)**
8. Want to change other bot options? See **[📝 Configuration](configuration.md)**
9. Have any other questions? Check out the **[🙋 Frequently Asked Questions](faq.md)** or
   **[join the support server!](../README.md#support-server)**

*\* Since all channel names, even for channels you can't see, are public information through the API, a user with a
modified client could see the names of all users contacting modmail through the modmail channel names.* 
