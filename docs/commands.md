# 🤖 Commands

## Anywhere on the inbox server
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

## Inside a modmail thread
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

To automatically reply without using !reply or !r, [enable `alwaysReply` in the config](configuration.md).
