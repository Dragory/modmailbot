const Eris = require('eris');
const moment = require('moment');
const publicIp = require('public-ip');
const config = require('../config');
const utils = require('./utils');

let modMailGuild = null;
function getModmailGuild(bot) {
  if (! modMailGuild) modMailGuild = bot.guilds.find(g => g.id === config.mailGuildId);
  return modMailGuild;
}

const userMentionRegex = /^<@\!?([0-9]+?)>$/;

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

module.exports = {
  getModmailGuild,
  getUserMention,
  getTimestamp,
  disableLinkPreviews,
  getSelfUrl,
  getMainRole,
};
