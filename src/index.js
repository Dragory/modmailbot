const Eris = require('eris');
const moment = require('moment');
const Queue = require('./queue');
const config = require('../config');
const utils = require('./utils');
const blocked = require('./blocked');
const threads = require('./threads');
const logs = require('./logs');
const attachments = require('./attachments');
const webserver = require('./webserver');

const bot = new Eris.CommandClient(config.token, {}, {
  prefix: config.prefix || '!',
  ignoreSelf: true,
  ignoreBots: true,
  defaultHelpCommand: false,
});

const messageQueue = new Queue();

bot.on('ready', () => {
  bot.editStatus(null, {name: config.status || 'Message me for help'});
  console.log('Bot started, listening to DMs');
});

// "Bot was mentioned in #general-discussion"
bot.on('messageCreate', msg => {
  if (msg.author.id === bot.user.id) return;

  if (msg.mentions.some(user => user.id === bot.user.id)) {
    blocked.isBlocked(msg.author.id).then(isBlocked => {
      if (isBlocked) return;

      bot.createMessage(utils.getModmailGuild(bot).id, {
        content: `@here Bot mentioned in ${msg.channel.mention} by **${msg.author.username}#${msg.author.discriminator}**: "${msg.cleanContent}"`,
        disableEveryone: false,
      });
    });
  }
});

// When we get a private message, forward the contents to the corresponding modmail thread
bot.on('messageCreate', (msg) => {
  if (! (msg.channel instanceof Eris.PrivateChannel)) return;
  if (msg.author.id === bot.user.id) return;

  blocked.isBlocked(msg.author.id).then(isBlocked => {
    if (isBlocked) return;

    // Download and save copies of attachments in the background
    attachments.saveAttachments(msg);

    let thread, logs;

    messageQueue.add(() => {
      threads.getForUser(bot, msg.author)
        .then(userThread => {
          thread = userThread;
          return logs.getLogsByUserId(msg.author.id);
        })
        .then(userLogs => {
          logs = userLogs;
          return utils.formatUserDM(msg);
        })
        .then(content => {
          // If the thread does not exist and could not be created, send a warning about this to all mods so they can DM the user directly instead
          if (! thread) {
            let warningMessage = `
              @here Error creating modmail thread for ${msg.author.username}#${msg.author.discriminator} (${msg.author.id})!
              
              Here's what their message contained:
              \`\`\`${content}\`\`\`
            `;

            bot.createMessage(utils.getModmailGuild(bot).id, {
              content: `@here Error creating modmail thread for ${msg.author.username}#${msg.author.discriminator} (${msg.author.id})!`,
              disableEveryone: false,
            });

            return;
          }

          // If the thread was just created, do some extra stuff
          if (thread._wasCreated) {
            // Mention previous logs at the start of the thread
            if (logs.length > 0) {
              bot.createMessage(thread.channelId, `${logs.length} previous modmail logs with this user. Use !logs ${msg.author.id} for details.`);
            }

            // Ping mods of the new thread
            let creationNotificationMessage = `New modmail thread: <#${channel.id}>`;
            if (config.pingCreationNotification) creationNotificationMessage = `@here ${creationNotificationMessage}`;

            bot.createMessage(utils.getModmailGuild(bot).id, {
              content: creationNotificationMessage,
              disableEveryone: false,
            });

            // Send an automatic reply to the user informing them of the successfully created modmail thread
            msg.channel.createMessage("Thank you for your message! Our mod team will reply to you here as soon as possible.").then(null, (err) => {
              bot.createMessage(modMailGuild.id, {
                content: `There is an issue sending messages to ${msg.author.username}#${msg.author.discriminator} (id ${msg.author.id}); consider messaging manually`
              });
            });
          }

          const timestamp = utils.getTimestamp();
          bot.createMessage(channel.id, `[${timestamp}] « **${msg.author.username}#${msg.author.discriminator}:** ${content}`);
        })
    });
  });
});

// Edits in DMs
bot.on('messageUpdate', (msg, oldMessage) => {
  if (! (msg.channel instanceof Eris.PrivateChannel)) return;
  if (msg.author.id === bot.user.id) return;

  blocked.isBlocked(msg.author.id).then(isBlocked => {
    if (isBlocked) return;

    let oldContent = oldMessage.content;
    const newContent = msg.content;

    if (oldContent == null) oldContent = '*Unavailable due to bot restart*';

    threads.getForUser(bot, msg.author).then(thread => {
      if (! thread) return;

      const editMessage = utils.disableLinkPreviews(`**The user edited their message:**\n**Before:** ${oldContent}\n**After:** ${newContent}`);

      bot.createMessage(thread.channelId, editMessage);
    });
  });
});

