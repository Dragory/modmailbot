const Eris = require('eris');
const moment = require('moment');
const transliterate = require('transliteration');

const config = require('./config');
const bot = require('./bot');
const Queue = require('./queue');
const utils = require('./utils');
const threadUtils = require('./threadUtils');
const blocked = require('./data/blocked');
const threads = require('./data/threads');

const snippets = require('./plugins/snippets');
const webserver = require('./plugins/webserver');
const greeting = require('./plugins/greeting');
const attachments = require("./data/attachments");
const {ACCIDENTAL_THREAD_MESSAGES} = require('./data/constants');

const messageQueue = new Queue();

const addInboxServerCommand = (...args) => threadUtils.addInboxServerCommand(bot, ...args);

// Once the bot has connected, set the status/"playing" message
bot.on('ready', () => {
  bot.editStatus(null, {name: config.status});
});

/**
 * When a moderator posts in a modmail thread...
 * 1) If alwaysReply is enabled, reply to the user
 * 2) If alwaysReply is disabled, save that message as a chat message in the thread
 */
bot.on('messageCreate', async msg => {
  if (! utils.messageIsOnInboxServer(msg)) return;
  if (! utils.isStaff(msg.member)) return;
  if (msg.author.bot) return;
  if (msg.content.startsWith(config.prefix) || msg.content.startsWith(config.snippetPrefix)) return;

  const thread = await threads.findByChannelId(msg.channel.id);
  if (! thread) return;

  if (config.alwaysReply) {
    // AUTO-REPLY: If config.alwaysReply is enabled, send all chat messages in thread channels as replies
    if (msg.attachments.length) await attachments.saveAttachmentsInMessage(msg);
    await thread.replyToUser(msg.member, msg.content.trim(), msg.attachments, config.alwaysReplyAnon || false);
    msg.delete();
  } else {
    // Otherwise just save the messages as "chat" in the logs
    thread.saveChatMessage(msg);
  }
});

/**
 * When we get a private message...
 * 1) Find the open modmail thread for this user, or create a new one
 * 2) Post the message as a user reply in the thread
 */
bot.on('messageCreate', async msg => {
  if (! (msg.channel instanceof Eris.PrivateChannel)) return;
  if (msg.author.bot) return;
  if (msg.type !== 0) return; // Ignore pins etc.

  if (await blocked.isBlocked(msg.author.id)) return;

  // Private message handling is queued so e.g. multiple message in quick succession don't result in multiple channels being created
  messageQueue.add(async () => {
    let thread = await threads.findOpenThreadByUserId(msg.author.id);

    // New thread
    if (! thread) {
      // Ignore messages that shouldn't usually open new threads, such as "ok", "thanks", etc.
      if (config.ignoreAccidentalThreads && msg.content && ACCIDENTAL_THREAD_MESSAGES.includes(msg.content.trim().toLowerCase())) return;

      thread = await threads.createNewThreadForUser(msg.author);
    }

    await thread.receiveUserReply(msg);
  });
});

/**
 * When a message is edited...
 * 1) If that message was in DMs, and we have a thread open with that user, post the edit as a system message in the thread
 * 2) If that message was moderator chatter in the thread, update the corresponding chat message in the DB
 */
bot.on('messageUpdate', async (msg, oldMessage) => {
  if (! msg || ! msg.author) return;
  if (msg.author.bot) return;
  if (await blocked.isBlocked(msg.author.id)) return;

  // Old message content doesn't persist between bot restarts
  const oldContent = oldMessage && oldMessage.content || '*Unavailable due to bot restart*';
  const newContent = msg.content;

  // Ignore bogus edit events with no changes
  if (newContent.trim() === oldContent.trim()) return;

  // 1) Edit in DMs
  if (msg.channel instanceof Eris.PrivateChannel) {
    const thread = await threads.findOpenThreadByUserId(msg.author.id);
    const editMessage = utils.disableLinkPreviews(`**The user edited their message:**\n\`B:\` ${oldContent}\n\`A:\` ${newContent}`);

    thread.postSystemMessage(editMessage);
  }

  // 2) Edit in the thread
  else if (utils.messageIsOnInboxServer(msg) && utils.isStaff(msg.member)) {
    const thread = await threads.findOpenThreadByChannelId(msg.channel.id);
    if (! thread) return;

    thread.updateChatMessage(msg);
  }
});

/**
 * When a staff message is deleted in a modmail thread, delete it from the database as well
 */
bot.on('messageDelete', async msg => {
  if (! msg.author) return;
  if (msg.author.bot) return;
  if (! utils.messageIsOnInboxServer(msg)) return;
  if (! utils.isStaff(msg.member)) return;

  const thread = await threads.findOpenThreadByChannelId(msg.channel.id);
  if (! thread) return;

  thread.deleteChatMessage(msg.id);
});

/**
 * When the bot is mentioned on the main server, ping staff in the log channel about it
 */
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

