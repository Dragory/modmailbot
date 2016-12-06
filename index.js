const fs = require('fs');
const http = require('http');
const url = require('url');
const crypto = require('crypto');
const publicIp = require('public-ip');
const Eris = require('eris');
const moment = require('moment');
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

try {
  const blockedJSON = fs.readFileSync(blockFile, {encoding: 'utf8'});
  blocked = JSON.parse(blockedJSON);
} catch(e) {
  fs.writeFileSync(blockFile, '[]');
}

function saveBlocked() {
  fs.writeFileSync(blockFile, JSON.stringify(blocked, null, 4));
}

function getLogFileInfo(logfile) {
  const match = logfile.match(logFileFormatRegex);
  if (! match) return null;

  return {
    date: match[1],
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

function findLogFilesByUserId(userId) {
  return new Promise(resolve => {
    fs.readdir(logDir, (err, files) => {
      const logfiles = files.filter(file => {
        const info = getLogFileInfo(file);
        console.log('info:', info);
        console.log('userId:', userId, typeof userId);
        if (! info) return false;

        return info.userId === userId;
      });

      resolve(logfiles);
    });
  });
}

bot.on('ready', () => {
  modMailGuild = bot.guilds.find(g => g.id === config.mailGuildId);

  if (! modMailGuild) {
    console.error('You need to set and invite me to the mod mail guild first!');
    process.exit(0);
  }

  bot.editStatus(null, {name: 'DM me for help'});
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

bot.on('messageCreate', (msg) => {
  if (! (msg.channel instanceof Eris.PrivateChannel)) return;
  if (msg.author.id === bot.user.id) return;

  if (blocked.indexOf(msg.author.id) !== -1) return;

  // This needs to be queued as otherwise, if a user sent a bunch of messages initially and the createChannel endpoint is delayed, we might get duplicate channels
  messageQueue.add(() => {
    return getModmailChannel(msg.author).then(channel => {
      channel.createMessage(`« **${msg.author.username}#${msg.author.discriminator}:** ${msg.content}`);

      if (channel._wasCreated) {
        bot.createMessage(modMailGuild.id, {
          content: `@here New modmail thread: ${channel.mention}`,
          disableEveryone: false,
        });

        msg.channel.createMessage("Thank you for your message! Our mod team will reply to you here as soon as possible.");
      }
    });
  });
});

bot.registerCommand('reply', (msg, args) => {
  if (msg.channel.guild.id !== modMailGuild.id) return;
  if (! msg.member.permission.has('manageRoles')) return;

  const channelInfo = getModmailChannelInfo(msg.channel);
  if (! channelInfo) return;

  bot.getDMChannel(channelInfo.userId).then(channel => {
    const message = `**${msg.author.username}:** ${args.join(' ')}`;

    channel.createMessage(message);
    msg.channel.createMessage(`» ${message}`);
    msg.delete();
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
    let mentionMatch = args[0].match(/^<@([0-9]+?)>$/);
    if (mentionMatch) userId = mentionMatch[1];
  }

  if (! userId) return;

  blocked.push(args[0]);
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
    let mentionMatch = args[0].match(/^<@([0-9]+?)>$/);
    if (mentionMatch) userId = mentionMatch[1];
  }

  if (! userId) return;

  blocked.splice(blocked.indexOf(args[0]), 1);
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
    let mentionMatch = args[0].match(/^<@([0-9]+?)>$/);
    if (mentionMatch) userId = mentionMatch[1];
  }

  if (! userId) return;

  findLogFilesByUserId(userId).then(logfiles => {
    let message = `**Log files for <@${userId}>:**\n`;

    const urlPromises = logfiles.map(logfile => {
      const info = getLogFileInfo(logfile);
      return getLogFileUrl(logfile).then(url => {
        info.url = url;
        return info;
      });
    });

    Promise.all(urlPromises).then(infos => {
      infos.sort((a, b) => {
        if (a.date > b.date) return 1;
        if (a.date < b.date) return -1;
        return 0;
      });

      message += infos.map(info => {
        const formattedDate = moment.utc(info.date, 'YYYY-MM-DD-HH-mm-ss').format('MMM Mo [at] HH:mm [UTC]');
        return `${formattedDate}: <${info.url}>`;
      }).join('\n');

      msg.channel.createMessage(message);
    });
  });
});

bot.connect();

// Server for serving logs
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(`http://${req.url}`);

  if (! parsedUrl.path.startsWith('/logs/')) return;

  const pathParts = parsedUrl.path.split('/').filter(v => v !== '');
  const token = pathParts[pathParts.length - 1];

  console.log('token:', token);

  if (token.match(/^[0-9a-f]+$/) === null) return res.end();

  findLogFile(token).then(logfile => {
    console.log('logfile:', logfile);
    if (logfile === null) return res.end();

    fs.readFile(getLogFilePath(logfile), {encoding: 'utf8'}, (err, data) => {
      res.setHeader('Content-Type', 'text/plain');
      res.end(data);
    });
  });
});

server.listen(logServerPort);
