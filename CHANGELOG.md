# Changelog

## v2.17.0
* Add `mentionUserInThreadHeader` option. When set to `true`, mentions the thread's user in the thread header. Fixes #152.
* Add `botMentionResponse` option. If set, the bot auto-responds to bot mentions with this message. Fixes #143.
* Fix member info sometimes missing in thread header. Thanks @Akhawais (#136)! 
* Add support for role and user IDs in inboxServerPermission instead of just permission names
* Allow specifying multiple values (an array) for inboxServerPermission. Members will be considered "staff" if they pass any of the values.
* Update Eris to 0.9.0, Knex to 0.15.2
* Add support for sending anonymous snippets. By default, you can do this by using `!!!` instead of `!!`. Fixes #82.
* Add `snippetPrefixAnon` option
* Add `allowUserClose` option. When set to `true`, users can use the close command to close threads by themselves.
* Fix `allowMove` missing from README. Thanks @AndreasGassmann (#126)!

## v2.16.0
* Add support for a .js config file (export config with `module.exports`)

## v2.15.2
* Update several other packages as well

## v2.15.1
* Update `node-sqlite3` dependency to hopefully fix installation issues on some setups

## v2.15.0
* Add `smallAttachmentLimit` config option to control the max size of attachments forwarded by `relaySmallAttachmentsAsAttachments`
* Fix crash when `closeMessage` failed to send
* Handle webserver errors gracefully

## v2.14.1
* Don't alert for main server pings if the pinger is a bot

## v2.14.0
* Changed `requiredAccountAge` to be in hours instead of days

## v2.13.0
* Added `requiredAccountAge` and `accountAgeDeniedMessage` options for restricting how new accounts can message modmail

## v2.12.0
* Added `closeMessage` option. This option can be used to send a message to the user when their modmail thread is closed.
* Documented `pingOnBotMention` option

## v2.11.1
* Fixed greetings not being sent since multi-server support was added in 2.9.0

## v2.11.0
* Config files are now parsed using [JSON5](https://json5.org/), allowing you to use comments, trailing commas, and other neat things in your config.json
* When using multiple main guilds, the originating guild name is now always included at the top of the thread (if possible).
Previously, if the user that messaged modmail was on only one of the guilds, the guild name would not be shown at the top.
* Fixed crash when a user edited a message in their DMs with modmail without an open thread
* Small fixes to category name matching when using `!move`
* Fixed crash when the bot was unable to send an auto-response to a user
* Added option `pingOnBotMention` (defaults to `true`) that allows you to control whether staff are pinged when the bot is mentioned
* Long messages are now chunked so they don't fail to send due to added length from e.g. user name

## v2.10.1
* Changed timed close default unit from seconds to minutes.
This means that doing e.g. `!close 30` now closes the thread in 30 *minutes*, not seconds.

## v2.10.0
* Added `!alert`  
Using `!alert` in a modmail thread will ping you the next time the thread gets a new reply.
Use `!alert cancel` to cancel.

## v2.9.1
* If using multiple main guilds, the originating server is now specified in bot mention notifications

## v2.9.0
* Added multi-server support.  
Multi-server support allows you to set an array of ids in mainGuildId.
Nickname and join date will be displayed for each main guild the user is in.
* Information posted at the top of modmail threads now also includes time since the user joined the guild(s)
* Added `!id`  
`!id` posts the user ID of the current thread. Useful on mobile when you need to get the user ID.
* Added `!newthread`  
`!newthread <userid>` opens a new thread with the specified user
* Fixed a crash when the bot was unable to send a greeting message due to the user's privacy options

## v2.8.0
* Added a `!version` command for checking the version of the bot you're running

## v2.7.0
* Split more code from main.js to individual module files

## v2.6.0
* Warn the user if new dependencies haven't been installed
* `!close` now supports `d` for days in the delay
* `!close` is now stricter about the time format

## v2.5.0
* Commands used in inbox threads are now saved in logs again
* Moved more of the code to individual plugin files

## v2.4.1-v2.4.4
* Fix errors on first run after upgrading to v2.2.0
* Various other fixes

## v2.4.0
* Add thread suspending. A modmail thread can now be suspended with `!suspend`. Suspended threads will function as closed until unsuspended with `!unsuspend`.

## v2.3.2
* Auto-close threads if their modmail channel is deleted

## v2.3.1
* Fixed incorrect default value for `mentionRole` (was `null`, should've been `"here"`)

## v2.3.0
* Added `mentionRole` configuration option ([#59](https://github.com/Dragory/modmailbot/pull/59)). This option can be used to set the role that is pinged when new threads are created or the bot is mentioned. See README for more details.

## v2.2.0
* Added the ability to schedule a thread to close by specifying a time after `!close`, e.g. `!close 1h`. The scheduling is cancelled if a new message is sent to or received from the user.

## v2.1.0
* Added typing proxy ([#48](https://github.com/Dragory/modmailbot/pull/48)):
  * If the `typingProxy` config option is enabled, any time a user is typing to modmail in their DMs, the modmail thread will show the bot as "typing" 
  * If the `typingProxyReverse` config option is enabled, any time a moderator is typing in a modmail thread, the user will see the bot "typing" in their DMs

## v2.0.1
* The link to the current thread's log is no longer posted to the top of the thread. Use `!loglink` instead.

## v2.0.0
* Rewrote large parts of the code to be more modular and maintainable. There may be some new bugs because of this - please report them through GitHub issues if you encounter any!
* Threads, logs, and snippets are now stored in an SQLite database. The bot will migrate old data on the first run.
* Small attachments (<2MB) from users can now be relayed as Discord attachments in the modmail thread with the `relaySmallAttachmentsAsAttachments` config option. Logs will have the link as usual.
* Fixed system messages like pins in DMs being relayed to the thread
* Fixed channels sometimes being created without a category even when `newThreadCategoryId` was set
* Removed timestamps from threads by default. Logs will still have accurate timestamps. Can be re-enabled with the `threadTimestamps` config option.
* Added `!move` command to move threads between categories. Can be enabled with the `allowMove` config option, disabled by default.

## Sep 22, 2017
* Added `newThreadCategoryId` option. This option can be set to a category ID to place all new threads in that category.

## Sep 20, 2017
* Fixed crash when the bot was unable to find or create a modmail thread
* Reduced error log spam in case of network errors from Eris
* Fixed unintended error when a message was ignored due to an "accidental thread" word

## Sep 19, 2017
* Added `logChannelId` option
* Some code clean-up. Please open an issue if you encounter any bugs!
* The bot now throws an error for unknown options in `config.json` (assuming they're typos) and tells you if you haven't configured the token or mail guild id.

## Aug 3, 2017
* Fixed user nicknames not showing in new threads
* The "manageRoles" permission is no longer required to use commands on the inbox server.  
This can be configured with the `inboxServerPermission` config option.

## July 24, 2017
* Commands are now case-insensitive (so !close, !Close, and !CLOSE all work)
* The before/after prefixes in edit notifications are now the same length, making it easier to spot the edited part
* Non-ASCII names should now result in better channel names (not just "unknown")

## May 18, 2017
* Identical edits are now ignored
* New thread notification (with @ here ping) is now posted in the thread instead of the inbox server default channel
* Thread close notifications no longer ping the user who closed the thread
* Received attachments are now only linked once the bot has saved them (should fix embeds)
* Replies now use your nickname, if any
* Several messages are now ignored for thread creation ("ok", "thanks", and similar)
* Logs from !logs are now sorted in descending order (newest first)

## Feb 15, 2017
More info is now available at the beginning of modmail threads.

## Feb 10, 2017
Major rewrite. Includes anonymous replies (!ar), stability improvements, and server greeting feature.
