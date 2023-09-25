# 📝 Configuration
Haven't set up the bot yet? Check out [Setting up the bot](setup.md) first!

## Table of contents
- [Configuration file](#configuration-file) (start here)
- [Adding new options](#adding-new-options)
- [Required options](#required-options)
- [Other options](#other-options)
- [config.ini vs config.json](#configini-vs-configjson)
- [Other formats](#other-formats)
- [Environment variables](#environment-variables)

## Configuration file
All bot options are saved in a configuration file in the bot's folder.
This is created during the [setup](setup.md) and is generally either `config.ini` or, if you've been using the bot for
longer, `config.json`.

The instructions on this page are for `config.ini` but can be adapted to `config.json` as well.
See [config.ini vs config.json](#configini-vs-configjson) for more details.
Note that the format of `.ini` and `.json` are different -- you can't simply rename a `.json` to `.ini` or
vice versa.

## Adding new options
To add a new option to your `config.ini`, open the file in a text editor such as notepad.
Each option is put on a new line, and follows the format `option = value`. For example, `mainServerId = 1234`.

**You need to restart the bot for configuration changes to take effect!**

You can add comments in the config file by prefixing the line with `#`. Example:
```ini
# This is a comment
option = value
```

### Toggled options
Some options like `allowMove` can only be turned on or off.
* To turn on a toggled option, set its value to `on`, `true`, or `1`
* To turn off a toggled option, set its value to `off`, `false`, or `0`
* E.g. `allowMove = on` or `allowMove = off`

### "Accepts multiple values"
Some options are marked as "**Accepts multiple values**". To give these options multiple values,
write the option as `option[] = value` and repeat for every value. For example:

```ini
inboxServerPermission[] = kickMembers
inboxServerPermission[] = manageMessages
```

You can also give these options a single value in the usual way, i.e. `inboxServerPermission = kickMembers`

### Multiple lines of text
For some options, such as `greetingMessage`, you might want to add text that spans multiple lines.
To do that, use the same format as with "Accepts multiple values" above:

```ini
greetingMessage[] = Welcome to the server!
greetingMessage[] = This is the second line of the greeting.
greetingMessage[] = 
greetingMessage[] = Fourth line! With an empty line in the middle.
```

## Required options

#### token
The bot user's token from [Discord Developer Portal](https://discord.com/developers/).

#### mainServerId
**Accepts multiple values**. Your server's ID.

#### inboxServerId
For a single-server setup, same as [mainServerId](#mainServerId).  
For a two-server setup, the inbox server's ID.

#### logChannelId
ID of a channel on the inbox server where logs are posted after a modmail thread is closed

## Other options

#### accountAgeDeniedMessage
**Default:** `Your Discord account is not old enough to contact modmail.`  
See `requiredAccountAge` below

#### allowMove
**Default:** `off`  
If enabled, allows you to move threads between categories using `!move <category>`

#### allowUserClose
**Default:** `off`  
If enabled, users can use the close command to close threads by themselves from their DMs with the bot

#### allowStaffDelete
**Default:** `on`  
If enabled, staff members can delete their own replies in modmail threads with `!delete`

#### allowStaffEdit
**Default:** `on`  
If enabled, staff members can edit their own replies in modmail threads with `!edit`

#### updateMessagesLive
**Default:** `off`  
If enabled, messages edited and deleted by the user will be updated accordingly in the thread, but will still be available in the logs

#### allowBlock
**Default:** `on`  
If enabled, staff members can block a user from using modmail with `!block`

#### allowSuspend
**Default:** `on`  
If enabled, staff members can suspend a user from using modmail with `!suspend`

#### allowSnippets
**Default:** `on`  
If enabled, staff members can use [Snippets](snippets.md)

#### allowInlineSnippets
**Default:** `on`  
If `allowSnippets` is enabled, this option controls whether the snippets can be included *within* replies by wrapping the snippet's name in {{ and }}.  
E.g. `!r Hello! {{rules}}`

See [inlineSnippetStart](#inlineSnippetStart) and [inlineSnippetEnd](#inlineSnippetEnd) to customize the symbols used.

#### allowChangingDisplayRole
**Default:** `on`  
If enabled, moderators can change the role that's shown with their replies to any role they currently have using the `!role` command.

#### allowNotes
**Default:** `on`  
If enabled, moderators can add notes on users using the `!note` command.

#### alwaysReply
**Default:** `off`  
If enabled, all messages in modmail threads will be sent to the user without having to use `!r`.  
To send internal messages in the thread when this option is enabled, add your command prefix (e.g. `!`) and a space at the beginning of the messages. For example, `! This is an internal message`.

#### alwaysReplyAnon
**Default:** `off`  
If `alwaysReply` is enabled, this option controls whether the auto-reply is anonymous

#### forceAnon
**Default:** `off`  
If enabled, all replies (including regular `!reply` and snippets) are anonymous

#### anonymizeChannelName
**Default:** `off`  
If enabled, channel names will be the user's name salted with the current time, then hashed to protect the user's privacy

#### attachmentStorage
**Default:** `original`  
Controls how attachments in modmail threads are stored. Possible values:
* `original` - The original attachment is linked directly
* `local` - Files are saved locally on the machine running the bot and served via a local web server
* `discord` - Files are saved as attachments on a special channel on the inbox server. Requires `attachmentStorageChannelId` to be set.

#### attachmentStorageChannelId
**Default:** *None*  
When using attachmentStorage is set to "discord", the id of the channel on the inbox server where attachments are saved

#### autoAlert
**Default:** `off`  
If enabled, the last moderator to reply to a modmail thread will be automatically alerted when the thread gets a new reply.  
This alert kicks in after a delay, set by the `autoAlertDelay` option below.

#### autoAlertDelay
**Default:** `2m`  
The delay after which `autoAlert` kicks in. Uses the same format as timed close; for example `1m30s` for 1 minute and 30 seconds.

#### botMentionResponse
**Default:** *None*  
If set, the bot auto-replies to bot mentions (pings) with this message. Use `{userMention}` in the text to ping the user back.

#### categoryAutomation.newThread
**Default:** *None*  
ID of the category where new threads are opened. Also functions as a fallback for `categoryAutomation.newThreadFromServer`.

#### categoryAutomation.newThreadFromGuild.SERVER_ID
Alias for [`categoryAutomation.newThreadFromServer`](#categoryAutomationNewThreadFromServerServer_id)

#### categoryAutomation.newThreadFromServer.SERVER_ID
**Default:** *None*  
When running the bot on multiple main servers, this allows you to specify which category to use for modmail threads from each server. Example:
```ini
# When the user is from the server ID 94882524378968064, their modmail thread will be placed in the category ID 360863035130249235
categoryAutomation.newThreadFromServer.94882524378968064 = 360863035130249235
# When the user is from the server ID 541484311354933258, their modmail thread will be placed in the category ID 542780020972716042
categoryAutomation.newThreadFromServer.541484311354933258 = 542780020972716042
```

#### closeMessage
**Default:** *None*  
If set, the bot sends this message to the user when the modmail thread is closed.

#### commandAliases
**Default:** *None*  
Custom aliases/shortcuts for commands. Example:
```ini
# !mv is an alias/shortcut for !move
commandAliases.mv = move
# !x is an alias/shortcut for !close
commandAliases.x = close
```

#### enableGreeting
**Default:** `off`  
If enabled, the bot will send a greeting DM to users that join the main server

#### errorOnUnknownInlineSnippet
**Default:** `on`  
If enabled, the bot will refuse to send any reply with an unknown inline snippet.  
See [allowInlineSnippets](#allowInlineSnippets) for more details.

#### fallbackRoleName
**Default:** *None*  
Role name to display in moderator replies if the moderator doesn't have a hoisted role

#### breakFormattingForNames
**Default:** `on`
Whether or not to escape formatting characters in usernames, such as `~~` for strikethrough, `__` for underlined etc.

#### greetingAttachment
**Default:** *None*  
Path to an image or other attachment to send as a greeting. Requires `enableGreeting` to be enabled.

#### greetingMessage
**Default:** *None*  
Message to send as a greeting. Requires `enableGreeting` to be enabled. Example:
```ini
greetingMessage[] = Welcome to the server!
greetingMessage[] = Remember to read the rules.
```

#### guildGreetings
Alias for [`serverGreetings`](#serverGreetings)

#### ignoreAccidentalThreads
**Default:** `off`  
If enabled, the bot attempts to ignore common "accidental" messages that would start a new thread, such as "ok", "thanks", etc.

#### inboxServerPermission
**Default:** `manageMessages`  
**Accepts multiple values.** Permission name, user id, or role id required to use bot commands on the inbox server.
See ["Permissions" on this page](https://abal.moe/Eris/docs/reference) for supported permission names (e.g. `kickMembers`).

#### inlineSnippetStart
**Default:** `{{`  
Symbol(s) to use at the beginning of an inline snippet. See [allowInlineSnippets](#allowInlineSnippets) for more details.

#### inlineSnippetEnd
**Default:** `}}`  
Symbol(s) to use at the end of an inline snippet. See [allowInlineSnippets](#allowInlineSnippets) for more details.

#### timeOnServerDeniedMessage
**Default:** `You haven't been a member of the server for long enough to contact modmail.`  
If `requiredTimeOnServer` is set, users that are too new will be sent this message if they try to message modmail.

#### logStorage
**Default:** `local`  
Controls how logs are stored. Possible values:
* `local` - Logs are served from a local web server via links
* `attachment` - Logs are sent as attachments
* `none` - Logs are not available through the bot

#### logOptions
Options for logs

##### logOptions.attachmentDirectory
**Default:** `logs`  
When using `logStorage = "attachment"`, the directory where the log files are stored

##### logOptions.allowAttachmentUrlFallback
**Default:** `off`  
When using `logStorage = "attachment"`, if enabled, threads that don't have a log file will send a log link instead.
Useful if transitioning from `logStorage = "local"` (the default).

#### mainGuildId
Alias for [mainServerId](#mainServerId)

#### mailGuildId
Alias for [inboxServerId](#inboxServerId)

#### mentionRole
**Default:** `none`  
**Accepts multiple values.** Role that is mentioned when new threads are created or the bot is mentioned.
Accepted values are `none`, `here`, `everyone`, or a role id.
Set to `none` to disable these pings entirely.

#### mentionUserInThreadHeader
**Default:** `off`  
If enabled, mentions the user messaging modmail in the modmail thread's header.

#### newThreadCategoryId
**Default:** *None*  
**Deprecated.** Same as `categoryAutomation.newThread`.

#### notifyOnMainServerJoin
**Default:** `on`  
If enabled, a system message will be posted into any open threads if the user joins a main server

#### notifyOnMainServerLeave
**Default:** `on`  
If enabled, a system message will be posted into any open threads if the user leaves a main server

#### pingOnBotMention
**Default:** `on`  
If enabled, the bot will mention staff (see `mentionRole` option) on the inbox server when the bot is mentioned on the main server.

#### pinThreadHeader
**Default:** `off`  
If enabled, the bot will automatically pin the "thread header" message that contains the user's details

#### plugins
**Default:** *None*  
**Accepts multiple values.** External plugins to load on startup. See [Plugins](plugins.md) for more information.

#### port
**Default:** `8890`  
Port to use for attachments (when `attachmentStorage` is set to `local`) and logs.  
Make sure to do the necessary [port forwarding](https://portforward.com/) and add any needed firewall exceptions so the port is accessible from the internet.

#### prefix
**Default:** `!`  
Prefix for bot commands

#### reactOnSeen
**Default:** `off`  
If enabled, the bot will react to messages sent to it with the emoji defined in `reactOnSeenEmoji`

#### reactOnSeenEmoji
**Default:** `📨`  
The emoji that the bot will react with when it sees a message.  Requires `reactOnSeen` to be enabled.  
Must be pasted in the config file as the Emoji representation and not as a unicode codepoint. Use `emojiName:emojiID` for custom emoji.

#### relaySmallAttachmentsAsAttachments
**Default:** `off`  
If enabled, small attachments from users are sent as real attachments rather than links in modmail threads.
The limit for "small" is 2MB by default; you can change this with the `smallAttachmentLimit` option.

#### requiredAccountAge
**Default:** *None*  
Required account age for contacting modmail (in hours). If the account is not old enough, a new thread will not be created and the bot will reply with `accountAgeDeniedMessage` (if set) instead.

#### requiredTimeOnServer
**Default:** *None*  
Required amount of time (in minutes) the user must be a member of the server before being able to contact modmail. If the user hasn't been a member of the server for the specified time, a new thread will not be created and the bot will reply with `timeOnServerDeniedMessage` (if set) instead.

#### responseMessage
**Default:** `Thank you for your message! Our mod team will reply to you here as soon as possible.`  
The bot's response to the user when they message the bot and open a new modmail thread.  
If you have a multi-line or otherwise long `responseMessage`, you might want to turn off [showResponseMessageInThreadChannel](#showResponseMessageInThreadChannel) to reduce clutter in the thread channel on the inbox server.

#### rolesInThreadHeader
**Default:** `off`  
If enabled, the user's roles will be shown in the modmail thread header

#### serverGreetings
**Default:** *None*  
When running the bot on multiple main servers, this allows you to set different greetings for each server. Example:
```ini
serverGreetings.94882524378968064.message = Welcome to server ID 94882524378968064!
serverGreetings.94882524378968064.attachment = greeting.png

serverGreetings.541484311354933258.message[] = Welcome to server ID 541484311354933258!
serverGreetings.541484311354933258.message[] = Second line of the greeting.
```

#### showResponseMessageInThreadChannel
**Default:** `on`  
Whether to show the [responseMessage](#responseMessage) sent to the user in the thread channel on the inbox server as well.  
If you have a multi-line or otherwise long `responseMessage`, it might be a good idea to turn this off to reduce clutter.

#### smallAttachmentLimit
**Default:** `2097152`  
Size limit of `relaySmallAttachmentsAsAttachments` in bytes (default is 2MB)

#### snippetPrefix
**Default:** `!!`  
Prefix for snippets

#### snippetPrefixAnon
**Default:** `!!!`  
Prefix to use snippets anonymously

#### status
**Default:** `Message me for help`  
The bot's status text. Set to `none` to disable.

#### statusType
**Default:** `playing`  
The bot's status type. One of `playing`, `watching`, `listening`, `streaming`.

#### statusUrl
**Default:** [nothing]  
The bot's Twitch url used for streaming status type. Must look like `https://twitch.tv/yourname`.

#### syncPermissionsOnMove
**Default:** `on`  
If enabled, channel permissions for the thread are synchronized with the category when using `!move`. Requires `allowMove` to be enabled.

#### createThreadOnMention
**Default:** `off`  
If enabled, the bot will automatically create a new thread for a user who pings it.

#### blockMessage
**Default** *None*  
Message to send to a user when they are blocked indefinitely.  
This message is also used for timed blocks if timedBlockMessage is not set.

#### timedBlockMessage
**Default** *None*  
Message to send to a user when they are blocked for a specific duration.
* You can use `{duration}` in the text to include the duration (e.g. `4 weeks, 2 days`)
* You can use `{timestamp}` in the text to create a Discord timestamp of the time the user is blocked until (e.g. `<t:{timestamp}:f>` would become `June 3, 2022 at 11:50 PM`)

#### unblockMessage
**Default** *None*  
Message to send to a user when they are unblocked immediately.  
This message is also used for timed unblocks if timedUnblockMessage is not set.

#### timedUnblockMessage
**Default** *None*  
Message to send to a user when they are scheduled to be unblocked after a specific amount of time.  
* You can use `{delay}` in the text to include the time until the user will be unblocked (e.g. `4 weeks, 2 days`)
* You can use `{timestamp}` in the text to create a Discord timestamp of the unblock time (e.g. `&lt;t:{timestamp}:f&gt;` would become `June 3, 2022 at 11:50 PM`)

#### blockedReply
**Default** *None*  
Message that the bot replies with if a user tries to message the bot while blocked.

#### threadTimestamps
**Default:** `off`  
If enabled, modmail threads will show accurate UTC timestamps for each message, in addition to Discord's own timestamps.
Logs show these always, regardless of this setting.

#### typingProxy
**Default:** `off`  
If enabled, any time a user is typing to modmail in their DMs, the modmail thread will show the bot as "typing"

#### typingProxyReverse
**Default:** `off`  
If enabled, any time a moderator is typing in a modmail thread, the user will see the bot "typing" in their DMs

#### updateNotifications
**Default:** `on`  
If enabled, the bot will automatically check for new bot updates periodically and notify about them at the top of new modmail threads

#### updateNotificationsForBetaVersions
**Default:** `off`  
If enabled, update notifications will also be given for new beta versions

#### url
**Default:** *None*  
URL to use for attachment and log links. Defaults to `http://IP:PORT/`.

#### useNicknames
**Default:** `off`  
If enabled, mod replies will use their nicknames (on the inbox server) instead of their usernames

#### useGitForGitHubPlugins
**Default:** `off`  
If enabled, GitHub plugins will be installed with Git rather than by downloading the archive's tarball.  
This is useful if you are installing plugins from private repositories that require ssh keys for authentication.

## Advanced options

#### extraIntents
**Default:** *None*  
If you're using or developing a plugin that requires extra [Gateway Intents](https://discord.com/developers/docs/topics/gateway#gateway-intents),
you can specify them here.

Example:
```ini
extraIntents[] = guildPresences
extraIntents[] = guildMembers
```

#### dbType
**Default:** `sqlite`  
Specifies the type of database to use. Valid options:
* `sqlite` (see also [sqliteOptions](#sqliteOptions) below)
* `mysql` (see also [mysqlOptions](#mysqlOptions) below)

Other databases are *not* currently supported.

#### sqliteOptions
Object with SQLite-specific options

##### sqliteOptions.filename
**Default:** `db/data.sqlite`  
Can be used to specify the path to the database file

#### mysqlOptions
Object with MySQL-specific options

##### mysqlOptions.host
**Default:** `localhost`

##### mysqlOptions.port
**Default:** `3306`

##### mysqlOptions.user
**Default:** *None*  
Required if using `mysql` for `dbType`. MySQL user to connect with.

##### mysqlOptions.password
**Default:** *None*  
Required if using `mysql` for `dbType`. Password for the MySQL user specified above.

##### mysqlOptions.database
**Default:** *None*  
Required if using `mysql` for `dbType`. Name of the MySQL database to use.

## config.ini vs config.json
Earlier versions of the bot instructed you to create a `config.json` instead of a `config.ini`.
**This is still fully supported, and will be in the future as well.**
However, there are some differences between `config.ini` and `config.json`.

### Formatting
*See [the example on the Wikipedia page for JSON](https://en.wikipedia.org/wiki/JSON#Example)
for a general overview of the JSON format.*

* In `config.json`, all text values and IDs need to be wrapped in quotes, e.g. `"mainServerId": "94882524378968064"`
* In `config.json`, all numbers (other than IDs) are written without quotes, e.g. `"port": 3000`

### Toggle options
In `config.json`, valid values for toggle options are `true` and `false` (not quoted),
which correspond to `on` and `off` in `config.ini`.

### "Accepts multiple values"
Multiple values are specified in `config.json` using arrays:
```json
{
  "inboxPermission": [
    "kickMembers",
    "manageMessages"
  ]
}
```

### Multiple lines of text
Since `config.json` is parsed using [JSON5](https://json5.org/), multiple lines of text are supported
by escaping the newline with a backslash (`\ `):
```json5
{
  "greetingMessage": "Welcome to the server!\
This is the second line of the greeting."
}
```

## Other formats
Loading config values programmatically is also supported.
Create a `config.js` in the bot's folder and export the config object with `module.exports`.
All other configuration files take precedence, so make sure you don't have both.

## Environment variables
Config options can be passed via environment variables.

To get the name of the corresponding environment variable for an option, convert the option to SNAKE_CASE with periods
being replaced by two underscores and add `MM_` as a prefix. If adding multiple values for the same option, separate the
values with two pipe characters: `||`.

Examples:
* `mainServerId` -> `MM_MAIN_SERVER_ID`
* `commandAliases.mv` -> `MM_COMMAND_ALIASES__MV`
* From:  
  ```ini
  inboxServerPermission[] = kickMembers
  inboxServerPermission[] = manageMessages
  ```  
  To:  
  `MM_INBOX_SERVER_PERMISSION=kickMembers||manageMessages`

The `port` option also accepts the environment variable `PORT` without a prefix, but `MM_PORT` takes precedence.

You can also supply environment variables by creating a file called `.env` in the bot's directory.
