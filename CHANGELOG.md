# Changelog
For instructions on how to update the bot, see **[✨ Updating the bot](docs/updating.md)**

## v3.7.0 (2023-09-12)
* Added support for Node.js 18 and higher
* Added `!realreply` / `!rr` command ([#763](https://github.com/Dragory/modmailbot/pull/763))
  * This command always replies with the moderator's name, even if `forceAnon` is enabled
* Fixed messages blocked by Discord crashing the bot ([#730](https://github.com/Dragory/modmailbot/pull/730))
* Stickers are now properly embedded ([#765](https://github.com/Dragory/modmailbot/pull/765))
* Updated Eris and other dependencies
  * This should resolve errors with stage channels and some other new features
* Other small fixes ([#774](https://github.com/Dragory/modmailbot/pull/774), [#772](https://github.com/Dragory/modmailbot/pull/772), [#771](https://github.com/Dragory/modmailbot/pull/771), [#750](https://github.com/Dragory/modmailbot/pull/750))

## v3.6.1
* Fixed inline replies not working with alwaysReply or snippets
* Fixed buggy note display in thread header

## v3.6.0
* The logChannel message for a closed thread now also contains a summary of the number of messages in that thread (by LilyWonhalf)
* 3 new plugin hooks (by LilyWonhalf):
  * `afterNewMessageReceived`
  * `afterThreadCloseScheduled`
  * `afterThreadCloseScheduleCanceled`
* All plugin message formatters can now be asynchronous
* Environment variables for config can now also be supplied by a `.env` file (by Eight8-7020)
* Fixed bug that broke message formatters (including the embeds plugin) in 3.5.0
* Fixed ERR_PACKAGE_PATH_NOT_EXPORTED error on Node.js 17
* Updated "engines" values in package.json
* Updated outdated transitive dependencies

## v3.5.0

**New features**
* Added support for user notes (by bycop)
* Added support for streaming status (by GeekCornerGH)
* Added `updateMessagesLive` option to show user edits/deletions directly in the original message (by cAttte)
* Added option to remove ("break") markdown formatting in names within a thread (enabled by default) (by DarkView)
* Added options to send a message to the user when they are blocked (by DarkView + Dragory)
  * `blockMessage` is sent to the user when they are blocked
  * `timedBlockMessage` is sent to the user when they are blocked temporarily
  * `unblockMessage` is sent to the user when they are unblocked
  * `timedUnblockMessage` is sent to the user when they are scheduled to be unblocked later
  * `blockedReply` is sent to the user if they try to message the bot while blocked
* Added ban/unban detection to user leave/join notifications (by DarkView)
* Added functionality to recover DMs sent while the bot is offline (by DarkView)
* Added support for sending/receiving inline replies

**Plugins**
* New plugin hook: `beforeNewMessageReceived` (by LilyWonhalf)
* Added `channelName` to `beforeNewThreadHook`'s `opts` to allow plugins to change the name of the modmail channel before it's created (by LilyWonhalf)

**Fixes, tweaks, and backend changes**
* Updated to Eris 0.17.0
* Added custom text if user has no logs when using !logs (by YetAnotherConnor)
* `!alert`, `!id`, `!loglink`, and `!role` can now be used in suspended threads
* Fixed bug where the first staff reply would say `null` instead of `1` (by dtslubbersen)
* Fixed `mentionRole` config option not allowing multiple values (by Teekeks)
* Fixed user pings not working when using `{userMention}` in `botMentionResponse` (by Rewish497)
* Fixed error in database migrations with a large database (by PichotM)
* Fixed links in documentation to point to discord.com rather than discordapp.com (by almeidx)
* Fixed crash if categoryAutomation.newThread was not set (by DarkView)
* Fixed crash if a message with only the snippet prefix is posted (by DarkView)
* Fixed crash when trying to report configuration issues (by DarkView)
* Fixed crash when trying to create a channel with a disallowed name on a server in Server Discovery (by Deldaflyer)
* Fixed edited content for older messages not showing (by Dragory)

## v3.4.1
* Fixed `npm` requiring Git with v3.4.0

## v3.4.0
* Updated Eris to fix crash with text in voice channels
  * See also: https://discord.com/blog/text-in-voice-chat-channel-announcement-tiv
* Updated outdated dependencies
  * This also adds support for Node.js 16

## v3.3.2
* Fix database warning when updating to v3.3.1 or higher

## v3.3.1
* Fix crash when a user joins or leaves a [stage channel](https://blog.discord.com/captivate-your-community-with-stage-channels-46bbb756e89b)
* Fix global moderator display role overrides (i.e. `!role` used outside of a thread) not working

## v3.3.0

**Breaking changes:**
* The default value for [`inboxServerPermission`](docs/configuration.md#inboxServerPermission) is now `manageMessages`
  * This means that after updating, if you haven't set `inboxServerPermission` in your `config.ini`,
    only those members with the "Manage Messages" permission on the inbox server will be able to use the bot's commands
* The default value for [`mentionRole`](docs/configuration.md#mentionRole) is now `none`
  * To turn `@here` pings back on for new threads, set `mentionRole = here` in your `config.ini`

**General changes:**
* New option: `showResponseMessageInThreadChannel`
  * Controls whether the bot's response message is shown in the thread channel
* Bot and Node.js version is now shown on bot start-up
* `!close silent` can now also be used with `!close -silent` and `!close -s` ([#528](https://github.com/Dragory/modmailbot/pull/528) by [@SnowyLuma](https://github.com/SnowyLuma))
* `!close cancel` can now also be used with `!close -cancel` and `!close -c`
* `config.example.ini` now contains several common options by default
* When starting the bot via command line, you can now specify which config file to load with the `--config`/`-c` CLI option
  * E.g. `npm start -- -c my-other-config.ini` (note the `--` between `npm start` and the option)
* Updated bot dependencies

**Plugins:**
* Plugins are now installed before connecting to the Discord Gateway
* Fix GitHub-based NPM plugins requiring Git to be installed to work
  * If you need to install GitHub-based plugins with Git after this change, set `useGitForGitHubPlugins = on` in your config
* Plugin installation errors are no longer truncated

## v3.2.0

**General changes:**
* Updated to Eris 0.14.0, which changes the API url used to `discord.com` instead of `discordapp.com`
  * API calls to `discordapp.com` are being phased out on Nov 7, 2020
  * This means that bot versions prior to v3.2.0 *might stop working* on Nov 7, 2020
* New options: `allowBlock`, `allowSuspend`, `allowSnippets` ([#498](https://github.com/Dragory/modmailbot/pull/498) by [@lirolake](https://github.com/lirolake))
  * These all default to `on`
* Improved error messages and error handling
  * Removes at least one instance of ECONNRESET errors
* Fixed issue where NPM plugins would not install on Windows
* Fixed issue where mentions by the bot were not working in certain situations ([#496](https://github.com/Dragory/modmailbot/pull/496) by [@DarkView](https://github.com/DarkView))
* Fixed issue where long system messages (primarily from plugins) would not get chunked properly and would throw an error instead

**Plugins:**
* Make sure to check the [Eris 0.14.0 changelog](https://github.com/abalabahaha/eris/releases/tag/0.14.0) for any changes that might affect your plugins
* The `attachments` object now includes a new `saveAttachment()` function to save arbitrary attachments using the bot's `attachmentStorage`
* Fixed the `ignoreHooks` option for `threads.createNewThreadForUser()` not working
* Fixed `!newthread` throwing an error if a plugin cancels thread creation in the `beforeNewThread` hook

## v3.1.0
* Each thread is now assigned a number, increasing by 1 each thread. This can be used in commands like `!log` in place of the full thread ID.
* New option: `autoAlert`
  * When enabled, the last moderator to reply to a modmail thread will be automatically alerted when the thread gets a new reply
  * Auto-alert kicks in after a small delay after the reply to prevent alerts in the middle of an ongoing conversation. This delay is set by the option `autoAlertDelay`.
* New option: `pinThreadHeader`
  * When enabled, the bot will automatically pin the "thread header" message that contains the user's details
* `!thread` is now an alias for `!log`/`!loglink`
* Fix some bugs with the `mentionRole` option
* `mentionRole = off` now behaves the same as `mentionRole = none`
* Fixed snippet previews (via `!snippet snippet_name_here`) sometimes cutting off the first word ([#491](https://github.com/Dragory/modmailbot/pull/491) by @Gugu7264)
* When calling `threads.createNewThreadForUser()`, plugins can now specify `mentionRole` as one of the options to override the default mentionRole config option value for the new thread

## v3.0.3
* Fix inline snippets only working once per reply

## v3.0.2
* Fix `npm ci` and `start.bat` failing when Git is not installed

## v3.0.1
* Fix local attachments not being accessible through the bot's links

## v3.0.0
*This changelog also includes changes from v2.31.0-beta.1 and v2.31.0-beta.2*

**General changes:**
* **BREAKING CHANGE:** Logs from Modmail versions prior to Feb 2018 are no longer converted automatically
  * To update from a Modmail version from before Feb 2018, update to `v2.30.1` and run the bot once first. Then you can update to version v3.0.0 and later.
* **BREAKING CHANGE:** Added support for Node.js 13 and 14, **dropped support for Node.js 10 and 11**
  * The supported versions are now 12, 13, and 14
* **BREAKING CHANGE:** The bot now requests the necessary [Gateway Intents](https://discord.com/developers/docs/topics/gateway#gateway-intents)
    * **This includes the privileged "Server Members Intent"**, which is used for server greetings/welcome messages.  
      This means that [**you need to turn on "Server Members Intent"**](docs/server-members-intent-2.png) on the bot's page on the Discord Developer Portal.
* Added support for editing and deleting staff replies via new `!edit` and `!delete` commands
  * This is **enabled by default**
  * This can be disabled with the `allowStaffEdit` and `allowStaffDelete` options
  * Only the staff member who sent the reply can edit/delete it
* Renamed the following options. Old names are still supported as aliases, so old config files won't break.
  * `mainGuildId` => `mainServerId`
  * `mailGuildId` => `inboxServerId`
  * `categoryAutomation.newThreadFromGuild` => `categoryAutomation.newThreadFromServer`
  * `guildGreetings` => `serverGreetings`
* Moderators can now set the role they'd like to be displayed with their replies ("display role") by default and on a per-thread basis by using `!role`
  * Moderators can only choose roles they currently have
  * You can view your current display role by using `!role`
    * If you're in a modmail thread, this will show your display role for that thread
    * If you're *not* in a modmail thread, this will show your *default* display role
  * You can set the display role by using `!role <role name>`, e.g. `!role Interviewer`
    * If you're in a modmail thread, this will set your display role for that thread
    * If you're *not* in a modmail thread, this will set your *default* display role
  * You can reset the display role by using `!role reset`
    * If you're in a modmail thread, this will reset your display role for that thread to the default
    * If you're *not* in a modmail thread, this will reset your *default* display role
  * This feature can be disabled by setting `allowChangingDisplayRole = off`
* New option: `fallbackRoleName`
  * Sets the role name to display in moderator replies if the moderator doesn't have a hoisted role
* New option `logStorage`
  * Allows changing how logs are stored
  * Possible values are `local` (default), `attachment`, and `none`
* New **default** attachment storage option: `original`
  * This option simply links the original attachment and does not rehost it in any way
* New option `reactOnSeen` ([#398](https://github.com/Dragory/modmailbot/pull/398) by @Eegras)
  * When enabled, the bot will react to user DMs with a checkmark when they have been received
  * The reaction emoji can be customized with the `reactOnSeenEmoji` option
* New option `createThreadOnMention` ([#397](https://github.com/Dragory/modmailbot/pull/397) by @dopeghoti)
  * When enabled, a new modmail thread will be created whenever a user mentions/pings the bot on the main server
  * As with `pingOnBotMention`, staff members are automatically ignored
* New option `statusType`
  * Allows changing the bot's status type between "Playing", "Watching", "Listening"
  * Possible values are `playing` (default), `watching`, `listening`
* New option `anonymizeChannelName` ([#457](https://github.com/Dragory/modmailbot/pull/457) by @funkyhippo)
  * Off by default. When enabled, instead of using the user's name as the channel name, uses a random channel name instead.
  * Useful on single-server setups where people with modified clients can see the names of even hidden channels
* New option `updateNotificationsForBetaVersions`
  * Off by default. When enabled, also shows update notifications for beta versions.
  * By default, update notifications are only shown for stable releases
* Snippets can now be included *within* messages by wrapping the snippet name in curly braces
  * E.g. `!r Hello! {{rules}}` to include the snippet `rules` in the place of `{{rules}}`
  * The symbols used can be changed with the `inlineSnippetStart` and `inlineSnippetEnd` options
  * This feature can be disabled by setting `allowInlineSnippets = off` in your config
  * By default, the bot will refuse to send a reply with an unknown inline snippet. To disable this behavior, set `errorOnUnknownInlineSnippet = off`.
* `mentionRole` can now be set to `none`
* Removed the long-deprecated `logDir` option
* The bot now notifies if the user leaves/joins the server ([#437](https://github.com/Dragory/modmailbot/pull/437) by @DarkView)
* Replies are now limited in length to the Discord message limit (including the moderator name and role in the DM sent to the user)
  * This is to fix issues with `!edit` and `!delete` when a reply spanned multiple messages
* DM channel and message IDs are now stored
  * Use `!loglink -v` to view these in logs
  * Use `!dm_channel_id` in an inbox thread to view the DM channel ID
  * *DM channel and message IDs are primarily useful for Discord T&S reports*
* Unless `fallbackRoleName` is set, anonymous replies without a role will no longer display "Moderator:" at the beginning of the message
* Plugins can now also be installed from NPM modules
  * Example: `plugins[] = npm:some-plugin-package`
* "Connection reset by peer" error (code 1006) is now handled gracefully in the background and no longer crashes the bot
* Multiple people can now sign up for reply alerts (`!alert`) simultaneously ([#373](https://github.com/Dragory/modmailbot/pull/373) by @DarkView)
* The bot now displays a note if the user sent an application invite, e.g. an invite to listen along on Spotify
* The bot now displays a note if the user sent a sticker, including the sticker's name
* Log formatting is now more consistent and easier to parse with automated tools
* Messages in modmail threads by other bots are no longer ignored, and are displayed in logs
* Added official support for MySQL databases. Refer to the documentation on `dbType` for more details.
  * This change also means the following options are **no longer supported:**
    * `dbDir` (use `sqliteOptions.filename` to specify the database file instead)
    * `knex` (see `dbType` documentation for more details)
* System messages sent to the user, such as `responseMessage` and `closeMessage`, are now shown in the thread channel
* Fixed `!edit_snippet` crashing the bot when leaving the new snippet text empty
* Fix crash when using `!newthread` with the bot's own ID (fixes [#452](https://github.com/Dragory/modmailbot/issues/452))
* Fix occasional bug with expiring blocks where the bot would send the expiry message multiple times
* Fix bug with long messages being cut off and only the last part being shown in the thread (most evident in long DMs and e.g. !edit notifications of long messages)
* Fix messages containing *only* a large number (e.g. an ID) rounding the number
* Several common errors are now handled silently in the background, such as "Connection reset by peer"

**Plugins:**
* Added support for replacing default message formatting in threads, DMs, and logs
* Added support for *hooks*. Hooks can be used to run custom plugin code before/after specific moments.
  * Two hooks are initially available: `beforeNewThread` and `afterThreadClose`
  * See plugin documentation for mode details
* If your plugin requires special gateway intents, use the new `extraIntents` config option
* Plugins can now access the bot's web server via a new `webserver` property in plugin arguments
* Plugins can now store *metadata* in threads and thread messages via new `setMetadataValue` and `getMetadataValue` functions on `Thread` and `ThreadMessage` objects
* Plugins can access the API for setting/getting moderator display roles via a new `displayRoles` property in plugin arguments
* System messages now have a formatter
* The `beforeNewThread` hook's parameters now also include the original DM message object
* Plugins can now access the `threads` module (via `pluginApi.threads`) to create and fetch threads
* Plugins can now access the `displayRoles` module (via `pluginApi.displayRoles`) to get, set, and reset display role overrides for moderators,
  and to get the final role that will be displayed in moderator replies (by default or per-thread)

**Internal/technical updates:**
* Updated Eris to v0.13.3
* Updated several other dependencies
* New JSON Schema based config parser that validates each option and their types more strictly to prevent undefined behavior
* Database migrations are now stored under `src/`
* Modmail now uses [Express](https://expressjs.com/) as its web server for logs/attachments
* Unhandled rejections are now handled the same as uncaught exceptions, and *will* crash the bot

## v2.31.0-beta.2
**This is a beta release, bugs are expected.**  
Please report any bugs you encounter by [creating a GitHub issue](https://github.com/Dragory/modmailbot/issues/new)!

**General changes:**
* **BREAKING CHANGE:** Logs from Modmail versions prior to Feb 2018 are no longer converted automatically
  * To update from a Modmail version from before Feb 2018, update to `v2.30.1` and run the bot once first. Then you can update to later versions.
* New option `logStorage`
  * Allows changing how logs are stored
  * Possible values are `local` (default), `attachment`, and `none`
* New option `statusType`
  * Allows changing the bot's status type between "Playing", "Watching", "Listening"
  * Possible values are `playing` (default), `watching`, `listening`
* New option `anonymizeChannelName` ([#457](https://github.com/Dragory/modmailbot/pull/457) by @funkyhippo)
  * Off by default. When enabled, instead of using the user's name as the channel name, uses a random channel name instead.
  * Useful on single-server setups where people with modified clients can see the names of even hidden channels
* New option `updateNotificationsForBetaVersions`
  * Off by default. When enabled, also shows update notifications for beta versions.
  * By default, update notifications are only shown for stable releases
* `mentionRole` can now be set to `none`
* The bot now notifies if the user leaves/joins the server ([#437](https://github.com/Dragory/modmailbot/pull/437) by @DarkView)
* Fix crash when using `!newthread` with the bot's own ID (fixes [#452](https://github.com/Dragory/modmailbot/issues/452))

**Plugins:**
* New hook: `afterThreadClose`
  * Called right after a thread is closed with the thread's id
* You can now add custom log storage types

**Internal/technical updates:**
* Database migrations are now stored under `src/`

## v2.31.0-beta.1
**This is a beta release, bugs are expected.**  
Please report any bugs you encounter by [creating a GitHub issue](https://github.com/Dragory/modmailbot/issues/new)!

**General changes:**
* **BREAKING CHANGE:** Added support for Node.js 13 and 14, dropped support for Node.js 10 and 11
  * The supported versions are now 12, 13, and 14
* **BREAKING CHANGE:** The bot now requests the necessary [Gateway Intents](https://discord.com/developers/docs/topics/gateway#gateway-intents)
  * **This includes the privileged "Server Members Intent"**, which is used for server greetings/welcome messages.  
    This means that [**you need to turn on "Server Members Intent"**](docs/server-members-intent-2.png) on the bot's page on the Discord Developer Portal.
* Renamed the following options. Old names are still supported as aliases, so old config files won't break.
  * `mainGuildId` => `mainServerId`
  * `mailGuildId` => `inboxServerId`
  * `categoryAutomation.newThreadFromGuild` => `categoryAutomation.newThreadFromServer`
  * `guildGreetings` => `serverGreetings`
* Added support for editing and deleting staff replies
  * This is **enabled by default**
  * This can be disabled with the `allowStaffEdit` and `allowStaffDelete` options
  * Only the staff member who sent the reply can edit/delete it
* New option `reactOnSeen` ([#398](https://github.com/Dragory/modmailbot/pull/398) by @Eegras)
  * When enabled, the bot will react to user DMs with a checkmark when they have been received
  * The reaction emoji can be customized with the `reactOnSeenEmoji` option
* New option `createThreadOnMention` ([#397](https://github.com/Dragory/modmailbot/pull/397) by @dopeghoti)
  * When enabled, a new modmail thread will be created whenever a user mentions/pings the bot on the main server
  * As with `pingOnBotMention`, staff members are automatically ignored
* New **default** attachment storage option: `original`
  * This option simply links the original attachment and does not rehost it in any way
* DM channel and message IDs are now stored
  * Use `!loglink -v` to view these in logs
  * Use `!dm_channel_id` in an inbox thread to view the DM channel ID
  * *DM channel and message IDs are primarily useful for Discord T&S reports*
* Multiple people can now sign up for reply alerts (`!alert`) simultaneously ([#373](https://github.com/Dragory/modmailbot/pull/373) by @DarkView)
* The bot now displays a note if the user sent an application invite, e.g. an invite to listen along on Spotify
* Log formatting is now more consistent and easier to parse with automated tools
* Messages in modmail threads by other bots are no longer ignored, and are displayed in logs
* Added official support for MySQL databases. Refer to the documentation on `dbType` for more details.
  * This change also means the following options are **no longer supported:**
    * `dbDir` (use `sqliteOptions.filename` to specify the database file instead)
    * `knex` (see `dbType` documentation for more details)
* Removed the long-deprecated `logDir` option
* Fixed `!edit_snippet` crashing the bot when leaving the new snippet text empty

**Plugins:**
* Added support for replacing default message formatting in threads, DMs, and logs
* Added support for *hooks*. Hooks can be used to run custom plugin code before/after specific moments.
  * Initially only the `beforeNewThread` hook is available. See plugin documentation for more details.
* If your plugin requires special gateway intents, use the new `extraIntents` config option
* Some code reorganisation related to threads and thread messages.
  If you have a plugin that interacts with Thread or ThreadMessage objects,
  test them before running this update in production!

**Internal/technical updates:**
* Updated Eris to v0.13.3
* Updated several other dependencies
* New JSON Schema based config parser that validates each option and their types more strictly to prevent undefined behavior

## v2.30.1
* Fix crash with `responseMessage` and `closeMessage` introduced in v2.30.0
  ([#369](https://github.com/Dragory/modmailbot/pull/369))

## v2.30.0
* The following config options now also support multi-line values:
  * `responseMessage`
  * `closeMessage`
  * `botMentionResponse`
  * `greetingMessage`
  * `accountAgeDeniedMessage`
  * `timeOnServerDeniedMessage`
* When the bot is mentioned on the main server, the log message about this now
  also includes a link to the message ([#319](https://github.com/Dragory/modmailbot/pull/319))
* Fix error when supplying all config values from env variables without a config file
* Fix crash in update checker if the repository value in package.json is set to
  a GitHub repository without releases (this only applies to forks)

## v2.29.1
* Fix boolean values in `config.ini` not being handled properly

## v2.29.0
* **Default configuration format is now .ini**
  * Existing `config.json` files will continue to work and will not be deprecated
  * This makes the default configuration format for the bot much more approachable than JSON
* Config values can now also be loaded from environment variables
  (see [Configuration](docs/configuration.md#environment-variables) for more details)
* New rewritten instructions for setting up and using the bot
* New easy-to-use `start.bat` file for Windows
* Update several package dependencies
* Fixed incompatibility with Node.js 10 versions prior to 10.9.0

## v2.28.0
* Fix error when saving attachments locally with `attachmentStorage` set to `"local"` (default) when the bot's folder is
  on a different storage device than the system's temp folder
* Add `attachments` object to the plugin API
  * This allows plugins to add new storage types via `attachments.addStorageType()`
  * See the [Plugins section in the README](README.md#plugins) for more details

## v2.27.0
* The `syncPermissionsOnMove` option now defaults to `true`, which should be more intuitive
* **Plugins:** Plugin functions are no longer called with 4 arguments. Instead, the function is called with 1 argument,
which is an object that contains the previous 4 values as properties: `bot`, `knex`, `config`, `commands`.
This will make it easier to scale the plugin system in the future with new features.
You can see an [updated example in the README](https://github.com/Dragory/modmailbot/blob/master/README.md#example-plugin-file).

## v2.26.0
* The bot now waits for the main server(s) and inbox server to become available before initializing.
This is a potential fix to [#335](https://github.com/Dragory/modmailbot/issues/335).
This should have little to no effect on smaller servers.
* The bot status ("Playing") is now reapplied hourly since the status can sometimes disappear

## v2.25.0
* Fix regression introduced in v2.24.0 where line breaks would get turned to spaces in replies and snippets ([#304](https://github.com/Dragory/modmailbot/issues/304))
* Replace the internal command handler with a new one. This should be fairly thoroughly tested, but please report any issues you encounter!
* Plugins are now called with a fourth parameter that allows you to easily add specific types of commands
  * Due to the command handler change, any calls to `bot.registerCommand` should be replaced with the new system

## v2.24.0
* Switch to the new stable version of Eris (0.10.0) instead of the dev version

## v2.23.2
* Update Node.js version check at startup to require Node.js 10

## v2.23.1
* Updated required Node.js version in .nvmrc and README (v10 is now the minimum)

## v2.23.0
* Add update notifications. The bot will check for new versions every 12 hours and notify moderators at the top of new
modmail threads when there are new versions available. Can be disabled by setting the `updateNotifications` option to `false`.
New available versions are also shown in `!version`.
  * If you have forked the repository and want to check for updates in your own repository instead,
  change the `repository` value in `package.json`
* Add basic support for plugins. See the **Plugins** section in README for more information.
* Add support for snippet arguments. To use these, put {1}, {2}, etc. in the snippet text and they will be replaced by the given arguments when using the snippet.
* Add support for multiple `mentionRole` config option values in an array
* Add `commandAliases` config option to set custom command aliases
* Add support for timed blocks. Simply specify the duration as the last argument in `!block` or `!unblock`.
* Add pagination to `!logs`

## v2.22.0
* Add `guildGreetings` option to allow configuring greeting messages on a per-server basis
* Add `rolesInThreadHeader` option to show the user's roles in the modmail thread's header

## v2.21.3
* Fix crash caused by Nitro Boosting notifications

## v2.21.2
* Update Eris to fix crashes with news channels and nitro boosting

## v2.21.1
* "Account age" and "time on server" requirements are now ignored when using `!newthread`

## v2.21.0
* Add `requiredTimeOnServer` and `timeOnServerDeniedMessage` config options to restrict modmail from users who have just joined the server. Thanks [@reboxer](https://github.com/reboxer) ([#270](https://github.com/Dragory/modmailbot/pull/270))!

## v2.20.0
* Add `categoryAutomation` option to automate thread categories. Currently supported sub-options:
  * `newThread` - same as `newThreadCategoryId`, the default category for new threads
  * `newThreadFromGuild` - default category on a per-guild basis, value is an object with guild IDs as keys and category IDs as values 
* Threads should now include member information (nickname, joined at, etc.) more reliably
* Thread header now also includes the member's current voice channel, if any

## v2.19.0
* Add `attachmentStorage` option to control where attachments are saved. Currently supported:
  * `"local"` (default) - Same as before: attachments are saved locally on the machine running the bot and served through the bot's web server
  * `"discord"` - Attachments are saved on a special Discord channel specified by the `attachmentStorageChannelId` option
* Add `syncPermissionsOnMove` option. When enabled, thread channel permissions are synced with the category when the thread is moved with `!move`.
* Add support for scheduling `!suspend`. Works the same way as with `!close`, just specify the time after the command. Can be cancelled with `!suspend cancel`.
* Scheduled `!close` can now be silent - just add `silent` as an argument to the command before or after the schedule time
* The schedule time format for `!close` is now stricter and times with whitespace (e.g. `2 h 30 m`) no longer work. Use e.g. `2h30m` instead.
* `!loglink` can now be used in suspended threads
* User can now be mentioned in `botMentionResponse` by adding `{userMention}` to the response text. Thanks @reboxer (#225)!
* Fixed a small mistake in README, thanks @GabrielLewis2 (#226)!

## v2.18.0
* Add `silent` option to `!close` (e.g. `!close silent`) to close threads without sending the specified `closeMessage`
* Update some package versions (may help with sqlite3 install issues)

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
