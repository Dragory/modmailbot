const Eris = require('eris');
const path = require('path');

const config = require('./config');
const bot = require('./bot');
const knex = require('./knex');
const {messageQueue} = require('./queue');
const utils = require('./utils');
const { createCommandManager } = require('./commands');
const { getPluginAPI, loadPlugin } = require('./plugins');

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

module.exports = {
  async start() {
    console.log('Connecting to Discord...');

    bot.once('ready', async () => {
      console.log('Connected! Waiting for guilds to become available...');
      await Promise.all([
        ...config.mainGuildId.map(id => waitForGuild(id)),
        waitForGuild(config.mailGuildId)
      ]);

      console.log('Initializing...');
      initStatus();
      initBaseMessageHandlers();
      initPlugins();

      console.log('');
      console.log('Done! Now listening to DMs.');
      console.log('');
    });

    bot.connect();
  }
};

function waitForGuild(guildId) {
  if (bot.guilds.has(guildId)) {
    return Promise.resolve();
  }

  return new Promise(resolve => {
    bot.on('guildAvailable', guild => {
      if (guild.id === guildId) {
        resolve();
      }
    });
  });
}

function initStatus() {
  function applyStatus() {
    bot.editStatus(null, {name: config.status});
  }

  // Set the bot status initially, then reapply it every hour since in some cases it gets unset
  applyStatus();
  setInterval(applyStatus, 60 * 60 * 1000);
}

function initBaseMessageHandlers() {
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
        content = `${staffMention}Bot mentioned in ${msg.channel.mention} by **${msg.author.username}#${msg.author.discriminator}(${msg.author.id})**: "${msg.cleanContent}"\n\n<https:\/\/discordapp.com\/channels\/${msg.channel.guild.id}\/${msg.channel.id}\/${msg.id}>`;
    } else {
        content = `${staffMention}Bot mentioned in ${msg.channel.mention} (${msg.channel.guild.name}) by **${msg.author.username}#${msg.author.discriminator}(${msg.author.id})**: "${msg.cleanContent}"\n\n<https:\/\/discordapp.com\/channels\/${msg.channel.guild.id}\/${msg.channel.id}\/${msg.id}>`;
    }


    bot.createMessage(utils.getLogChannel().id, {
      content,
      disableEveryone: false,
    });

    // Send an auto-response to the mention, if enabled
    if (config.botMentionResponse) {
      const botMentionResponse = utils.readMultilineConfigValue(config.botMentionResponse);
      bot.createMessage(msg.channel.id, botMentionResponse.replace(/{userMention}/g, `<@${msg.author.id}>`));
    }
  });
}

function initPlugins() {
  // Initialize command manager
  const commands = createCommandManager(bot);

  // Register command aliases
  if (config.commandAliases) {
    for (const alias in config.commandAliases) {
      commands.addAlias(config.commandAliases[alias], alias);
    }
  }

  // Load plugins
  console.log('Loading plugins');
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

  const pluginApi = getPluginAPI({ bot, knex, config, commands });
  plugins.forEach(pluginFn => loadPlugin(pluginFn, pluginApi));

  console.log(`Loaded ${plugins.length} plugins (${builtInPlugins.length} built-in plugins, ${plugins.length - builtInPlugins.length} external plugins)`);

  if (config.updateNotifications) {
    updates.startVersionRefreshLoop();
  }
}
