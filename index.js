const fs = require('fs');
const http = require('http');
const https = require('https');
const url = require('url');
const crypto = require('crypto');
const publicIp = require('public-ip');
const Eris = require('eris');
const moment = require('moment');
const mime = require('mime');
const Queue = require('./queue');
const config = require('./config');

const logServerPort = config.port || 8890;

const bot = new Eris.CommandClient(config.token, {}, {
  prefix: config.prefix || '!',
  ignoreSelf: true,
  ignoreBots: true,
  defaultHelpCommand: false,
});

let modMailGuild;
const modMailChannels = {};
const messageQueue = new Queue();

const blockFile = `${__dirname}/blocked.json`;
let blocked = [];

const logDir = `${__dirname}/logs`;
const logFileFormatRegex = /^([0-9\-]+?)__([0-9]+?)__([0-9a-f]+?)\.txt$/;

const userMentionRegex = /^<@\!?([0-9]+?)>$/;

const attachmentDir = `${__dirname}/attachments`;

try {
  const blockedJSON = fs.readFileSync(blockFile, {encoding: 'utf8'});
  blocked = JSON.parse(blockedJSON);
} catch(e) {
  fs.writeFileSync(blockFile, '[]');
}

function saveBlocked() {
  fs.writeFileSync(blockFile, JSON.stringify(blocked, null, 4));
}

/*
 * MODMAIL LOG UTILITY FUNCTIONS
 */

function getLogFileInfo(logfile) {
  const match = logfile.match(logFileFormatRegex);
  if (! match) return null;

  const date = moment.utc(match[1], 'YYYY-MM-DD-HH-mm-ss').format('YYYY-MM-DD HH:mm:ss');

  return {
    filename: logfile,
    date: date,
    userId: match[2],
    token: match[3],
  };
}

function getLogFilePath(logfile) {
  return `${logDir}/${logfile}`;
}

function getLogFileUrl(logfile) {
  const info = getLogFileInfo(logfile);

  return publicIp.v4().then(ip => {
    return `http://${ip}:${logServerPort}/logs/${info.token}`;
  });
}

function getRandomLogFile(userId) {
  return new Promise(resolve => {
    crypto.randomBytes(16, (err, buf) => {
      const token = buf.toString('hex');
      const date = moment.utc().format('YYYY-MM-DD-HH-mm-ss');

      resolve(`${date}__${userId}__${token}.txt`);
    });
  });
}

function findLogFile(token) {
  return new Promise(resolve => {
    fs.readdir(logDir, (err, files) => {
      for (const file of files) {
        if (file.endsWith(`__${token}.txt`)) {
          resolve(file);
          return;
        }
      }

      resolve(null);
    });
  });
}

function getLogsByUserId(userId) {
  return new Promise(resolve => {
    fs.readdir(logDir, (err, files) => {
      const logfileInfos = files
        .map(file => getLogFileInfo(file))
        .filter(info => info && info.userId === userId);

      resolve(logfileInfos);
    });
  });
}

function getLogsWithUrlByUserId(userId) {
  return getLogsByUserId(userId).then(infos => {
    const urlPromises = infos.map(info => {
      return getLogFileUrl(info.filename).then(url => {
        info.url = url;
        return info;
      });
    });

    return Promise.all(urlPromises).then(infos => {
      infos.sort((a, b) => {
        if (a.date > b.date) return 1;
        if (a.date < b.date) return -1;
        return 0;
      });

      return infos;
    });
  });
}

/*
 * Attachments
 */

function getAttachmentPath(id) {
  return `${attachmentDir}/${id}`;
}

