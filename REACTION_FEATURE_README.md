# User Reaction Notification Feature

## Overview

This feature allows moderators to be notified when users react to modmail messages. When a user reacts to a message sent by the bot in their DMs, a notification will appear in the corresponding modmail thread.

## Configuration

Add these settings to your `config.ini` file:

```ini
# Enable reaction notifications
notifyOnReaction = on

# Enable reaction removal notifications (optional)
notifyOnReactionRemoval = on
```

## How it works

1. **When enabled**: Staff members will see notifications like:

   - `Janooba reacted to message 17 with :thumbsup:`
   - `Janooba removed reaction :thumbsdown: from message 17`

2. **Only tracks reactions to staff replies**: The bot only notifies about reactions to messages sent FROM staff TO users (not reactions to user messages)

3. **Works with both Unicode and custom emojis**:
   - Unicode: 👍, 😊, etc.
   - Custom: <:kekw:123456789>

## Required Discord Permissions

The bot now requests these additional intents:

- `directMessageReactions` - For DM reaction notifications
- `guildMessageReactions` - For server reaction notifications

## Files Modified

- `src/main.js` - Added reaction event handlers
- `src/bot.js` - Added required Discord intents
- `src/data/cfg.schema.json` - Added configuration options
- `src/data/cfg.jsdoc.js` - Added JSDoc documentation
- `docs/configuration.md` - Added documentation
- `config.example.ini` - Added example configuration

## Testing

1. Enable the feature in your config
2. Start the bot
3. Send a reply to a user from a modmail thread
4. Have the user react to the message in their DMs
5. Check the modmail thread for the notification

## Error Handling

The feature includes try-catch blocks to prevent crashes and logs errors to the console if something goes wrong.
