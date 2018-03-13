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
const logCommands = require('./plugins/logCommands');
const moving = require('./plugins/moving');
const blocking = require('./plugins/blocking');
const suspending = require('./plugins/suspending');
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
  if (msg.author.bot) return;

  const thread = await threads.findByChannelId(msg.channel.id);
  if (! thread) return;

  if (msg.content.startsWith(config.prefix) || msg.content.startsWith(config.snippetPrefix)) {
    // Save commands as "command messages"
    if (msg.content.startsWith(config.snippetPrefix)) return; // Ignore snippets
    thread.saveCommandMessage(msg);
  } else if (config.alwaysReply) {
    // AUTO-REPLY: If config.alwaysReply is enabled, send all chat messages in thread channels as replies
    if (! utils.isStaff(msg.member)) return; // Only staff are allowed to reply

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
    content: `${utils.getInboxMention()}Bot mentioned in ${msg.channel.mention} by **${msg.author.username}#${msg.author.discriminator}**: "${msg.cleanContent}"`,
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

      const dmChannel = await thread.getDMChannel();
      if (! dmChannel) return;

      try {
        await bot.sendChannelTyping(dmChannel.id);
      } catch(e) {}
    }
  });
}

// Check for threads that are scheduled to be closed and close them
async function applyScheduledCloses() {
  const threadsToBeClosed = await threads.getThreadsThatShouldBeClosed();
  for (const thread of threadsToBeClosed) {
    await thread.close();

    const logUrl = await thread.getLogUrl();
    utils.postLog(utils.trimAll(`
      Modmail thread with ${thread.user_name} (${thread.user_id}) was closed as scheduled by ${thread.scheduled_close_name}
      Logs: ${logUrl}
    `));
  }
}

async function scheduledCloseLoop() {
  try {
    await applyScheduledCloses();
  } catch (e) {
    console.error(e);
  }

  setTimeout(scheduledCloseLoop, 2000);
}

// Auto-close threads if their channel is deleted
bot.on('channelDelete', async (channel) => {
  if (! (channel instanceof Eris.TextChannel)) return;
  if (channel.guild.id !== utils.getInboxGuild().id) return;
  const thread = await threads.findOpenThreadByChannelId(channel.id);
  if (! thread) return;

  console.log(`[INFO] Auto-closing thread with ${thread.user_name} because the channel was deleted`);
  await thread.close(true);

  const logUrl = await thread.getLogUrl();
  utils.postLog(utils.trimAll(`
    Modmail thread with ${thread.user_name} (${thread.user_id}) was closed automatically because the channel was deleted
    Logs: ${logUrl}
  `));
});

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

  // Timed close
  if (args.length) {
    if (args[0] === 'cancel') {
      // Cancel timed close
      // The string type check is due to a knex bug, see https://github.com/tgriesser/knex/issues/1276
      if (thread.scheduled_close_at) {
        await thread.cancelScheduledClose();
        thread.postSystemMessage(`Cancelled scheduled closing`);
      }

      return;
    }

    // Set a timed close
    const delay = utils.convertDelayStringToMS(args.join(' '));
    if (delay === 0) {
      thread.postSystemMessage(`Invalid delay specified. Format: "1h30m"`);
      return;
    }

    const closeAt = moment.utc().add(delay, 'ms');
    await thread.scheduleClose(closeAt.format('YYYY-MM-DD HH:mm:ss'), msg.author);
    thread.postSystemMessage(`Thread is scheduled to be closed ${moment.duration(delay).humanize(true)} by ${msg.author.username}. Use \`${config.prefix}close cancel\` to cancel.`);

    return;
  }

  // Regular close
  await thread.close();

  const logUrl = await thread.getLogUrl();
  utils.postLog(utils.trimAll(`
    Modmail thread with ${thread.user_name} (${thread.user_id}) was closed by ${msg.author.username}
    Logs: ${logUrl}
  `));
});

module.exports = {
  async start() {
    // Load plugins
    console.log('Loading plugins...');
    await logCommands(bot);
    await blocking(bot);
    await moving(bot);
    await snippets(bot);
    await suspending(bot);
    await greeting(bot);
    await webserver(bot);

    // Connect to Discord
    console.log('Connecting to Discord...');
    await bot.connect();

    // Start scheduled close loop
    scheduledCloseLoop();

    console.log('Done! Now listening to DMs.');
  }
};
