const Eris = require("eris");
const bot = require("./bot");
const moment = require("moment");
const humanizeDuration = require("humanize-duration");
const publicIp = require("public-ip");
const config = require("./cfg");
const { BotError } = require("./BotError");

const userMentionRegex = /^<@!?([0-9]+?)>$/;

let inboxGuild = null;
let mainGuilds = [];
let logChannel = null;

/**
 * @returns {Eris~Guild}
 */
function getInboxGuild() {
  if (! inboxGuild) inboxGuild = bot.guilds.find(g => g.id === config.inboxServerId);
  if (! inboxGuild) throw new BotError("The bot is not on the inbox server!");
  return inboxGuild;
}

/**
 * @returns {Eris~Guild[]}
 */
function getMainGuilds() {
  if (mainGuilds.length === 0) {
    mainGuilds = bot.guilds.filter(g => config.mainServerId.includes(g.id));
  }

  if (mainGuilds.length !== config.mainServerId.length) {
    if (config.mainServerId.length === 1) {
      console.warn("[WARN] The bot hasn't joined the main guild!");
    } else {
      console.warn("[WARN] The bot hasn't joined one or more main guilds!");
    }
  }

  return mainGuilds;
}

/**
 * Returns the designated log channel, or the default channel if none is set
 * @returns {Eris~TextChannel}
 */
function getLogChannel() {
  const _inboxGuild = getInboxGuild();
  const _logChannel = _inboxGuild.channels.get(config.logChannelId);

  if (! _logChannel) {
    throw new BotError("Log channel (logChannelId) not found!");
  }

  if (! (_logChannel instanceof Eris.TextChannel)) {
    throw new BotError("Make sure the logChannelId option is set to a text channel!");
  }

  return _logChannel;
}

function postLog(...args) {
  return getLogChannel().createMessage(...args);
}

function postError(channel, str, opts = {}) {
  return channel.createMessage({
    ...opts,
    content: `⚠ ${str}`
  });
}

/**
 * Returns whether the given member has permission to use modmail commands
 * @param {Eris.Member} member
 * @returns {boolean}
 */
function isStaff(member) {
  if (! member) return false;
  if (config.inboxServerPermission.length === 0) return true;
  if (member.guild.ownerID === member.id) return true;

  return config.inboxServerPermission.some(perm => {
    if (isSnowflake(perm)) {
      // If perm is a snowflake, check it against the member's user id and roles
      if (member.id === perm) return true;
      if (member.roles.includes(perm)) return true;
    } else {
      // Otherwise assume perm is the name of a permission
      return member.permission.has(perm);
    }

    return false;
  });
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

  return getMainGuilds()
    .some(g => msg.channel.guild.id === g.id);
}

/**
 * @param attachment
 * @returns {Promise<string>}
 */
async function formatAttachment(attachment, attachmentUrl) {
  let filesize = attachment.size || 0;
  filesize /= 1024;

  return `**Attachment:** ${attachment.filename} (${filesize.toFixed(1)}KB)\n${attachmentUrl}`;
}

/**
 * Returns the user ID of the user mentioned in str, if any
 * @param {String} str
 * @returns {String|null}
 */
