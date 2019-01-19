# Modmail for Discord
A bot for [Discord](https://discordapp.com/) that allows users to DM the bot to contact the server's entire mod team.
These DMs get relayed to a modmail server where each user gets their own channel, or "thread".
Moderators and admins can then reply to these threads, and these responses are relayed back to the original user as a DM.

Inspired by Reddit's modmail system.

### NOTE! If you're upgrading from a version prior to Feb 24 2018:
* Take backups
* Remove the `node_modules` directory
* Run `npm install` again
* Follow the on-screen instructions after `npm start`

## Setup
1. Install Node.js 8.9.4 (LTS) or higher
2. Clone or download this repository
3. Create a Discord server to be used as the modmail inbox
4. Make a copy of the file `config.example.json` in the same folder and name the copy `config.json`. Open the file and fill in the values.
   - You can also find more configurable options at the end of this page!
5. Install dependencies: `npm install`
6. Add bot to servers, and make sure to give it proper permissions on the mail server.
7. Run the bot: `npm start`

## Changelog
See [CHANGELOG.md](CHANGELOG.md)

## Commands

##### Anywhere on the modmail inbox server
`!logs <user>` Lists previous modmail logs with the specified user  
`!block <user>` Blocks the specified user from using modmail  
`!unblock <user>` Unblocks the specified user from using modmail  
`!s <shortcut> <text>` Adds a snippet (a canned response). See below for how to use it.  
`!edit_snippet <shortcut> <text>` Edits an existing snippet (alias `!es`)  
`!delete_snippet <shortcut>` Deletes the specified snippet (alias `!ds`)  
`!snippets` Lists all available snippets
`!version` Print the version of the bot you're running  
`!newthread <user>` Opens a new thread with the specified user

##### Inside a modmail thread
`!reply <text>` Sends a reply to the user in the format "(Role) User: text" (alias `!r`)  
`!anonreply <text>` Sends an anonymous reply to the user in the format "Role: text" (alias `!ar`)  
`!close <time>` Closes the modmail thread. If a time is specified, the thread is scheduled to be closed later. Scheduled closing is cancelled if a message is sent to or received from the user.  
`!logs` Lists previous modmail logs with this user  
`!block` Blocks the user from using modmail  
`!unblock` Unblocks the user from using modmail  
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
|accountAgeDeniedMessage|"Your Discord account is not old enough to contact modmail."|See `requiredAccountAge` above|
|allowMove|false|If enabled, allows you to move the thread to another category using `!move <category>`|
|allowUserClose|false|If set to true, users can use the close command to close threads by themselves from their DMs with the bot|
|alwaysReplyAnon|false|If `alwaysReply` is set to true, this option controls whether the auto-reply is anonymous|
|alwaysReply|false|If set to true, all messages in modmail threads will be relayed back to the user, even ones without `!r`|
|botMentionResponse|None|If set, the bot auto-responds to bot mentions with this message|
|closeMessage|None|The bot's message to the user when the thread is closed|
|enableGreeting|false|Set to true to send a welcome message to new main guild members. Requires `mainGuildId` to be set.|
|greetingAttachment|None|Path to an image or other attachment to send along with the greeting|
|greetingMessage|None|Text content of the welcome message|
|ignoreAccidentalThreads|false|If set to true, the bot attempts to ignore common "accidental" messages that would start a new thread, such as "ok", "thanks", etc.|
|inboxServerPermission|None|Permission required to use bot commands on the inbox server|
|mentionRole|"here"|Role that is mentioned when new threads are created or the bot is mentioned. Accepted values are "here", "everyone", or a role id as a string. Set to null to disable these pings entirely.|
|mentionUserInThreadHeader|false|If set to true, mentions the thread's user in the thread header|
|newThreadCategoryId|None|ID of the category where new modmail thread channels should be placed|
|pingOnBotMention|true|If enabled, the bot will mention staff (see mentionRole above) on the inbox server when the bot is mentioned on the main server.|
|port|8890|Port from which to serve attachments and logs|
|prefix|"!"|Prefix for bot commands|
|relaySmallAttachmentsAsAttachments|false|Whether to relay small attachments from users as native attachments rather than links in modmail threads|
|requiredAccountAge|None|Required account age for contacting modmail (in hours). If the account is not old enough, a new thread will not be created and the bot will reply with `accountAgeDeniedMessage` (if set) instead.|
|responseMessage|"Thank you for your message! Our mod team will reply to you here as soon as possible."|The bot's response to DMs that start a new thread|
|smallAttachmentLimit|2097152|Size limit of `relaySmallAttachmentsAsAttachments`, in bytes (default is 2MB)|
|snippetPrefix|"!!"|Prefix to use snippets|
|snippetPrefixAnon|"!!!"|Prefix to use snippets anonymously|
|status|"Message me for help"|The bot's "Playing" text|
|threadTimestamps|false|Whether to show custom timestamps in threads, in addition to Discord's own timestamps. Logs always have accurate timestamps, regardless of this setting.|
|typingProxy|false|If enabled, any time a user is typing to modmail in their DMs, the modmail thread will show the bot as "typing"|
|typingProxyReverse|false|If enabled, any time a moderator is typing in a modmail thread, the user will see the bot "typing" in their DMs|
|url|None|URL to use for attachment and log links. Defaults to `IP:PORT`|
|useNicknames|false|If set to true, mod replies will use their nickname (on the inbox server) instead of their username|
