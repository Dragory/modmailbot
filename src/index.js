const fs = require('fs');
const Eris = require('eris');
const moment = require('moment');
const humanizeDuration = require('humanize-duration');

const config = require('./config');
const bot = require('./bot');
const Queue = require('./queue');
const utils = require('./utils');
const blocked = require('./blocked');
const threads = require('./threads');
const logs = require('./logs');
const attachments = require('./attachments');
const snippets = require('./snippets');
const webserver = require('./webserver');
const greeting = require('./greeting');

const messageQueue = new Queue();

// Force crash on unhandled rejections (use something like forever/pm2 to restart)
process.on('unhandledRejection', err => {
  if (err instanceof utils.BotError || (err && err.code)) {
    // We ignore stack traces for BotErrors (the message has enough info) and network errors from Eris (their stack traces are unreadably long)
    console.error(`Error: ${err.message}`);
  } else {
    console.error(err);
  }

  process.exit(1);
});

// Once the bot has connected, set the status/"playing" message
bot.on('ready', () => {
  bot.editStatus(null, {name: config.status || 'Message me for help'});
  console.log('Bot started, listening to DMs');
});

// If the alwaysReply option is set to true, send all messages in modmail threads as replies, unless they start with a command prefix
if (config.alwaysReply) {
  bot.on('messageCreate', msg => {
    if (! utils.messageIsOnInboxServer(msg)) return;
    if (! utils.isStaff(msg)) return;
    if (msg.author.bot) return;
    if (msg.content.startsWith(config.prefix) || msg.content.startsWith(config.snippetPrefix)) return;

    reply(msg, msg.content.trim(), config.alwaysReplyAnon || false);
  });
}

// "Bot was mentioned in #general-discussion"
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

  // Download and save copies of attachments in the background
  const attachmentSavePromise = attachments.saveAttachmentsInMessage(msg);

  let threadCreationFailed = false;

  // Private message handling is queued so e.g. multiple message in quick succession don't result in multiple channels being created
  messageQueue.add(async () => {
    let thread;

    // Find the corresponding modmail thread
    try {
      thread = await threads.getForUser(msg.author, true, msg);
    } catch (e) {
      console.error(e);
      utils.postError(`
Modmail thread for ${msg.author.username}#${msg.author.discriminator} (${msg.author.id}) could not be created:
\`\`\`${e.message}\`\`\`

Here's what their message contained:
\`\`\`${msg.cleanContent}\`\`\``);
      return;
    }

    if (! thread) {
      // If there's no thread returned, this message was probably ignored (e.g. due to a common word)
      // TODO: Move that logic here instead?
      return;
    }

    if (thread._wasCreated) {
      const mainGuild = utils.getMainGuild();
      const member = (mainGuild ? mainGuild.members.get(msg.author.id) : null);
      if (! member) console.log(`[INFO] Member ${msg.author.id} not found in main guild ${config.mainGuildId}`);

      let mainGuildNickname = null;
      if (member && member.nick) mainGuildNickname = member.nick;
      else if (member && member.user) mainGuildNickname = member.user.username;
      else if (member == null) mainGuildNickname = 'NOT ON SERVER';

      if (mainGuildNickname == null) mainGuildNickname = 'UNKNOWN';

      const userLogs = await logs.getLogsByUserId(msg.author.id);
      const accountAge = humanizeDuration(Date.now() - msg.author.createdAt, {largest: 2});
      const infoHeader = `ACCOUNT AGE **${accountAge}**, ID **${msg.author.id}**, NICKNAME **${mainGuildNickname}**, LOGS **${userLogs.length}**\n-------------------------------`;

      await bot.createMessage(thread.channelId, infoHeader);

      // Ping mods of the new thread
      await bot.createMessage(thread.channelId, {
        content: `@here New modmail thread (${msg.author.username}#${msg.author.discriminator})`,
        disableEveryone: false,
      });

      // Send an automatic reply to the user informing them of the successfully created modmail thread
      msg.channel.createMessage(config.responseMessage).catch(err => {
        utils.postError(`There is an issue sending messages to ${msg.author.username}#${msg.author.discriminator} (${msg.author.id}); consider messaging manually`);
      });
    }

    const timestamp = utils.getTimestamp();
    const attachmentsPendingStr = '\n\n*Attachments pending...*';

    let content = msg.content;
    if (msg.attachments.length > 0) content += attachmentsPendingStr;

    const createdMsg = await bot.createMessage(thread.channelId, `[${timestamp}] « **${msg.author.username}#${msg.author.discriminator}:** ${content}`);

    if (msg.attachments.length > 0) {
      await attachmentSavePromise;
      const formattedAttachments = await Promise.all(msg.attachments.map(utils.formatAttachment));
      const attachmentMsg = `\n\n` + formattedAttachments.reduce((str, formatted) => str + `\n\n${formatted}`);
      createdMsg.edit(createdMsg.content.replace(attachmentsPendingStr, attachmentMsg));
    }
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

  const thread = await threads.getForUser(msg.author);
  if (! thread) return;

  const editMessage = utils.disableLinkPreviews(`**The user edited their message:**\n\`B:\` ${oldContent}\n\`A:\` ${newContent}`);
  bot.createMessage(thread.channelId, editMessage);
});