function getUserMention(str) {
  if (! str) return null;

  str = str.trim();

  if (isSnowflake(str)) {
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
 * @returns {String}
 */
function getTimestamp(...momentArgs) {
  return moment.utc(...momentArgs).format("HH:mm");
}

/**
 * Disables link previews in the given string by wrapping links in < >
 * @param {String} str
 * @returns {String}
 */
function disableLinkPreviews(str) {
  return str.replace(/(^|[^<])(https?:\/\/\S+)/ig, "$1<$2>");
}

/**
 * Returns a URL to the bot's web server
 * @param {String} path
 * @returns {Promise<String>}
 */
async function getSelfUrl(path = "") {
  if (config.url) {
    return `${config.url}/${path}`;
  } else {
    const port = config.port || 8890;
    const ip = await publicIp.v4();
    return `http://${ip}:${port}/${path}`;
  }
}

/**
 * Returns the highest hoisted role of the given member
 * @param {Eris~Member} member
 * @returns {Eris~Role}
 */
function getMainRole(member) {
  const roles = member.roles.map(id => member.guild.roles.get(id));
  roles.sort((a, b) => a.position > b.position ? -1 : 1);
  return roles.find(r => r.hoist);
}

/**
 * Splits array items into chunks of the specified size
 * @param {Array|String} items
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

/**
 * Trims every line in the string
 * @param {String} str
 * @returns {String}
 */
function trimAll(str) {
  return str
    .split("\n")
    .map(_str => _str.trim())
    .join("\n");
}

const delayStringRegex = /^([0-9]+)(?:([dhms])[a-z]*)?/i;

/**
 * Turns a "delay string" such as "1h30m" to milliseconds
 * @param {String} str
 * @returns {Number|null}
 */
function convertDelayStringToMS(str) {
  let match;
  let ms = 0;

  str = str.trim();

  while (str !== "" && (match = str.match(delayStringRegex)) !== null) {
    if (match[2] === "d") ms += match[1] * 1000 * 60 * 60 * 24;
    else if (match[2] === "h") ms += match[1] * 1000 * 60 * 60;
    else if (match[2] === "s") ms += match[1] * 1000;
    else if (match[2] === "m" || ! match[2]) ms += match[1] * 1000 * 60;

    str = str.slice(match[0].length);
  }

  // Invalid delay string
  if (str !== "") {
    return null;
  }

  return ms;
}

/**
 * @param {string|string[]} mentionRoles
 * @returns {string[]}
 */
function getValidMentionRoles(mentionRoles) {
  if (! Array.isArray(mentionRoles)) {
    mentionRoles = [mentionRoles];
  }

  return mentionRoles.filter(roleStr => {
    return (roleStr !== null && roleStr !== "none" && roleStr !== "off" && roleStr !== "");
  });
}

/**
 * @param {string[]} mentionRoles
 * @returns {string}
 */
function mentionRolesToMention(mentionRoles) {
  const mentions = [];
  for (const role of mentionRoles) {
    if (role === "here") mentions.push("@here");
    else if (role === "everyone") mentions.push("@everyone");
    else mentions.push(`<@&${role}>`);
  }
  return mentions.join(" ") + " ";
}

/**
 * @returns {string}
 */
function getInboxMention() {
  const mentionRoles = getValidMentionRoles(config.mentionRole);
  return mentionRolesToMention(mentionRoles);
}

/**
 * @param {string[]} mentionRoles
 * @returns {object}
 */
function mentionRolesToAllowedMentions(mentionRoles) {
  const allowedMentions = {
    everyone: false,
    roles: [],
  };

  for (const role of mentionRoles) {
    if (role === "here" || role === "everyone") allowedMentions.everyone = true;
    else allowedMentions.roles.push(role);
  }

  return allowedMentions;
}

/**
 * @returns {object}
 */
function getInboxMentionAllowedMentions() {
  const mentionRoles = getValidMentionRoles(config.mentionRole);
  return mentionRolesToAllowedMentions(mentionRoles);
}

function postSystemMessageWithFallback(channel, thread, text) {
  if (thread) {
    thread.postSystemMessage(text);
  } else {
    channel.createMessage(text);
  }
}

/**
 * A normalized way to set props in data models, fixing some inconsistencies between different DB drivers in knex
 * @param {Object} target
 * @param {Object} props
 */
function setDataModelProps(target, props) {
  for (const prop in props) {
    if (! props.hasOwnProperty(prop)) continue;
    // DATETIME fields are always returned as Date objects in MySQL/MariaDB
    if (props[prop] instanceof Date) {
      // ...even when NULL, in which case the date's set to unix epoch
      if (props[prop].getUTCFullYear() === 1970) {
        target[prop] = null;
      } else {
        // Set the value as a string in the same format it's returned in SQLite
        target[prop] = moment.utc(props[prop]).format("YYYY-MM-DD HH:mm:ss");
      }
    } else {
      target[prop] = props[prop];
    }
  }
}

const snowflakeRegex = /^[0-9]{17,}$/;
function isSnowflake(str) {
  return str && snowflakeRegex.test(str);
}

const humanizeDelay = (delay, opts = {}) => humanizeDuration(delay, Object.assign({conjunction: " and "}, opts));

const markdownCharsRegex = /([\\_*|`~])/g;
function escapeMarkdown(str) {
  return str.replace(markdownCharsRegex, "\\$1");
}

function disableInlineCode(str) {
  return str.replace(/`/g, "'");
}

function disableCodeBlocks(str) {
  return str.replace(/`/g, "`\u200b");
}

function readMultilineConfigValue(str) {
  return Array.isArray(str) ? str.join("\n") : str;
}

function noop() {}

// https://discord.com/developers/docs/resources/channel#create-message-params
const MAX_MESSAGE_CONTENT_LENGTH = 2000;

// https://discord.com/developers/docs/resources/channel#embed-limits
const MAX_EMBED_CONTENT_LENGTH = 6000;

/**
 * Checks if the given message content is within Discord's message length limits.
 *
 * Based on testing, Discord appears to enforce length limits (at least in the client)
 * the same way JavaScript does, using the UTF-16 byte count as the number of characters.
 *
 * @param {string|Eris.MessageContent} content
 */
function messageContentIsWithinMaxLength(content) {
  if (typeof content === "string") {
    content = { content };
  }

  if (content.content && content.content.length > MAX_MESSAGE_CONTENT_LENGTH) {
    return false;
  }

  if (content.embed) {
    let embedContentLength = 0;

    if (content.embed.title) embedContentLength += content.embed.title.length;
    if (content.embed.description) embedContentLength += content.embed.description.length;
    if (content.embed.footer && content.embed.footer.text) {
      embedContentLength += content.embed.footer.text.length;
    }
    if (content.embed.author && content.embed.author.name) {
      embedContentLength += content.embed.author.name.length;
    }

    if (content.embed.fields) {
      for (const field of content.embed.fields) {
        if (field.title) embedContentLength += field.name.length;
        if (field.description) embedContentLength += field.value.length;
      }
    }

    if (embedContentLength > MAX_EMBED_CONTENT_LENGTH) {
      return false;
    }
  }

  return true;
}

/**
 * Splits a string into chunks, preferring to split at a newline
 * @param {string} str
 * @param {number} [maxChunkLength=2000]
 * @returns {string[]}
 */
function chunkByLines(str, maxChunkLength = 2000) {
  if (str.length < maxChunkLength) {
    return [str];
  }

  const chunks = [];

  while (str.length) {
    if (str.length <= maxChunkLength) {
      chunks.push(str);
      break;
    }

    const slice = str.slice(0, maxChunkLength);

    const lastLineBreakIndex = slice.lastIndexOf("\n");
    if (lastLineBreakIndex === -1) {
      chunks.push(str.slice(0, maxChunkLength));
      str = str.slice(maxChunkLength);
    } else {
      chunks.push(str.slice(0, lastLineBreakIndex));
      str = str.slice(lastLineBreakIndex + 1);
    }
  }

  return chunks;
}

/**
 * Chunks a long message to multiple smaller messages, retaining leading and trailing line breaks, open code blocks, etc.
 *
 * Default maxChunkLength is 1990, a bit under the message length limit of 2000, so we have space to add code block
 * shenanigans to the start/end when needed. Take this into account when choosing a custom maxChunkLength as well.
 */
function chunkMessageLines(str, maxChunkLength = 1990) {
  const chunks = chunkByLines(str, maxChunkLength);
  let openCodeBlock = false;

  return chunks.map(_chunk => {
    // If the chunk starts with a newline, add an invisible unicode char so Discord doesn't strip it away
    if (_chunk[0] === "\n") _chunk = "\u200b" + _chunk;
    // If the chunk ends with a newline, add an invisible unicode char so Discord doesn't strip it away
    if (_chunk[_chunk.length - 1] === "\n") _chunk = _chunk + "\u200b";
    // If the previous chunk had an open code block, open it here again
    if (openCodeBlock) {
      openCodeBlock = false;
      if (_chunk.startsWith("```")) {
        // Edge case: chunk starts with a code block delimiter, e.g. the previous chunk and this one were split right before the end of a code block
        // Fix: just strip the code block delimiter away from here, we don't need it anymore
        _chunk = _chunk.slice(3);
      } else {
        _chunk = "```" + _chunk;
      }
    }
    // If the chunk has an open code block, close it and open it again in the next chunk
    const codeBlockDelimiters = _chunk.match(/```/g);
    if (codeBlockDelimiters && codeBlockDelimiters.length % 2 !== 0) {
      _chunk += "```";
      openCodeBlock = true;
    }

    return _chunk;
  });
}

module.exports = {
  getInboxGuild,
  getMainGuilds,
  getLogChannel,
  postError,
  postLog,

  isStaff,
  messageIsOnInboxServer,
  messageIsOnMainServer,

  formatAttachment,

  getUserMention,
  getTimestamp,
  disableLinkPreviews,
  getSelfUrl,
  getMainRole,
  delayStringRegex,
  convertDelayStringToMS,

  getValidMentionRoles,
  mentionRolesToMention,
  getInboxMention,
  mentionRolesToAllowedMentions,
  getInboxMentionAllowedMentions,

  postSystemMessageWithFallback,

  chunk,
  trimAll,

  setDataModelProps,

  isSnowflake,

  humanizeDelay,

  escapeMarkdown,
  disableInlineCode,
  disableCodeBlocks,

  readMultilineConfigValue,

  messageContentIsWithinMaxLength,
  chunkMessageLines,

  noop,
};
