const Eris = require('eris');
const moment = require('moment');

const config = require('./config');
const bot = require('./bot');
const Queue = require('./queue');
const utils = require('./utils');
const blocked = require('./data/blocked');
const threads = require('./data/threads');
const snippets = require('./data/snippets');
const webserver = require('./webserver');
const greeting = require('./greeting');
const Thread = require('./data/Thread');

const messageQueue = new Queue();

/**
 * @callback CommandHandlerCB
 * @interface
 * @param {Eris~Message} msg
 * @param {Array} args
 * @param {Thread} thread
 * @return void
 */

/**
 * Adds a command that can only be triggered on the inbox server.
 * Command handlers added with this function also get the thread the message was posted in as a third argument, if any.
 * @param {String} cmd
 * @param {CommandHandlerCB} commandHandler
 * @param {Eris~CommandOptions} opts
 */
function addInboxServerCommand(cmd, commandHandler, opts) {
  bot.registerCommand(cmd, async (msg, args) => {
    if (! messageIsOnInboxServer(msg)) return;
    if (! isStaff(msg.member)) return;

    const thread = await threads.findByChannelId(msg.channel.id);
    commandHandler(msg, args, thread);
  }, opts);
}

// Once the bot has connected, set the status/"playing" message
bot.on('ready', () => {
  bot.editStatus(null, {name: config.status});
  console.log('Bot started, listening to DMs');
});

// Handle moderator messages in thread channels
bot.on('messageCreate', async msg => {
  if (! utils.messageIsOnInboxServer(msg)) return;
  if (! utils.isStaff(msg)) return;
  if (msg.author.bot) return;
  if (msg.content.startsWith(config.prefix) || msg.content.startsWith(config.snippetPrefix)) return;

  const thread = await threads.findByChannelId(msg.channel.id);
  if (! thread) return;

  if (config.alwaysReply) {
    // AUTO-REPLY: If config.alwaysReply is enabled, send all chat messages in thread channels as replies
    await thread.replyToUser(msg.member, msg.content.trim(), msg.attachments, config.alwaysReplyAnon || false);
    msg.delete();
  } else {
    // Otherwise just save the messages as "chat" in the logs
    thread.addThreadMessageToDB({
      message_type: threads.THREAD_MESSAGE_TYPE.CHAT,
      user_id: msg.author.id,
      user_name: `${msg.author.username}#${msg.author.discriminator}`,
      body: msg.content,
      original_message_id: msg.id
    });
  }
});

// If the bot is mentioned on the main server, post a log message about it
bot.on('messageCreate', async msg => {
  if (! utils.messageIsOnMainServer(msg)) return;
  if (! msg.mentions.some(user => user.id === bot.user.id)) return;

  // If the person who mentioned the modmail bot is also on the modmail server, ignore them
  if (utils.getInboxGuild().members.get(msg.author.id)) return;

  // If the person who mentioned the bot is blocked, ignore them
  if (await blocked.isBlocked(msg.author.id)) return;

  bot.createMessage(utils.getLogChannel(bot).id, {
    content: `@here Bot mentioned in ${msg.channel.mention} by **${msg.author.username}#${msg.author.discriminator}**: "${msg.cleanContent}"`,
    disableEveryone: false,
  });
});

// When we get a private message, forward the contents to the corresponding modmail thread
bot.on('messageCreate', async msg => {
  if (! (msg.channel instanceof Eris.PrivateChannel)) return;
  if (msg.author.id === bot.user.id) return;

  if (await blocked.isBlocked(msg.author.id)) return;

  // Private message handling is queued so e.g. multiple message in quick succession don't result in multiple channels being created
  messageQueue.add(async () => {
    let thread = await threads.findOpenThreadByUserId(msg.author.id);
    if (! thread) {
      thread = await threads.createNewThreadForUser(msg.author, msg);
    }

    thread.receiveUserReply(msg);
  });
});

// Edits in DMs
bot.on('messageUpdate', async (msg, oldMessage) => {
  if (! (msg.channel instanceof Eris.PrivateChannel)) return;
  if (msg.author.id === bot.user.id) return;

  if (await blocked.isBlocked(msg.author.id)) return;

  let oldContent = oldMessage.content;
  const newContent = msg.content;

  // Old message content doesn't persist between bot restarts
  if (oldContent == null) oldContent = '*Unavailable due to bot restart*';

  // Ignore bogus edit events with no changes
  if (newContent.trim() === oldContent.trim()) return;

  const thread = await threads.createNewThreadForUser(msg.author);
  if (! thread) return;

  const editMessage = utils.disableLinkPreviews(`**The user edited their message:**\n\`B:\` ${oldContent}\n\`A:\` ${newContent}`);
  bot.createMessage(thread.channelId, editMessage);
});

// Mods can reply to modmail threads using !r or !reply
// These messages get relayed back to the DM thread between the bot and the user
addInboxServerCommand('reply', (msg, args, thread) => {
  if (! thread) return;
  const text = args.join(' ').trim();
  thread.replyToUser(msg.member, text, msg.attachments, false);
});

bot.registerCommandAlias('r', 'reply');

// Anonymous replies only show the role, not the username
addInboxServerCommand('anonreply', (msg, args, thread) => {
  if (! thread) return;
  const text = args.join(' ').trim();
  thread.replyToUser(msg.member, text, msg.attachments, true);
});

bot.registerCommandAlias('ar', 'anonreply');

// Close a thread. Closing a thread saves a log of the channel's contents and then deletes the channel.
addInboxServerCommand('close', async (msg, args, thread) => {
  if (! thread) return;
  thread.close();
});

