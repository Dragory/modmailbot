# 🙋 Frequently Asked Questions

## In a [single-server setup](setup.md#single-server-setup), how do I hide modmails from regular users?
1. Create a private category for modmail threads that only your server staff and the bot can see and set the option
`categoryAutomation.newThread = 1234` (replace `1234` with the ID of the category)
2. Set the `inboxServerPermission` option to limit who can use bot commands.
   [Click here for more information.](configuration.md#inboxserverpermission)

## My logs and/or attachments aren't loading!
Since logs and attachments are both stored and sent directly from the machine running the bot, you'll need to make sure
that the machine doesn't have a firewall blocking the bot and has the appropriate port forwardings set up.
[You can find more information and instructions for port forwarding here.](https://portforward.com/) 
By default, the bot uses the port **8890**.

## I don't want attachments saved on my computer
As an alternative to storing modmail attachments on the machine running the bot, they can be stored in a special Discord
channel instead. Create a new text channel and then set the options `attachmentStorage = discord` and
`attachmentStorageChannelId = 1234` (replace `1234` with the ID of the new channel).

## I want to categorize my modmail threads in multiple categories
Set `allowMove = on` to allow your staff to move threads to other categories with `!move`