/**
 * Sends a reply to the modmail thread where `msg` was posted.
 * @param {Eris.Message} msg
 * @param {string} text
 * @param {bool} anonymous
 * @returns {Promise<void>}
 */
async function reply(msg, text, anonymous = false) {
  const thread = await threads.getByChannelId(msg.channel.id);
  if (! thread) return;

  await attachments.saveAttachmentsInMessage(msg);

  const dmChannel = await bot.getDMChannel(thread.userId);

  let modUsername, logModUsername;
  const mainRole = utils.getMainRole(msg.member);

  if (anonymous) {
    modUsername = (mainRole ? mainRole.name : 'Moderator');
    logModUsername = `(Anonymous) (${msg.author.username}) ${mainRole ? mainRole.name : 'Moderator'}`;
  } else {
    const name = (config.useNicknames ? msg.member.nick || msg.author.username : msg.author.username);
    modUsername = (mainRole ? `(${mainRole.name}) ${name}` : name);
    logModUsername = modUsername;
  }

  let content = `**${modUsername}:** ${text}`;
  let logContent = `**${logModUsername}:** ${text}`;

  async function sendMessage(file, attachmentUrl) {
    try {
      await dmChannel.createMessage(content, file);
    } catch (e) {
      if (e.resp && e.resp.statusCode === 403) {
        msg.channel.createMessage(`Could not send reply; the user has likely left the server or blocked the bot`);
      } else if (e.resp) {
        msg.channel.createMessage(`Could not send reply; error code ${e.resp.statusCode}`);
      } else {
        msg.channel.createMessage(`Could not send reply: ${e.toString()}`);
      }
    }

    if (attachmentUrl) {
      content += `\n\n**Attachment:** ${attachmentUrl}`;
      logContent += `\n\n**Attachment:** ${attachmentUrl}`;
    }

    // Show the message in the modmail thread as well
    msg.channel.createMessage(`[${utils.getTimestamp()}] » ${logContent}`);
    msg.delete();
  };

  if (msg.attachments.length > 0) {
    // If the reply has an attachment, relay it as is
    fs.readFile(attachments.getPath(msg.attachments[0].id), async (err, data) => {
      const file = {file: data, name: msg.attachments[0].filename};

      const attachmentUrl = await attachments.getUrl(msg.attachments[0].id, msg.attachments[0].filename);
      sendMessage(file, attachmentUrl);
    });
  } else {
    // Otherwise just send the message regularly
    sendMessage();
  }
}

// Mods can reply to modmail threads using !r or !reply
// These messages get relayed back to the DM thread between the bot and the user
utils.addInboxCommand('reply', (msg, args) => {
  const text = args.join(' ').trim();
  reply(msg, text, false);
});

bot.registerCommandAlias('r', 'reply');

// Anonymous replies only show the role, not the username
utils.addInboxCommand('anonreply', (msg, args) => {
  const text = args.join(' ').trim();
  reply(msg, text, true);
});

bot.registerCommandAlias('ar', 'anonreply');

// Close a thread. Closing a thread saves a log of the channel's contents and then deletes the channel.
utils.addInboxCommand('close', async (msg, args, thread) => {
  if (! thread) return;

  await msg.channel.createMessage('Saving logs and closing channel...');

  const logMessages = await msg.channel.getMessages(10000);
  const log = logMessages.reverse().map(msg => {
    const date = moment.utc(msg.timestamp, 'x').format('YYYY-MM-DD HH:mm:ss');
    return `[${date}] ${msg.author.username}#${msg.author.discriminator}: ${msg.content}`;
  }).join('\n') + '\n';

  const logFilename = await logs.getNewLogFile(thread.userId);
  await logs.saveLogFile(logFilename, log);

  const logUrl = await logs.getLogFileUrl(logFilename);
  const closeMessage = `Modmail thread with ${thread.username} (${thread.userId}) was closed by ${msg.author.username}
Logs: <${logUrl}>`;

  bot.createMessage(utils.getLogChannel(bot).id, closeMessage);
  await threads.close(thread.channelId);
  msg.channel.delete();
});

utils.addInboxCommand('block', (msg, args, thread) => {
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

utils.addInboxCommand('unblock', (msg, args, thread) => {
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

utils.addInboxCommand('logs', (msg, args, thread) => {
  async function getLogs(userId) {
    const infos = await logs.getLogsWithUrlByUserId(userId);
    let message = `**Log files for <@${userId}>:**\n`;

    message += infos.map(info => {
      const formattedDate = moment.utc(info.date, 'YYYY-MM-DD HH:mm:ss').format('MMM Do [at] HH:mm [UTC]');
      return `\`${formattedDate}\`: <${info.url}>`;
    }).join('\n');

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
utils.addInboxCommand('snippet', async (msg, args) => {
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

utils.addInboxCommand('delete_snippet', async (msg, args) => {
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

utils.addInboxCommand('edit_snippet', async (msg, args) => {
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

utils.addInboxCommand('snippets', async msg => {
  const allSnippets = await snippets.all();
  const shortcuts = Object.keys(allSnippets);
  shortcuts.sort();

  msg.channel.createMessage(`Available snippets (prefix ${config.snippetPrefix}):\n${shortcuts.join(', ')}`);
});

// Start the bot!
bot.connect();
webserver.run();
greeting.init(bot);
