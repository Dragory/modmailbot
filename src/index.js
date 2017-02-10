const Eris = require('eris');
const fs = require('fs');
const moment = require('moment');
const config = require('../config');
const Queue = require('./queue');
const utils = require('./utils');
const blocked = require('./blocked');
const threads = require('./threads');
const logs = require('./logs');
const attachments = require('./attachments');
const webserver = require('./webserver');
const greeting = require('./greeting');

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

function formatAttachment(attachment) {
  let filesize = attachment.size || 0;
  filesize /= 1024;

  return attachments.getUrl(attachment.id, attachment.filename).then(attachmentUrl => {
    return `**Attachment:** ${attachment.filename} (${filesize.toFixed(1)}KB)\n${attachmentUrl}`;
  });
}

function formatUserDM(msg) {
  let content = msg.content;

  // Get a local URL for all attachments so we don't rely on discord's servers (which delete attachments when the channel/DM thread is deleted)
  const attachmentFormatPromise = msg.attachments.map(formatAttachment);
  return Promise.all(attachmentFormatPromise).then(formattedAttachments => {
    formattedAttachments.forEach(str => {
      content += `\n\n${str}`;
    });

    return content;
  });
}

// "Bot was mentioned in #general-discussion"
bot.on('messageCreate', msg => {
  if (msg.author.id === bot.user.id) return;

  if (msg.mentions.some(user => user.id === bot.user.id)) {
    // If the person who mentioned the modmail bot is on the modmail server, don't ping about it
    if (utils.getModmailGuild(bot).members.get(msg.author.id)) return;

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
    attachments.saveAttachmentsInMessage(msg);

    let thread, userLogs;

    // Private message handling is queued so e.g. multiple message in quick succession don't result in multiple channels aren't created
    messageQueue.add(() => {
      return threads.getForUser(bot, msg.author)
        .then(userThread => {
          thread = userThread;
          return logs.getLogsByUserId(msg.author.id);
        })
        .then(foundUserLogs => {
          userLogs = foundUserLogs;
          return formatUserDM(msg);
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
            bot.createMessage(utils.getModmailGuild(bot).id, {
              content: `@here New modmail thread: <#${thread.channelId}>`,
              disableEveryone: false,
            });

            // Send an automatic reply to the user informing them of the successfully created modmail thread
            msg.channel.createMessage("Thank you for your message! Our mod team will reply to you here as soon as possible.").then(null, (err) => {
              bot.createMessage(utils.getModmailGuild(bot).id, {
                content: `There is an issue sending messages to ${msg.author.username}#${msg.author.discriminator} (id ${msg.author.id}); consider messaging manually`
              });
            });
          }

          const timestamp = utils.getTimestamp();
          bot.createMessage(thread.channelId, `[${timestamp}] « **${msg.author.username}#${msg.author.discriminator}:** ${content}`);
        });
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

function reply(msg, text, anonymous = false) {
  threads.getByChannelId(msg.channel.id).then(thread => {
    if (! thread) return;

    attachments.saveAttachmentsInMessage(msg).then(() => {
      bot.getDMChannel(thread.userId).then(dmChannel => {
        let modUsername, logModUsername;
        const mainRole = utils.getMainRole(msg.member);

        if (anonymous) {
          modUsername = (mainRole ? mainRole.name : 'Moderator');
          logModUsername = `(Anonymous) (${msg.author.username}) ${mainRole ? mainRole.name : 'Moderator'}`;
        } else {
          modUsername = (mainRole ? `(${mainRole.name}) ${msg.author.username}` : msg.author.username);
          logModUsername = modUsername;
        }

        let content = `**${modUsername}:** ${text}`;
        let logContent = `**${logModUsername}:** ${text}`;

        function sendMessage(file, attachmentUrl) {
          dmChannel.createMessage(content, file).then(() => {
            if (attachmentUrl) {
              content += `\n\n**Attachment:** ${attachmentUrl}`;
              logContent += `\n\n**Attachment:** ${attachmentUrl}`;
            }

            // Show the message in the modmail thread as well
            const timestamp = utils.getTimestamp();
            msg.channel.createMessage(`[${timestamp}] » ${logContent}`);
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
          fs.readFile(attachments.getPath(msg.attachments[0].id), (err, data) => {
            const file = {file: data, name: msg.attachments[0].filename};

            attachments.getUrl(msg.attachments[0].id, msg.attachments[0].filename).then(attachmentUrl => {
              sendMessage(file, attachmentUrl);
            });
          });
        } else {
          sendMessage();
        }
      });
    });
  });
}

// Mods can reply to modmail threads using !r or !reply
// These messages get relayed back to the DM thread between the bot and the user
bot.registerCommand('reply', (msg, args) => {
  if (! msg.channel.guild) return;
  if (msg.channel.guild.id !== utils.getModmailGuild(bot).id) return;
  if (! msg.member.permission.has('manageRoles')) return;

  const text = args.join(' ').trim();
  reply(msg, text, false);
});

bot.registerCommandAlias('r', 'reply');

// Anonymous replies only show the role, not the username
bot.registerCommand('anonreply', (msg, args) => {
  if (! msg.channel.guild) return;
  if (msg.channel.guild.id !== utils.getModmailGuild(bot).id) return;
  if (! msg.member.permission.has('manageRoles')) return;

  const text = args.join(' ').trim();
  reply(msg, text, true);
});

bot.registerCommandAlias('ar', 'anonreply');

bot.registerCommand('close', (msg, args) => {
  if (! msg.channel.guild) return;
  if (msg.channel.guild.id !== utils.getModmailGuild(bot).id) return;
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
          .then(() => logs.getLogFileUrl(logFilename))
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
      block(thread.userId);
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
      unblock(thread.userId);
    });
  }
});

bot.registerCommand('logs', (msg, args) => {
  if (! msg.channel.guild) return;
  if (msg.channel.guild.id !== utils.getModmailGuild(bot).id) return;
  if (! msg.member.permission.has('manageRoles')) return;

  function getLogs(userId) {
    logs.getLogsWithUrlByUserId(userId).then(infos => {
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
      getLogs(thread.userId);
    });
  }
});

bot.connect();
webserver.run();
greeting.enable(bot);
