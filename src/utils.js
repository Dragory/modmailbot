const Eris = require('eris');
const bot = require('./bot');
const moment = require('moment');
const publicIp = require('public-ip');
const threads = require('./threads');
const attachments = require('./attachments');
const config = require('./config');

class BotError extends Error {}

const userMentionRegex = /^<@\!?([0-9]+?)>$/;

let inboxGuild = null;
let mainGuild = null;
let logChannel = null;

function getInboxGuild() {
  if (! inboxGuild) inboxGuild = bot.guilds.find(g => g.id === config.mailGuildId);
  if (! inboxGuild) throw new BotError('The bot is not on the modmail (inbox) server!');
  return inboxGuild;
}

function getMainGuild() {
  if (! mainGuild) mainGuild = bot.guilds.find(g => g.id === config.mainGuildId);
  if (! mainGuild) console.warn('[WARN] The bot is not on the main server! If this is intentional, you can ignore this warning.');
  return mainGuild;
}

/**
 * Returns the designated log channel, or the default channel if none is set
 * @param bot
 * @returns {object}
 */
function getLogChannel() {
  const inboxGuild = getInboxGuild();

  if (! config.logChannelId) {
    logChannel = inboxGuild.channels.get(inboxGuild.id);
  } else if (! logChannel) {
    logChannel = inboxGuild.channels.get(config.logChannelId);
  }

  if (! logChannel) {
    throw new BotError('Log channel not found!');
  }

  return logChannel;
}

function postError(str) {
  getLogChannel().createMessage({
    content: `@here **Error:** ${str.trim()}`,
    disableEveryone: false
  });
}

/**
 * Returns whether the given member has permission to use modmail commands
 * @param member
 * @returns {boolean}
 */
function isStaff(member) {
  if (! config.inboxServerPermission) return true;
  return member.permission.has(config.inboxServerPermission);
}

/**
 * Returns whether the given message is on the inbox server
 * @param msg
 * @returns {boolean}
 */
function messageIsOnInboxServer(msg) {
  if (! msg.channel.guild) return false;
  if (msg.channel.guild.id !== getInboxGuild().id) return false;
  return true;
}

/**
 * Returns whether the given message is on the main server
 * @param msg
 * @returns {boolean}
 */
function messageIsOnMainServer(msg) {
  if (! msg.channel.guild) return false;
  if (msg.channel.guild.id !== getMainGuild().id) return false;
  return true;
}

/**
 * Adds a command that can only be triggered on the inbox server.
 * Command handlers added with this function also get the thread the message was posted in as a third argument, if any.
 * @param cmd
 * @param fn
 * @param opts
 */
function addInboxCommand(cmd, fn, opts) {
  bot.registerCommand(cmd, async (msg, args) => {
    if (! messageIsOnInboxServer(msg)) return;
    if (! isStaff(msg.member)) return;

    const thread = await threads.getByChannelId(msg.channel.id);
    fn(msg, args, thread);
  }, opts);
}

/**
 * @param attachment
 * @returns {Promise<string>}
 */
async function formatAttachment(attachment) {
  let filesize = attachment.size || 0;
  filesize /= 1024;

  const attachmentUrl = await attachments.getUrl(attachment.id, attachment.filename);
  return `**Attachment:** ${attachment.filename} (${filesize.toFixed(1)}KB)\n${attachmentUrl}`;
}

/**
 * Returns the user ID of the user mentioned in str, if any
 * @param {String} str
 * @returns {String|null}
 */
function getUserMention(str) {
  str = str.trim();

  if (str.match(/^[0-9]+$/)) {
    // User ID
    return str;
  } else {
    let mentionMatch = str.match(userMentionRegex);
    if (mentionMatch) return mentionMatch[1];
  }

  return null;
}

/**
 * Returns the current timestamp in an easily readable form
 * @param {String|Date|undefined} date
 * @returns {String}
 */
function getTimestamp(date) {
  return moment.utc(date).format('HH:mm');
}

/**
 * Disables link previews in the given string by wrapping links in < >
 * @param {String} str
 * @returns {String}
 */
function disableLinkPreviews(str) {
  return str.replace(/(^|[^<])(https?:\/\/\S+)/ig, '$1<$2>');
}

/**
 * Returns a URL to the bot's web server
 * @param {String} path
 * @returns {String}
 */
function getSelfUrl(path = '') {
  if (config.url) {
    return Promise.resolve(`${config.url}/${path}`);
  } else {
    const port = config.port || 8890;
    return publicIp.v4().then(ip => {
      return `http://${ip}:${port}/${path}`;
    });
  }
}

/**
 * Returns the highest hoisted role of the given member
 * @param {Eris.Member} member
 * @returns {Eris.Role}
 */
function getMainRole(member) {
  const roles = member.roles.map(id => member.guild.roles.get(id));
  roles.sort((a, b) => a.position > b.position ? -1 : 1);
  return roles.find(r => r.hoist);
}

/**
 * Splits array items into chunks of the specified size
 * @param {Array} items
 * @param {Number} chunkSize
 * @returns {Array}
 */
function chunk(items, chunkSize) {
  const result = [];

  for (let i = 0; i < items.length; i += chunkSize) {
    result.push(items.slice(i, i + chunkSize));
  }

  return result;
}

module.exports = {
  BotError,

  getInboxGuild,
  getMainGuild,
  getLogChannel,
  postError,

  isStaff,
  messageIsOnInboxServer,
  messageIsOnMainServer,
  addInboxCommand,

  formatAttachment,

  getUserMention,
  getTimestamp,
  disableLinkPreviews,
  getSelfUrl,
  getMainRole,
  chunk,
};