// Mods can reply to modmail threads using !r or !reply
// These messages get relayed back to the DM thread between the bot and the user
bot.registerCommand('reply', (msg, args) => {
  if (! msg.channel.guild) return;
  if (msg.channel.guild.id !== utils.getModmailGuild(bot).id) return;
  if (! msg.member.permission.has('manageRoles')) return;

  threads.getByChannelId(msg.channel.id).then(thread => {
    if (! thread) return;

    attachments.saveAttachments(msg).then(() => {
      bot.getDMChannel(thread.userId).then(dmChannel => {
        const roleId = msg.member.roles[0];
        const role = (roleId ? (modMailGuild.roles.get(roleId) || {}).name : '');
        const roleStr = (role ? `(${role}) ` : '');

        let argMsg = args.join(' ').trim();
        let content = `**${roleStr}${msg.author.username}:** ${argMsg}`;

        function sendMessage(file, attachmentUrl) {
          dmChannel.createMessage(content, file).then(() => {
            if (attachmentUrl) content += `\n\n**Attachment:** ${attachmentUrl}`;

            const timestamp = getTimestamp();
            msg.channel.createMessage(`[${timestamp}] » ${content}`);
          }, (err) => {
            if (err.resp && err.resp.statusCode === 403) {
              msg.channel.createMessage(`Could not send reply; the user has likely blocked the bot`);
            } else if (err.resp) {
              msg.channel.createMessage(`Could not send reply; error code ${err.resp.statusCode}`);
            } else {
              msg.channel.createMessage(`Could not send reply: ${err.toString()}`);
            }
          });

          msg.delete();
        };

        // If the reply has an attachment, relay it as is
        if (msg.attachments.length > 0) {
          fs.readFile(attachments.getAttachmentPath(msg.attachments[0].id), (err, data) => {
            const file = {file: data, name: msg.attachments[0].filename};

            getAttachmentUrl(msg.attachments[0].id, msg.attachments[0].filename).then(attachmentUrl => {
              sendMessage(file, attachmentUrl);
            });
          });
        } else {
          sendMessage();
        }
      });
    });
  });
});

bot.registerCommandAlias('r', 'reply');

bot.registerCommand('close', (msg, args) => {
  if (! msg.channel.guild) return;
  if (msg.channel.guild.id !== modMailGuild.id) return;
  if (! msg.member.permission.has('manageRoles')) return;

  threads.getByChannelId(msg.channel.id).then(thread => {
    if (! thread) return;

    msg.channel.createMessage('Saving logs and closing channel...');
    msg.channel.getMessages(10000).then(messages => {
      const log = messages.reverse().map(msg => {
          const date = moment.utc(msg.timestamp, 'x').format('YYYY-MM-DD HH:mm:ss');
          return `[${date}] ${msg.author.username}#${msg.author.discriminator}: ${msg.content}`;
        }).join('\n') + '\n';

      logs.getNewLogFile(thread.userId).then(logFilename => {
        logs.saveLogFile(logFilename, log)
          .then(() => getLogFileUrl(logFilename))
          .then(url => {
            const closeMessage = `Modmail thread with ${thread.username} (${thread.userId}) was closed by ${msg.author.mention}
Logs: <${url}>`;

            bot.createMessage(utils.getModmailGuild(bot).id, closeMessage);
            threads.close(thread.channelId).then(() => msg.channel.delete());
          });
      });
    });
  });
});

bot.registerCommand('block', (msg, args) => {
  if (! msg.channel.guild) return;
  if (msg.channel.guild.id !== utils.getModmailGuild(bot).id) return;
  if (! msg.member.permission.has('manageRoles')) return;

  function block(userId) {
    blocked.block(userId).then(() => {
      msg.channel.createMessage(`Blocked <@${userId}> (id ${userId}) from modmail`);
    });
  }

  if (args.length > 0) {
    const userId = utils.getUserMention(args.join(' '));
    if (! userId) return;
    block(userId);
  } else {
    // Calling !block without args in a modmail thread blocks the user of that thread
    threads.getByChannelId(msg.channel.id).then(thread => {
      if (! thread) return;
      block(userId);
    });
  }
});

bot.registerCommand('unblock', (msg, args) => {
  if (! msg.channel.guild) return;
  if (msg.channel.guild.id !== utils.getModmailGuild(bot).id) return;
  if (! msg.member.permission.has('manageRoles')) return;

  function unblock(userId) {
    blocked.unblock(userId).then(() => {
      msg.channel.createMessage(`Unblocked <@${userId}> (id ${userId}) from modmail`);
    });
  }

  if (args.length > 0) {
    const userId = utils.getUserMention(args.join(' '));
    if (! userId) return;
    unblock(userId);
  } else {
    // Calling !unblock without args in a modmail thread unblocks the user of that thread
    threads.getByChannelId(msg.channel.id).then(thread => {
      if (! thread) return;
      unblock(userId);
    });
  }
});

bot.registerCommand('logs', (msg, args) => {
  if (! msg.channel.guild) return;
  if (msg.channel.guild.id !== utils.getModmailGuild(bot).id) return;
  if (! msg.member.permission.has('manageRoles')) return;

  function getLogs(userId) {
    getLogsWithUrlByUserId(userId).then(infos => {
      let message = `**Log files for <@${userId}>:**\n`;

      message += infos.map(info => {
        const formattedDate = moment.utc(info.date, 'YYYY-MM-DD HH:mm:ss').format('MMM Do [at] HH:mm [UTC]');
        return `\`${formattedDate}\`: <${info.url}>`;
      }).join('\n');

      msg.channel.createMessage(message);
    });
  }

  if (args.length > 0) {
    const userId = utils.getUserMention(args.join(' '));
    if (! userId) return;
    getLogs(userId);
  } else {
    // Calling !logs without args in a modmail thread returns the logs of the user of that thread
    threads.getByChannelId(msg.channel.id).then(thread => {
      if (! thread) return;
      getLogs(userId);
    });
  }
});

bot.connect();
webserver.run();
