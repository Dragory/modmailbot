# 🙋 Frequently Asked Questions

## What are these numbers in front of staff replies in modmail threads?
Each staff reply gets an internal number. This number can be used with
`!edit`, `!delete`, `!message` and potentially other commands in the future.

## In a [single-server setup](setup.md#single-server-setup), how do I hide modmails from regular users?
1. Create a private category for modmail threads that only your server staff and the bot can see and set the option
`categoryAutomation.newThread = 1234` (replace `1234` with the ID of the category)
2. Set the `inboxServerPermission` option to limit who can use bot commands.
   [Click here for more information.](configuration.md#inboxserverpermission)

## My logs aren't loading!
Since logs are stored and sent directly from the machine running the bot, you'll need to make sure
that the machine doesn't have a firewall blocking the bot and has the appropriate port forwardings set up.
[You can find more information and instructions for port forwarding here.](https://portforward.com/) 
By default, the bot uses the port **8890**.


## I want to categorize my modmail threads in multiple categories
Set `allowMove = on` to allow your staff to move threads to other categories with `!move`
