const Eris = require("eris");
const path = require("path");

const config = require("./cfg");
const bot = require("./bot");
const knex = require("./knex");
const {messageQueue} = require("./queue");
const utils = require("./utils");
const { createCommandManager } = require("./commands");
const { getPluginAPI, installPlugins, loadPlugins } = require("./plugins");
const { callBeforeNewThreadHooks } = require("./hooks/beforeNewThread");

const blocked = require("./data/blocked");
const threads = require("./data/threads");
const updates = require("./data/updates");

const {ACCIDENTAL_THREAD_MESSAGES} = require("./data/constants");

module.exports = {
  async start() {
    console.log("Preparing plugins...");
    await installAllPlugins();

    console.log("Connecting to Discord...");

    bot.once("ready", async () => {
      console.log("Connected! Waiting for servers to become available...");

      await (new Promise(resolve => {
        const waitNoteTimeout = setTimeout(() => {
          console.log("Servers did not become available after 15 seconds, continuing start-up anyway");
          console.log("");

          const isSingleServer = config.mainServerId.includes(config.inboxServerId);
          if (isSingleServer) {
            console.log("WARNING: The bot will not work before it's invited to the server.");
          } else {
            const hasMultipleMainServers = config.mainServerId.length > 1;
            if (hasMultipleMainServers) {
              console.log("WARNING: The bot will not function correctly until it's invited to *all* main servers and the inbox server.");
            } else {
              console.log("WARNING: The bot will not function correctly until it's invited to *both* the main server and the inbox server.");
            }
          }

          console.log("");

          resolve();
        }, 15 * 1000);

        Promise.all([
          ...config.mainServerId.map(id => waitForGuild(id)),
          waitForGuild(config.inboxServerId),
        ]).then(() => {
          clearTimeout(waitNoteTimeout);
          resolve();
        });
      }));

      console.log("Initializing...");
      initStatus();
      initBaseMessageHandlers();
      initUpdateNotifications();

      console.log("Loading plugins...");
      const pluginResult = await loadAllPlugins();
      console.log(`Loaded ${pluginResult.loadedCount} plugins (${pluginResult.baseCount} built-in plugins, ${pluginResult.externalCount} external plugins)`);

      console.log("");
      console.log("Done! Now listening to DMs.");
      console.log("");
    });

    bot.connect();
  }
};

function waitForGuild(guildId) {
  if (bot.guilds.has(guildId)) {
    return Promise.resolve();
  }

  return new Promise(resolve => {
    bot.on("guildAvailable", guild => {
      if (guild.id === guildId) {
        resolve();
      }
    });
  });
}