function saveAttachment(attachment, tries = 0) {
  return new Promise((resolve, reject) => {
    if (tries > 3) {
      console.error('Attachment download failed after 3 tries:', attachment);
      reject('Attachment download failed after 3 tries');
      return;
    }

    const filepath = getAttachmentPath(attachment.id);
    const writeStream = fs.createWriteStream(filepath);

    https.get(attachment.url, (res) => {
      res.pipe(writeStream);
      writeStream.on('finish', () => {
        writeStream.close()
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath);
      console.error('Error downloading attachment, retrying');
      resolve(saveAttachment(attachment));
    });
  });
}

function saveAttachments(msg) {
  if (! msg.attachments || msg.attachments.length === 0) return Promise.resolve();
  return Promise.all(msg.attachments.map(saveAttachment));
}

function getAttachmentUrl(id, desiredName) {
  if (desiredName == null) desiredName = 'file.bin';

  return publicIp.v4().then(ip => {
    return `http://${ip}:${logServerPort}/attachments/${id}/${desiredName}`;
  });
}

/*
 * MAIN FUNCTIONALITY
 */

bot.on('ready', () => {
  modMailGuild = bot.guilds.find(g => g.id === config.mailGuildId);

  if (! modMailGuild) {
    console.error('You need to set and invite me to the mod mail guild first!');
    process.exit(0);
  }

  bot.editStatus(null, {name: config.status || 'Message me for help'});
  console.log('Bot started, listening to DMs');
});

function getModmailChannelInfo(channel) {
  if (! channel.topic) return null;

  const match = channel.topic.match(/^MODMAIL\|([0-9]+)\|(.*)$/);
  if (! match) return null;

  return {
    userId: match[1],
    name: match[2],
  };
}

function getModmailChannel(user) {
  if (modMailChannels[user.id]) {
    // Cached
    const channel = modMailGuild.channels.get(modMailChannels[user.id]);
    if (channel) {
      return Promise.resolve(channel);
    } else {
      // If the cache value was invalid, remove it
      delete modMailChannels[user.id];
    }
  }

  // Try to find a matching channel
  let candidate = modMailGuild.channels.find(c => {
    const info = getModmailChannelInfo(c);
    return info && info.userId === user.id;
  });

  if (candidate) {
    return Promise.resolve(candidate);
  } else {
    // If one is not found, create and cache it
    return modMailGuild.createChannel(`${user.username}-${user.discriminator}`)
      .then(channel => {
        // This is behind a timeout because Discord was telling me the channel didn't exist after creation even though it clearly did
        // ¯\_(ツ)_/¯
        return new Promise(resolve => {
          const topic = `MODMAIL|${user.id}|${user.username}#${user.discriminator}`;
          setTimeout(() => resolve(channel.edit({topic: topic})), 200);
        });
      })
      .then(channel => {
        modMailChannels[user.id] = channel.id;
        channel._wasCreated = true;
        return channel;
      });
  }
}

function formatAttachment(attachment) {
  let filesize = attachment.size || 0;
  filesize /= 1024;

  return getAttachmentUrl(attachment.id, attachment.filename).then(attachmentUrl => {
    return `**Attachment:** ${attachment.filename} (${filesize.toFixed(1)}KB)\n${attachmentUrl}`;
  });
}

// When we get a private message, create a modmail channel or reuse an existing one.
// If the channel was not reused, assume it's a new modmail thread and send the user an introduction message.
bot.on('messageCreate', (msg) => {
  if (! (msg.channel instanceof Eris.PrivateChannel)) return;
  if (msg.author.id === bot.user.id) return;

  if (blocked.indexOf(msg.author.id) !== -1) return;

  saveAttachments(msg);

  // This needs to be queued, as otherwise if a user sent a bunch of messages initially and the createChannel endpoint is delayed, we might get duplicate channels
  messageQueue.add(() => {
    return getModmailChannel(msg.author).then(channel => {
      let content = msg.content;

      // Get a local URL for all attachments so we don't rely on discord's servers (which delete attachments when the channel/DM thread is deleted)
      const attachmentFormatPromise = msg.attachments.map(formatAttachment);
      Promise.all(attachmentFormatPromise).then(formattedAttachments => {
        formattedAttachments.forEach(str => {
          content += `\n\n${str}`;
        });

        // Get previous modmail logs for this user
        // Show a note of them at the beginning of the thread for reference
        getLogsByUserId(msg.author.id).then(logs => {
          if (channel._wasCreated) {
            if (logs.length > 0) {
              channel.createMessage(`${logs.length} previous modmail logs with this user. Use !logs ${msg.author.id} for details.`);
            }

            let creationNotificationMessage = `New modmail thread: ${channel.mention}`;
            if (config.pingCreationNotification) creationNotificationMessage = `@here ${config.pingCreationNotification}`;

            bot.createMessage(modMailGuild.id, {
              content: creationNotificationMessage,
              disableEveryone: false,
            });

            msg.channel.createMessage("Thank you for your message! Our mod team will reply to you here as soon as possible.").then(null, (err) => {
              bot.createMessage(modMailGuild.id, {
                content: `There is an issue sending messages to ${msg.author.username}#${msg.author.discriminator} (id ${msg.author.id}); consider messaging manually`
              });
            });
          }

          channel.createMessage(`« **${msg.author.username}#${msg.author.discriminator}:** ${content}`);
        });
      });
    });
  });
});

// Mods can reply to modmail threads using !r or !reply
// These messages get relayed back to the DM thread between the bot and the user
// Attachments are shown as URLs
bot.registerCommand('reply', (msg, args) => {
  if (msg.channel.guild.id !== modMailGuild.id) return;
  if (! msg.member.permission.has('manageRoles')) return;

  const channelInfo = getModmailChannelInfo(msg.channel);
  if (! channelInfo) return;

  saveAttachments(msg).then(() => {
    bot.getDMChannel(channelInfo.userId).then(dmChannel => {
      const roleId = msg.member.roles[0];
      const role = (roleId ? modMailGuild.roles.get(roleId).name : '');
      const roleStr = (role ? `(${role}) ` : '');

      let argMsg = args.join(' ').trim();
      let content = `**${roleStr}${msg.author.username}:** ${argMsg}`;

      const sendMessage = (file, attachmentUrl) => {
        dmChannel.createMessage(content, file).then(() => {
          if (attachmentUrl) content += `\n\n**Attachment:** ${attachmentUrl}`;
          msg.channel.createMessage(`» ${content}`);
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

      if (msg.attachments.length > 0) {
        fs.readFile(getAttachmentPath(msg.attachments[0].id), (err, data) => {
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

bot.registerCommandAlias('r', 'reply');

bot.registerCommand('close', (msg, args) => {
  if (msg.channel.guild.id !== modMailGuild.id) return;
  if (! msg.member.permission.has('manageRoles')) return;

  const channelInfo = getModmailChannelInfo(msg.channel);
  if (! channelInfo) return;

  msg.channel.createMessage('Saving logs and closing channel...');
  msg.channel.getMessages(10000).then(messages => {
    const log = messages.reverse().map(message => {
      const date = moment.utc(message.timestamp, 'x').format('YYYY-MM-DD HH:mm:ss');
      return `[${date}] ${message.author.username}#${message.author.discriminator}: ${message.content}`;
    }).join('\n') + '\n';

    getRandomLogFile(channelInfo.userId).then(logfile => {
      fs.writeFile(getLogFilePath(logfile), log, {encoding: 'utf8'}, err => {
        getLogFileUrl(logfile).then(logurl => {
          bot.createMessage(modMailGuild.id, `Log of modmail thread with ${channelInfo.name}:\n<${logurl}>`);

          delete modMailChannels[channelInfo.userId];
          msg.channel.delete();
        });
      });
    })
  });
});

bot.registerCommand('block', (msg, args) => {
  if (msg.channel.guild.id !== modMailGuild.id) return;
  if (! msg.member.permission.has('manageRoles')) return;
  if (args.length !== 1) return;

  let userId;
  if (args[0].match(/^[0-9]+$/)) {
    userId = args[0];
  } else {
    let mentionMatch = args[0].match(userMentionRegex);
    if (mentionMatch) userId = mentionMatch[1];
  }

  if (! userId) return;

  blocked.push(userId);
  saveBlocked();
  msg.channel.createMessage(`Blocked <@${userId}> (id ${userId}) from modmail`);
});

bot.registerCommand('unblock', (msg, args) => {
  if (msg.channel.guild.id !== modMailGuild.id) return;
  if (! msg.member.permission.has('manageRoles')) return;
  if (args.length !== 1) return;

  let userId;
  if (args[0].match(/^[0-9]+$/)) {
    userId = args[0];
  } else {
    let mentionMatch = args[0].match(userMentionRegex);
    if (mentionMatch) userId = mentionMatch[1];
  }

  if (! userId) return;

  blocked.splice(blocked.indexOf(userId), 1);
  saveBlocked();
  msg.channel.createMessage(`Unblocked <@${userId}> (id ${userId}) from modmail`);
});

bot.registerCommand('logs', (msg, args) => {
  if (msg.channel.guild.id !== modMailGuild.id) return;
  if (! msg.member.permission.has('manageRoles')) return;
  if (args.length !== 1) return;

  let userId;
  if (args[0].match(/^[0-9]+$/)) {
    userId = args[0];
  } else {
    let mentionMatch = args[0].match(userMentionRegex);
    if (mentionMatch) userId = mentionMatch[1];
  }

  if (! userId) return;

  getLogsWithUrlByUserId(userId).then(infos => {
    let message = `**Log files for <@${userId}>:**\n`;

    message += infos.map(info => {
      const formattedDate = moment.utc(info.date, 'YYYY-MM-DD HH:mm:ss').format('MMM Mo [at] HH:mm [UTC]');
      return `${formattedDate}: <${info.url}>`;
    }).join('\n');

    msg.channel.createMessage(message);
  });
});

bot.connect();

/*
 * MODMAIL LOG SERVER
 */

function serveLogs(res, pathParts) {
  const token = pathParts[pathParts.length - 1];
  if (token.match(/^[0-9a-f]+$/) === null) return res.end();

  findLogFile(token).then(logfile => {
    if (logfile === null) return res.end();

    fs.readFile(getLogFilePath(logfile), {encoding: 'utf8'}, (err, data) => {
      if (err) {
        res.statusCode = 404;
        res.end('Log not found');
        return;
      }

      res.setHeader('Content-Type', 'text/plain');
      res.end(data);
    });
  });
}

function serveAttachments(res, pathParts) {
  const desiredFilename = pathParts[pathParts.length - 1];
  const id = pathParts[pathParts.length - 2];

  if (id.match(/^[0-9]+$/) === null) return res.end();
  if (desiredFilename.match(/^[0-9a-z\._-]+$/i) === null) return res.end();

  const attachmentPath = getAttachmentPath(id);
  fs.access(attachmentPath, (err) => {
    if (err) {
      res.statusCode = 404;
      res.end('Attachment not found');
      return;
    }

    const filenameParts = desiredFilename.split('.');
    const ext = (filenameParts.length > 1 ? filenameParts[filenameParts.length - 1] : 'bin');
    const fileMime = mime.lookup(ext);

    res.setHeader('Content-Type', fileMime);

    const read = fs.createReadStream(attachmentPath);
    read.pipe(res);
  })
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(`http://${req.url}`);
  const pathParts = parsedUrl.path.split('/').filter(v => v !== '');

  if (parsedUrl.path.startsWith('/logs/')) serveLogs(res, pathParts);
  if (parsedUrl.path.startsWith('/attachments/')) serveAttachments(res, pathParts);
});

server.listen(logServerPort);
