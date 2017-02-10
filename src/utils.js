const moment = require('moment');
const publicIp = require('public-ip');
const config = require('../config');
const utils = require('./utils');

function getModmailGuild(bot) {
  return bot.guilds.find(g => g.id === config.mailGuildId);
}

function formatAttachment(attachment) {
  let filesize = attachment.size || 0;
  filesize /= 1024;

  return utils.getAttachmentUrl(attachment.id, attachment.filename).then(attachmentUrl => {
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

const userMentionRegex = /^<@\!?([0-9]+?)>$/;

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

function getTimestamp(date) {
  return moment.utc(date).format('HH:mm');
}

function disableLinkPreviews(str) {
  return str.replace(/(^|[^<])(https?:\/\/\S+)/ig, '$1<$2>');
}

function getSelfUrl(path) {
  if (config.url) {
    return Promise.resolve(`${config.url}/${path}`);
  } else {
    return publicIp.v4().then(ip => {
      return `http://${ip}:${logServerPort}/${path}`;
    });
  }
}

module.exports = {
  getModmailGuild,
  formatAttachment,
  formatUserDM,
  getUserMention,
  getTimestamp,
  disableLinkPreviews,
  getSelfUrl,
};
