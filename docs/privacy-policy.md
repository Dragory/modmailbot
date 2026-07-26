# Privacy policy
To comply with [Discord Developer Terms of Service](https://support-dev.discord.com/hc/en-us/articles/8562894815383-Discord-Developer-Terms-of-Service), you must provide a privacy policy for your bot.

## Data deletion requests
To comply with [Discord Developer Terms of Service](https://support-dev.discord.com/hc/en-us/articles/8562894815383-Discord-Developer-Terms-of-Service) and various privacy laws/regulations, you must allow users to request the deletion of their data that is stored by the bot.
There is currently no built-in feature to do this. You will need to manually remove the applicable data directly from the database.

## Hosting a privacy policy
Modmail contains a built-in feature to host your privacy policy.

1. Place your privacy policy in Markdown format in the bot's folder as `PRIVACY_POLICY.md`
2. Restart the bot
3. Run `!privacy_policy_link` on the inbox server to get a link to your privacy policy

Note that you are not required to use this built-in feature to host your privacy policy, it only exists for convenience.

## Example privacy policy
Below is an example of a simple privacy policy in Markdown format. You can use this as a base for your own privacy policy.

```md
# Modmail privacy policy

## Bot overview
Modmail is a ticketing system that lets users contact server staff through the bot instead of messaging staff members individually or pinging them publicly in the server.

The bot's source code is available at: https://github.com/Dragory/modmailbot

## Stored personal data
The bot stores full transcripts of modmail threads. These transcripts include:
* User ID, username, nickname, and display name of the contacting or contacted user
* User ID, username, nickname, and display name of any moderators participating in the thread

In addition, the bot stores:
* User ID and username of users blocked from contacting the bot
* User ID of author and target user of notes saved in the bot
* User ID of the author of snippets saved in the bot

## Data retention
* Thread transcripts are stored until manually deleted
* User IDs tied to notes are stored until the note is deleted
* User IDs tied to snippets are stored until the snippet is deleted

## Data access and deletion requests
To request access to your data or for your data to be deleted, please contact:
<insert contact information here>
```
