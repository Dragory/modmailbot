const Eris = require('eris');
const path = require('path');

const config = require('./config');
const bot = require('./bot');
const knex = require('./knex');
const {messageQueue} = require('./queue');
const utils = require('./utils');
const { createCommandManager } = require('./commands');

const blocked = require('./data/blocked');
const threads = require('./data/threads');
const updates = require('./data/updates');

const reply = require('./modules/reply');
const close = require('./modules/close');
const snippets = require('./modules/snippets');
const logs = require('./modules/logs');
const move = require('./modules/move');
const block = require('./modules/block');
const suspend = require('./modules/suspend');
const webserver = require('./modules/webserver');
const greeting = require('./modules/greeting');
const typingProxy = require('./modules/typingProxy');
const version = require('./modules/version');
const newthread = require('./modules/newthread');
const idModule = require('./modules/id');
const alert = require('./modules/alert');

const {ACCIDENTAL_THREAD_MESSAGES} = require('./data/constants');

// Once the bot has connected, set the status/"playing" message
bot.on('ready', () => {
  bot.editStatus(null, {name: config.status});
  console.log('Connected! Now listening to DMs.');
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

    const replied = await thread.replyToUser(msg.member, msg.content.trim(), msg.attachments, config.alwaysReplyAnon || false);
    if (replied) msg.delete();
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

    if (thread) await thread.receiveUserReply(msg);
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
    if (! thread) return;

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
  if (msg.author.bot) return;

  if (utils.messageIsOnInboxServer(msg)) {
    // For same server setups, check if the person who pinged modmail is staff. If so, ignore the ping.
    if (utils.isStaff(msg.member)) return;
  } else {
    // For separate server setups, check if the member is staff on the modmail server
    const inboxMember = utils.getInboxGuild().members.get(msg.author.id);
    if (inboxMember && utils.isStaff(inboxMember)) return;
  }

  // If the person who mentioned the bot is blocked, ignore them
  if (await blocked.isBlocked(msg.author.id)) return;

  let content;
  const mainGuilds = utils.getMainGuilds();
  const staffMention = (config.pingOnBotMention ? utils.getInboxMention() : '');

  if (mainGuilds.length === 1) {
    content = `${staffMention}Bot mentioned in ${msg.channel.mention} by **${msg.author.username}#${msg.author.discriminator}**: "${msg.cleanContent}"`;
  } else {
    content = `${staffMention}Bot mentioned in ${msg.channel.mention} (${msg.channel.guild.name}) by **${msg.author.username}#${msg.author.discriminator}**: "${msg.cleanContent}"`;
  }

  bot.createMessage(utils.getLogChannel().id, {
    content,
    disableEveryone: false,
  });

  // Send an auto-response to the mention, if enabled
  if (config.botMentionResponse) {
    bot.createMessage(msg.channel.id, config.botMentionResponse.replace(/{userMention}/g, `<@${msg.author.id}>`));
  }
});

module.exports = {
  async start() {
    // Initialize command manager
    const commands = createCommandManager(bot);

    // Register command aliases
    if (config.commandAliases) {
      for (const alias in config.commandAliases) {
        commands.addAlias(config.commandAliases[alias], alias);
      }
    }

    // Load modules
    console.log('Loading plugins...');
    const builtInPlugins = [
      reply,
      close,
      logs,
      block,
      move,
      snippets,
      suspend,
      greeting,
      webserver,
      typingProxy,
      version,
      newthread,
      idModule,
      alert
    ];

    const plugins = [...builtInPlugins];

    if (config.plugins && config.plugins.length) {
      for (const plugin of config.plugins) {
        const pluginFn = require(`../${plugin}`);
        plugins.push(pluginFn);
      }
    }

    plugins.forEach(pluginFn => {
      pluginFn(bot, knex, config, commands);
    });

    console.log(`Loaded ${plugins.length} plugins (${builtInPlugins.length} built-in plugins, ${plugins.length - builtInPlugins.length} external plugins)`);

    if (config.updateNotifications) {
      updates.startVersionRefreshLoop();
    }

    // Connect to Discord
    console.log('Connecting to Discord...');
    await bot.connect();
  }
};
