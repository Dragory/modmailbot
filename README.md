# Modmail for Discord
A bot for [Discord](https://discordapp.com/) that allows users to DM the bot to contact the server's entire mod team.
These DMs get relayed to a modmail server where each user gets their own channel, or "thread".
Moderators and admins can then reply to these threads, and these responses are relayed back to the original user as a DM.

Inspired by Reddit's modmail system.

## NOTE! If you're upgrading to v2.23.0, note that Node.js 10 is now required at minimum.

## Table of contents
- [Setup](#setup)
- [Changelog](#changelog)
- [Commands](#commands)
  - [Anywhere on the inbox server](#anywhere-on-the-inbox-server)
  - [Inside a modmail thread](#inside-a-modmail-thread)
- [Configuration options](#configuration-options)
- [Plugins](#plugins)
  - [Specifying plugins to load](#specifying-plugins-to-load)
  - [Creating a plugin](#creating-a-plugin)

## Setup
1. Install Node.js 10 (LTS) or higher
2. Download the latest release from [the releases page](https://github.com/Dragory/modmailbot/releases)
3. Create a Discord server to be used as the modmail inbox
4. Make a copy of the file `config.example.json` in the same folder and name the copy `config.json`. Open the file and fill in the values.
   - You can also find more configurable options at the end of this page!
5. Install dependencies: `npm ci`
6. Add bot to servers, and make sure to give it proper permissions on the mail server.
7. Run the bot: `npm start`

## Changelog
See [CHANGELOG.md](CHANGELOG.md)

## Commands

### Anywhere on the inbox server
`!logs <user> <page>` Lists previous modmail logs with the specified user. If there are a lot of logs, they will be paginated. In this case, you can specify the page number to view as the second argument.  
`!block <user> <time>` Blocks the specified user from using modmail. If a time is specified, the block is temporary.  
`!unblock <user> <time>` Unblocks the specified user from using modmail. If a time is specified, the user will be scheduled to be unblocked after that time.  
`!is_blocked <user>` Checks whether the user is blocked and for how long  
`!s <shortcut> <text>` Adds a snippet (a canned response). Supports {1}, {2}, etc. for arguments. See below for how to use it.  
`!edit_snippet <shortcut> <text>` Edits an existing snippet (alias `!es`)  
`!delete_snippet <shortcut>` Deletes the specified snippet (alias `!ds`)  
`!snippets` Lists all available snippets  
`!version` Print the version of the bot you're running  
`!newthread <user>` Opens a new thread with the specified user

### Inside a modmail thread
`!reply <text>` Sends a reply to the user in the format "(Role) User: text" (alias `!r`)  
`!anonreply <text>` Sends an anonymous reply to the user in the format "Role: text" (alias `!ar`)  
`!close <time>` Closes the modmail thread. If a time is specified, the thread is scheduled to be closed later. Scheduled closing is cancelled if a message is sent to or received from the user.  
`!logs <page>` Lists previous modmail logs with this user. If there are a lot of logs, they will be paginated. In this case, you can specify the page number to view as an argument.  
`!block <time>` Blocks the user from using modmail. If a time is specified, the block is temporary.  
`!unblock <time>` Unblocks the user from using modmail. If a time is specified, the user will be scheduled to be unblocked after that time.  
`!!shortcut` Reply with a snippet. Replace `shortcut` with the snippet's actual shortcut.  
`!!!shortcut` Reply with a snippet anonymously. Replace `shortcut` with the snippet's actual shortcut.  
`!move <category>` If `allowMove` is enabled, moves the thread channel to the specified category  
`!loglink` Shows the link to the current thread's log  
`!suspend` Suspend a thread. The thread will act as closed and not receive any messages until unsuspended.  
`!unsuspend` Unsuspend a thread  
`!id` Prints the user's ID
`!alert` Pings you when the thread gets a new reply. Use `!alert cancel` to cancel.

To automatically reply without using !reply or !r, enable `alwaysReply` in the config. `alwaysReplyAnon` sets whether to reply anonymously. If you do not wish to reply, it will ignore any message starting in the prefix (which defaults to !), such as !note

## Configuration options
These go in `config.json`. See also `config.example.json`.

|Option|Default|Description|
|------|-------|-----------|
|**token**|None|**Required!** The bot user's token|
|**logChannelId**|None|**Required!** Channel where to post log links to closed threads and other alerts|
|**mailGuildId**|None|**Required!** The inbox server's ID|
|**mainGuildId**|None|**Required!** ID (or array of IDs) of the main server where people contact the bot from. Used for displaying users' nicknames and join dates, and catching bot pings.|
|accountAgeDeniedMessage|"Your Discord account is not old enough to contact modmail."|See `requiredAccountAge` below|
|allowMove|false|If enabled, allows you to move the thread to another category using `!move <category>`|
|allowUserClose|false|If set to true, users can use the close command to close threads by themselves from their DMs with the bot|
|alwaysReplyAnon|false|If `alwaysReply` is set to true, this option controls whether the auto-reply is anonymous|
|alwaysReply|false|If set to true, all messages in modmail threads will be relayed back to the user, even ones without `!r`|
|attachmentStorage|"local"|Controls where sent/received attachments are saved.<br><br>**"local"** - Files are saved locally on the machine running the bot<br>**"discord"** - Files are saved as attachments on a special channel on the inbox server. Requires `attachmentStorageChannelId` to be set.|
|attachmentStorageChannelId|null|When using "discord" attachment storage, the id of the channel on the inbox server where attachments should be saved|
|botMentionResponse|None|If set, the bot auto-responds to bot mentions with this message. Allows `{userMention}` to be added to mention the user who mentioned the bot.|
|categoryAutomation|{}|Various ways of automating thread categories on the inbox server. **Note that the options below with a dot in the name are object properties for `categoryAutomation`.**|
|categoryAutomation.newThread|None|Same as `newThreadCategoryId`. Specifies a category to open all new threads in. Also functions as a fallback for `categoryAutomation.newThreadFromGuild`.|
|categoryAutomation.newThreadFromGuild|None|Allows you to open threads in specific categories based on which guild the user is messaging the bot from. The value is an object with guild ids as the keys and category ids as the values.|
|closeMessage|None|The bot's message to the user when the thread is closed|
|commandAliases|None|Custom aliases for commands. Value is an object with the alias as the key and the real command as the value.|
|enableGreeting|false|Set to true to send a welcome message to new main guild members. Requires `mainGuildId` to be set.|
|greetingAttachment|None|Path to an image or other attachment to send along with the greeting|
|greetingMessage|None|Text content of the welcome message|
|guildGreetings|None|When using multiple mainGuildIds, this option allows you to configure greetings on a per-server basis. The syntax is an object with the guild ID as the key, and another object with `message` and `attachment` properties as the value (identical to greetingMessage and greetingAttachment)|
|ignoreAccidentalThreads|false|If set to true, the bot attempts to ignore common "accidental" messages that would start a new thread, such as "ok", "thanks", etc.|
|inboxServerPermission|None|Permission required to use bot commands on the inbox server|
|timeOnServerDeniedMessage|"You haven't been a member of the server for long enough to contact modmail."|See `requiredTimeOnServer` below|
|mentionRole|"here"|Role that is mentioned when new threads are created or the bot is mentioned. Accepted values are "here", "everyone", or a role id as a string. Set to null to disable these pings entirely. Multiple values in an array are supported.|
|mentionUserInThreadHeader|false|If set to true, mentions the thread's user in the thread header|
|newThreadCategoryId|None|ID of the category where new modmail thread channels should be placed|
|pingOnBotMention|true|If enabled, the bot will mention staff (see mentionRole above) on the inbox server when the bot is mentioned on the main server.|
|plugins|None|Array of plugins to load on startup. See [Plugins](#plugins) section below for more information.|
|port|8890|Port from which to serve attachments and logs|
|prefix|"!"|Prefix for bot commands|
|relaySmallAttachmentsAsAttachments|false|Whether to relay small attachments from users as native attachments rather than links in modmail threads|
|requiredAccountAge|None|Required account age for contacting modmail (in hours). If the account is not old enough, a new thread will not be created and the bot will reply with `accountAgeDeniedMessage` (if set) instead.|
|requiredTimeOnServer|None|Required amount of time (in minutes) the user must be a member of the server before being able to contact modmail. If the user hasn't been a member of the server for the specified time, a new thread will not be created and the bot will reply with `timeOnServerDeniedMessage` (if set) instead.|
|responseMessage|"Thank you for your message! Our mod team will reply to you here as soon as possible."|The bot's response to DMs that start a new thread|
|rolesInThreadHeader|false|If enabled, the user's roles will be shown in the thread header|
|smallAttachmentLimit|2097152|Size limit of `relaySmallAttachmentsAsAttachments`, in bytes (default is 2MB)|
|snippetPrefix|"!!"|Prefix to use snippets|
|snippetPrefixAnon|"!!!"|Prefix to use snippets anonymously|
|status|"Message me for help"|The bot's "Playing" text|
|syncPermissionsOnMove|false|Whether to sync thread channel permissions to the category when moved with !move|
|threadTimestamps|false|Whether to show custom timestamps in threads, in addition to Discord's own timestamps. Logs always have accurate timestamps, regardless of this setting.|
|typingProxy|false|If enabled, any time a user is typing to modmail in their DMs, the modmail thread will show the bot as "typing"|
|typingProxyReverse|false|If enabled, any time a moderator is typing in a modmail thread, the user will see the bot "typing" in their DMs|
|updateNotifications|true|Whether to automatically check for bot updates and notify about them in new threads|
|url|None|URL to use for attachment and log links. Defaults to `IP:PORT`|
|useNicknames|false|If set to true, mod replies will use their nickname (on the inbox server) instead of their username|

## Plugins
The bot supports loading external plugins.

### Specifying plugins to load
Add the path to the plugin's file to the `plugins` array in the config.
The plugin will be automatically loaded on startup.
The path is relative to the bot's folder.

### Creating a plugin
Create a `.js` file that exports a function.
This function will be called when the plugin is loaded with the following arguments: `(bot, knex, config, commands)`
where `bot` is the [Eris Client object](https://abal.moe/Eris/docs/Client),
`knex` is the [Knex database object](https://knexjs.org/#Builder),
`config` is the loaded config object,
and `commands` is an object with functions to add and manage commands (see bottom of [src/commands.js](src/commands.js))

#### Example plugin file
```js
module.exports = function(bot, knex, config, commands) {
  commands.addInboxThreadCommand('mycommand', [], (msg, args, thread) => {
    thread.replyToUser(msg.author, 'Reply from my custom plugin!');
  });
}
```

### Work in progress
The current plugin API is fairly rudimentary and will be expanded in the future.
The API can change in non-major releases during this early stage. Keep an eye on [CHANGELOG.md](CHANGELOG.md) for any changes.

Please send any feature suggestions to the [issue tracker](https://github.com/Dragory/modmailbot/issues)!