function initStatus() {
  function applyStatus() {
    const type = {
      "playing": 0,
      "watching": 3,
      "listening": 2,
    }[config.statusType] || 0;
    bot.editStatus(null, {name: config.status, type});
  }

  if (config.status == null || config.status === "" || config.status === "none" || config.status === "off") {
    return;
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
  bot.on("messageCreate", async msg => {
    if (! utils.messageIsOnInboxServer(msg)) return;
    if (msg.author.id === bot.user.id) return;

    const thread = await threads.findByChannelId(msg.channel.id);
    if (! thread) return;

    if (! msg.author.bot && (msg.content.startsWith(config.prefix) || msg.content.startsWith(config.snippetPrefix))) {
      // Save commands as "command messages"
      thread.saveCommandMessageToLogs(msg);
    } else if (! msg.author.bot && config.alwaysReply) {
      // AUTO-REPLY: If config.alwaysReply is enabled, send all chat messages in thread channels as replies
      if (! utils.isStaff(msg.member)) return; // Only staff are allowed to reply

      const replied = await thread.replyToUser(msg.member, msg.content.trim(), msg.attachments, config.alwaysReplyAnon || false);
      if (replied) msg.delete();
    } else {
      // Otherwise just save the messages as "chat" in the logs
      thread.saveChatMessageToLogs(msg);
    }
  });

  /**
   * When we get a private message...
   * 1) Find the open modmail thread for this user, or create a new one
   * 2) Post the message as a user reply in the thread
   */
  bot.on("messageCreate", async msg => {
    if (! (msg.channel instanceof Eris.PrivateChannel)) return;
    if (msg.author.bot) return;
    if (msg.type !== 0) return; // Ignore pins etc.

    if (await blocked.isBlocked(msg.author.id)) return;

    // Private message handling is queued so e.g. multiple message in quick succession don't result in multiple channels being created
    messageQueue.add(async () => {
      let thread = await threads.findOpenThreadByUserId(msg.author.id);
      const createNewThread = (thread == null);

      // New thread
      if (createNewThread) {
        // Ignore messages that shouldn't usually open new threads, such as "ok", "thanks", etc.
        if (config.ignoreAccidentalThreads && msg.content && ACCIDENTAL_THREAD_MESSAGES.includes(msg.content.trim().toLowerCase())) return;

        thread = await threads.createNewThreadForUser(msg.author, {
          source: "dm",
          message: msg,
        });
      }

      if (thread) {
        await thread.receiveUserReply(msg);

        if (createNewThread) {
          // Send auto-reply to the user
          if (config.responseMessage) {
            const responseMessage = utils.readMultilineConfigValue(config.responseMessage);

            try {
              const postToThreadChannel = config.showResponseMessageInThreadChannel;
              await thread.sendSystemMessageToUser(responseMessage, { postToThreadChannel });
            } catch (err) {
              await thread.postSystemMessage(`**NOTE:** Could not send auto-response to the user. The error given was: \`${err.message}\``);
            }
          }
        }
      }
    });
  });

  /**
   * When a message is edited...
   * 1) If that message was in DMs, and we have a thread open with that user, post the edit as a system message in the thread
   * 2) If that message was moderator chatter in the thread, update the corresponding chat message in the DB
   */
  bot.on("messageUpdate", async (msg, oldMessage) => {
    if (! msg || ! msg.author) return;
    if (msg.author.id === bot.user.id) return;
    if (await blocked.isBlocked(msg.author.id)) return;
    if (! msg.content) return;

    // Old message content doesn't persist between bot restarts
    const oldContent = oldMessage && oldMessage.content || "*Unavailable due to bot restart*";
    const newContent = msg.content;

    // Ignore edit events with changes only in embeds etc.
    if (newContent.trim() === oldContent.trim()) return;

    // 1) If this edit was in DMs
    if (! msg.author.bot && msg.channel instanceof Eris.PrivateChannel) {
      const thread = await threads.findOpenThreadByUserId(msg.author.id);
      if (! thread) return;

      const editMessage = utils.disableLinkPreviews(`**The user edited their message:**\n\`B:\` ${oldContent}\n\`A:\` ${newContent}`);
      thread.postSystemMessage(editMessage);
    }

    // 2) If this edit was a chat message in the thread
    else if (utils.messageIsOnInboxServer(msg) && (msg.author.bot || utils.isStaff(msg.member))) {
      const thread = await threads.findOpenThreadByChannelId(msg.channel.id);
      if (! thread) return;

      thread.updateChatMessageInLogs(msg);
    }
  });

  /**
   * When a staff message is deleted in a modmail thread, delete it from the database as well
   */
  bot.on("messageDelete", async msg => {
    if (! msg.author) return;
    if (msg.author.id === bot.user.id) return;
    if (! utils.messageIsOnInboxServer(msg)) return;
    if (! msg.author.bot && ! utils.isStaff(msg.member)) return;

    const thread = await threads.findOpenThreadByChannelId(msg.channel.id);
    if (! thread) return;

    thread.deleteChatMessageFromLogs(msg.id);
  });

  /**
   * When the bot is mentioned on the main server, ping staff in the log channel about it
   */
  bot.on("messageCreate", async msg => {
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
    const staffMention = (config.pingOnBotMention ? utils.getInboxMention() : "");
    const allowedMentions = (config.pingOnBotMention ? utils.getInboxMentionAllowedMentions() : undefined);

    const userMentionStr = `**${msg.author.username}#${msg.author.discriminator}** (\`${msg.author.id}\`)`;
    const messageLink = `https:\/\/discordapp.com\/channels\/${msg.channel.guild.id}\/${msg.channel.id}\/${msg.id}`;

    if (mainGuilds.length === 1) {
        content = `${staffMention}Bot mentioned in ${msg.channel.mention} by ${userMentionStr}: "${msg.cleanContent}"\n\n<${messageLink}>`;
    } else {
        content = `${staffMention}Bot mentioned in ${msg.channel.mention} (${msg.channel.guild.name}) by ${userMentionStr}: "${msg.cleanContent}"\n\n<${messageLink}>`;
    }

    bot.createMessage(utils.getLogChannel().id, {
      content,
      allowedMentions,
    });

    // Send an auto-response to the mention, if enabled
    if (config.botMentionResponse) {
      const botMentionResponse = utils.readMultilineConfigValue(config.botMentionResponse);
      bot.createMessage(msg.channel.id, botMentionResponse.replace(/{userMention}/g, `<@${msg.author.id}>`));
    }

    // If configured, automatically open a new thread with a user who has pinged it
    if (config.createThreadOnMention) {
      const existingThread = await threads.findOpenThreadByUserId(msg.author.id);
      if (! existingThread) {
        // Only open a thread if we don't already have one
        const createdThread = await threads.createNewThreadForUser(msg.author, { quiet: true });
        await createdThread.postSystemMessage(`This thread was opened from a bot mention in <#${msg.channel.id}>`);
        await createdThread.receiveUserReply(msg);
      }
    }
  });
}

function initUpdateNotifications() {
  if (config.updateNotifications) {
    updates.startVersionRefreshLoop();
  }
}

function getBasePlugins() {
  return [
    "file:./src/modules/reply",
    "file:./src/modules/close",
    "file:./src/modules/logs",
    "file:./src/modules/block",
    "file:./src/modules/move",
    "file:./src/modules/snippets",
    "file:./src/modules/suspend",
    "file:./src/modules/greeting",
    "file:./src/modules/webserverPlugin",
    "file:./src/modules/typingProxy",
    "file:./src/modules/version",
    "file:./src/modules/newthread",
    "file:./src/modules/id",
    "file:./src/modules/alert",
    "file:./src/modules/joinLeaveNotification",
    "file:./src/modules/roles",
  ];
}

function getExternalPlugins() {
  return config.plugins;
}

function getAllPlugins() {
  return [...getBasePlugins(), ...getExternalPlugins()];
}

async function installAllPlugins() {
  const plugins = getAllPlugins();
  await installPlugins(plugins);
}

async function loadAllPlugins() {
  // Initialize command manager
  const commands = createCommandManager(bot);

  // Register command aliases
  if (config.commandAliases) {
    for (const alias in config.commandAliases) {
      commands.addAlias(config.commandAliases[alias], alias);
    }
  }

  // Load plugins
  const basePlugins = getBasePlugins();
  const externalPlugins = getExternalPlugins();
  const plugins = getAllPlugins();

  const pluginApi = getPluginAPI({ bot, knex, config, commands });
  await loadPlugins([...basePlugins, ...externalPlugins], pluginApi);

  return {
    loadedCount: plugins.length,
    baseCount: basePlugins.length,
    externalCount: externalPlugins.length,
  };
}