// Typing proxy: forwarding typing events between the DM and the modmail thread
if(config.typingProxy || config.typingProxyReverse) {
  bot.on("typingStart", async (channel, user) => {
    // config.typingProxy: forward user typing in a DM to the modmail thread
    if (config.typingProxy && (channel instanceof Eris.PrivateChannel)) {
      const thread = await threads.findOpenThreadByUserId(user.id);
      if (! thread) return;

      try {
        await bot.sendChannelTyping(thread.channel_id);
      } catch (e) {}
    }

    // config.typingProxyReverse: forward moderator typing in a thread to the DM
    else if (config.typingProxyReverse && (channel instanceof Eris.GuildChannel) && ! user.bot) {
      const thread = await threads.findByChannelId(channel.id);
      if (! thread) return;

      const dmChannel = await thread.getDMChannel(thread.user_id);
      if (! dmChannel) return;

      try {
        await bot.sendChannelTyping(dmChannel.id);
      } catch(e) {}
    }
  });
}

// Mods can reply to modmail threads using !r or !reply
// These messages get relayed back to the DM thread between the bot and the user
addInboxServerCommand('reply', async (msg, args, thread) => {
  if (! thread) return;

  const text = args.join(' ').trim();
  if (msg.attachments.length) await attachments.saveAttachmentsInMessage(msg);
  await thread.replyToUser(msg.member, text, msg.attachments, false);
  msg.delete();
});

bot.registerCommandAlias('r', 'reply');

// Anonymous replies only show the role, not the username
addInboxServerCommand('anonreply', async (msg, args, thread) => {
  if (! thread) return;

  const text = args.join(' ').trim();
  if (msg.attachments.length) await attachments.saveAttachmentsInMessage(msg);
  await thread.replyToUser(msg.member, text, msg.attachments, true);
  msg.delete();
});

bot.registerCommandAlias('ar', 'anonreply');

// Close a thread. Closing a thread saves a log of the channel's contents and then deletes the channel.
addInboxServerCommand('close', async (msg, args, thread) => {
  if (! thread) return;
  await thread.close();

  const logUrl = await thread.getLogUrl();
  utils.postLog(utils.trimAll(`
    Modmail thread with ${thread.user_name} (${thread.user_id}) was closed by ${msg.author.username}
    Logs: ${logUrl}
  `));
});

addInboxServerCommand('block', (msg, args, thread) => {
  async function block(userId) {
    const user = bot.users.get(userId);
    await blocked.block(userId, (user ? `${user.username}#${user.discriminator}` : ''), msg.author.id);
    msg.channel.createMessage(`Blocked <@${userId}> (id ${userId}) from modmail`);
  }

  if (args.length > 0) {
    // User mention/id as argument
    const userId = utils.getUserMention(args.join(' '));
    if (! userId) return;
    block(userId);
  } else if (thread) {
    // Calling !block without args in a modmail thread blocks the user of that thread
    block(thread.user_id);
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
    unblock(thread.user_id);
  }
});

addInboxServerCommand('logs', (msg, args, thread) => {
  async function getLogs(userId) {
    const userThreads = await threads.getClosedThreadsByUserId(userId);

    // Descending by date
    userThreads.sort((a, b) => {
      if (a.created_at > b.created_at) return -1;
      if (a.created_at < b.created_at) return 1;
      return 0;
    });

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
    getLogs(thread.user_id);
  }
});

addInboxServerCommand('move', async (msg, args, thread) => {
  if (! config.allowMove) return;

  if (! thread) return;

  const searchStr = args[0];
  if (! searchStr || searchStr.trim() === '') return;

  const normalizedSearchStr = transliterate.slugify(searchStr);

  const categories = msg.channel.guild.channels.filter(c => {
    // Filter to categories that are not the thread's current parent category
    return (c instanceof Eris.CategoryChannel) && (c.id !== msg.channel.parentID);
  });

  if (categories.length === 0) return;

  // See if any category name contains a part of the search string
  const containsRankings = categories.map(cat => {
    const normalizedCatName = transliterate.slugify(cat.name);

    let i;
    for (i = 1; i < normalizedSearchStr.length; i++) {
      if (! normalizedCatName.includes(normalizedSearchStr.slice(0, i))) {
        i--;
        break;
      }
    }

    return [cat, i];
  });

  // Sort by best match
  containsRankings.sort((a, b) => {
    return a[1] > b[1] ? -1 : 1;
  });

  if (containsRankings[0][1] === 0) {
    thread.postNonLogMessage('No matching category');
    return;
  }

  const targetCategory = containsRankings[0][0];

  await bot.editChannel(thread.channel_id, {
    parentID: targetCategory.id
  });

  thread.postSystemMessage(`Thread moved to ${targetCategory.name.toUpperCase()}`);
});

addInboxServerCommand('loglink', async (msg, args, thread) => {
  if (! thread) return;
  const logUrl = await thread.getLogUrl();
  thread.postNonLogMessage(`Log URL: ${logUrl}`);
});

module.exports = {
  async start() {
    // Load plugins
    console.log('Loading plugins...');
    await snippets(bot);
    await greeting(bot);
    await webserver(bot);

    console.log('Connecting to Discord...');
    await bot.connect();

    console.log('Done! Now listening to DMs.');
  }
};