addInboxServerCommand('block', (msg, args, thread) => {
  async function block(userId) {
    await blocked.block(userId);
    msg.channel.createMessage(`Blocked <@${userId}> (id ${userId}) from modmail`);
  }

  if (args.length > 0) {
    // User mention/id as argument
    const userId = utils.getUserMention(args.join(' '));
    if (! userId) return;
    block(userId);
  } else if (thread) {
    // Calling !block without args in a modmail thread blocks the user of that thread
    block(thread.userId);
  }
});

addInboxServerCommand('unblock', (msg, args, thread) => {
  async function unblock(userId) {
    await blocked.unblock(userId);
    msg.channel.createMessage(`Unblocked <@${userId}> (id ${userId}) from modmail`);
  }

  if (args.length > 0) {
    // User mention/id as argument
    const userId = utils.getUserMention(args.join(' '));
    if (! userId) return;
    unblock(userId);
  } else if (thread) {
    // Calling !unblock without args in a modmail thread unblocks the user of that thread
    unblock(thread.userId);
  }
});

addInboxServerCommand('logs', (msg, args, thread) => {
  async function getLogs(userId) {
    const userThreads = await threads.getClosedThreadsByUserId(userId);
    const threadLines = await Promise.all(userThreads.map(async thread => {
      const logUrl = await thread.getLogUrl();
      const formattedDate = moment.utc(thread.created_at).format('MMM Do [at] HH:mm [UTC]');
      return `\`${formattedDate}\`: <${logUrl}>`;
    }));

    const message = `**Log files for <@${userId}>:**\n${threadLines.join('\n')}`;

    // Send the list of logs in chunks of 15 lines per message
    const lines = message.split('\n');
    const chunks = utils.chunk(lines, 15);

    let root = Promise.resolve();
    chunks.forEach(lines => {
      root = root.then(() => msg.channel.createMessage(lines.join('\n')));
    });
  }

  if (args.length > 0) {
    // User mention/id as argument
    const userId = utils.getUserMention(args.join(' '));
    if (! userId) return;
    getLogs(userId);
  } else if (thread) {
    // Calling !logs without args in a modmail thread returns the logs of the user of that thread
    getLogs(thread.userId);
  }
});

// Snippets
bot.on('messageCreate', async msg => {
  if (! utils.messageIsOnInboxServer(msg)) return;
  if (! utils.isStaff(msg.member)) return;

  if (msg.author.bot) return;
  if (! msg.content) return;
  if (! msg.content.startsWith(config.snippetPrefix)) return;

  const shortcut = msg.content.replace(config.snippetPrefix, '').toLowerCase();
  const snippet = await snippets.get(shortcut);
  if (! snippet) return;

  reply(msg, snippet.text, snippet.isAnonymous);
});

// Show or add a snippet
addInboxServerCommand('snippet', async (msg, args) => {
  const shortcut = args[0];
  if (! shortcut) return

  const text = args.slice(1).join(' ').trim();
  const snippet = await snippets.get(shortcut);

  if (snippet) {
    if (text) {
      // If the snippet exists and we're trying to create a new one, inform the user the snippet already exists
      msg.channel.createMessage(`Snippet "${shortcut}" already exists! You can edit or delete it with ${prefix}edit_snippet and ${prefix}delete_snippet respectively.`);
    } else {
      // If the snippet exists and we're NOT trying to create a new one, show info about the existing snippet
      msg.channel.createMessage(`\`${config.snippetPrefix}${shortcut}\` replies ${snippet.isAnonymous ? 'anonymously ' : ''}with:\n${snippet.text}`);
    }
  } else {
    if (text) {
      // If the snippet doesn't exist and the user wants to create it, create it
      await snippets.add(shortcut, text, false);
      msg.channel.createMessage(`Snippet "${shortcut}" created!`);
    } else {
      // If the snippet doesn't exist and the user isn't trying to create it, inform them how to create it
      msg.channel.createMessage(`Snippet "${shortcut}" doesn't exist! You can create it with \`${prefix}snippet ${shortcut} text\``);
    }
  }
});

bot.registerCommandAlias('s', 'snippet');

addInboxServerCommand('delete_snippet', async (msg, args) => {
  const shortcut = args[0];
  if (! shortcut) return;

  const snippet = await snippets.get(shortcut);
  if (! snippet) {
    msg.channel.createMessage(`Snippet "${shortcut}" doesn't exist!`);
    return;
  }

  await snippets.del(shortcut);
  msg.channel.createMessage(`Snippet "${shortcut}" deleted!`);
});

bot.registerCommandAlias('ds', 'delete_snippet');

addInboxServerCommand('edit_snippet', async (msg, args) => {
  const shortcut = args[0];
  if (! shortcut) return;

  const text = args.slice(1).join(' ').trim();
  if (! text) return;

  const snippet = await snippets.get(shortcut);
  if (! snippet) {
    msg.channel.createMessage(`Snippet "${shortcut}" doesn't exist!`);
    return;
  }

  await snippets.del(shortcut);
  await snippets.add(shortcut, text, snippet.isAnonymous);

  msg.channel.createMessage(`Snippet "${shortcut}" edited!`);
});

bot.registerCommandAlias('es', 'edit_snippet');

addInboxServerCommand('snippets', async msg => {
  const allSnippets = await snippets.all();
  const shortcuts = Object.keys(allSnippets);
  shortcuts.sort();

  msg.channel.createMessage(`Available snippets (prefix ${config.snippetPrefix}):\n${shortcuts.join(', ')}`);
});

module.exports = {
  start() {
    bot.connect();
    // webserver.run();
    greeting.init(bot);
  }
};
