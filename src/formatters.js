const Eris = require('eris');
const utils = require('./utils');
const config = require('./cfg');
const ThreadMessage = require('./data/ThreadMessage');

/**
 * Function to format the DM that is sent to the user when a staff member replies to them via !reply
 * @callback FormatStaffReplyDM
 * @param {Eris.Member} moderator Staff member that is replying
 * @param {string} text Reply text
 * @param {{
 *   isAnonymous: boolean,
 * }} opts={}
 * @return {Eris.MessageContent} Message content to send as a DM
 */

/**
 * Function to format a staff reply in a thread channel
 * @callback FormatStaffReplyThreadMessage
 * @param {Eris.Member} moderator
 * @param {string} text
 * @param {number} messageNumber
 * @param {{
 *   isAnonymous: boolean,
 * }} opts={}
 * @return {Eris.MessageContent} Message content to post in the thread channel
 */

/**
 * Function to format a staff reply in a log
 * @callback FormatStaffReplyLogMessage
 * @param {Eris.Member} moderator
 * @param {string} text
 * @param {{
 *   isAnonymous: boolean,
 *   attachmentLinks: string[],
 * }} opts={}
 * @returns {string} Text to show in the log
 */

/**
 * Function to format a user reply in a thread channel
 * @callback FormatUserReplyThreadMessage
 * @param {Eris.User} user Use that sent the reply
 * @param {Eris.Message} msg The message object that the user sent
 * @param {{
 *   attachmentLinks: string[],
 * }} opts
 * @return {Eris.MessageContent} Message content to post in the thread channel
 */

/**
 * Function to format a user reply in a log
 * @callback FormatUserReplyLogMessage
 * @param {Eris.User} user
 * @param {Eris.Message} msg
 * @param {{
 *   attachmentLinks: string[],
 * }} opts={}
 * @return {string} Text to show in the log
 */

/**
 * Function to format the inbox channel notification for a staff reply edit
 * @callback FormatStaffReplyEditNotificationThreadMessage
 * @param {Eris.Member} moderator
 * @param {ThreadMessage} threadMessage
 * @param {string} newText
 * @return {Eris.MessageContent} Message content to post in the thread channel
 */

/**
 * Function to format the log notification for a staff reply edit
 * @callback FormatStaffReplyEditNotificationLogMessage
 * @param {Eris.Member} moderator
 * @param {ThreadMessage} threadMessage
 * @param {string} newText
 * @return {string} Text to show in the log
 */

/**
 * Function to format the inbox channel notification for a staff reply deletion
 * @callback FormatStaffReplyDeletionNotificationThreadMessage
 * @param {Eris.Member} moderator
 * @param {ThreadMessage} threadMessage
 * @return {Eris.MessageContent} Message content to post in the thread channel
 */

/**
 * Function to format the log notification for a staff reply deletion
 * @callback FormatStaffReplyDeletionNotificationLogMessage
 * @param {Eris.Member} moderator
 * @param {ThreadMessage} threadMessage
 * @return {string} Text to show in the log
 */

/**
 * @typedef MessageFormatters
 * @property {FormatStaffReplyDM} formatStaffReplyDM
 * @property {FormatStaffReplyThreadMessage} formatStaffReplyThreadMessage
 * @property {FormatStaffReplyLogMessage} formatStaffReplyLogMessage
 * @property {FormatUserReplyThreadMessage} formatUserReplyThreadMessage
 * @property {FormatUserReplyLogMessage} formatUserReplyLogMessage
 * @property {FormatStaffReplyEditNotificationThreadMessage} formatStaffReplyEditNotificationThreadMessage
 * @property {FormatStaffReplyEditNotificationLogMessage} formatStaffReplyEditNotificationLogMessage
 * @property {FormatStaffReplyDeletionNotificationThreadMessage} formatStaffReplyDeletionNotificationThreadMessage
 * @property {FormatStaffReplyDeletionNotificationLogMessage} formatStaffReplyDeletionNotificationLogMessage
 */

/**
 * @type {MessageFormatters}
 */
const defaultFormatters = {
  formatStaffReplyDM(moderator, text, opts = {}) {
    const mainRole = utils.getMainRole(moderator);
    const modName = (config.useNicknames ? moderator.nick || moderator.user.username : moderator.user.username);
    const modInfo = opts.isAnonymous
      ? (mainRole ? mainRole.name : 'Moderator')
      : (mainRole ? `(${mainRole.name}) ${modName}` : modName);

    return `**${modInfo}:** ${text}`;
  },

  formatStaffReplyThreadMessage(moderator, text, messageNumber, opts = {}) {
    const mainRole = utils.getMainRole(moderator);
    const modName = (config.useNicknames ? moderator.nick || moderator.user.username : moderator.user.username);
    const modInfo = opts.isAnonymous
      ? `(Anonymous) (${modName}) ${mainRole ? mainRole.name : 'Moderator'}`
      : (mainRole ? `(${mainRole.name}) ${modName}` : modName);

    // TODO: Add \`[${messageNumber}]\` here once !edit and !delete exist
    let result = `**${modInfo}:** ${text}`;

    if (config.threadTimestamps) {
      const formattedTimestamp = utils.getTimestamp();
      result = `[${formattedTimestamp}] ${result}`;
    }

    return result;
  },

  formatStaffReplyLogMessage(moderator, text, opts = {}) {
    const mainRole = utils.getMainRole(moderator);
    const modName = moderator.user.username;

    // Mirroring the DM formatting here...
    const modInfo = opts.isAnonymous
      ? (mainRole ? mainRole.name : 'Moderator')
      : (mainRole ? `(${mainRole.name}) ${modName}` : modName);

    let result = `**${modInfo}:** ${text}`;

    if (opts.attachmentLinks && opts.attachmentLinks.length) {
      result += '\n';
      for (const link of opts.attachmentLinks) {
        result += `\n**Attachment:** ${link}`;
      }
    }

    return result;
  },

  formatUserReplyThreadMessage(user, msg, opts = {}) {
    const content = (msg.content.trim() === '' && msg.embeds.length)
      ? '<message contains embeds>'
      : msg.content;

    let result = `**${user.username}#${user.discriminator}:** ${content}`;

    if (opts.attachmentLinks && opts.attachmentLinks.length) {
      for (const link of opts.attachmentLinks) {
        result += `\n\n${link}`;
      }
    }

    if (config.threadTimestamps) {
      const formattedTimestamp = utils.getTimestamp(msg.timestamp, 'x');
      result = `[${formattedTimestamp}] ${result}`;
    }

    return result;
  },

  formatUserReplyLogMessage(user, msg, opts = {}) {
    const content = (msg.content.trim() === '' && msg.embeds.length)
      ? '<message contains embeds>'
      : msg.content;

    let result = content;

    if (opts.attachmentLinks && opts.attachmentLinks.length) {
      for (const link of opts.attachmentLinks) {
        result += `\n\n${link}`;
      }
    }

    return result;
  },

  formatStaffReplyEditNotificationThreadMessage(moderator, threadMessage, newText) {
    let content = `**${moderator.user.username}#${moderator.user.discriminator} (\`${moderator.id}\`) edited reply \`[${threadMessage.message_number}]\`:**`;
    content += `\n\`B:\` ${threadMessage.body}`;
    content += `\n\`A:\` ${newText}`;
    return utils.disableLinkPreviews(content);
  },

  formatStaffReplyEditNotificationLogMessage(moderator, threadMessage, newText) {
    let content = `${moderator.user.username}#${moderator.user.discriminator} (${moderator.id}) edited reply [${threadMessage.message_number}]:`;
    content += `\nB: ${threadMessage.body}`;
    content += `\nA: ${newText}`;
    return content;
  },

  formatStaffReplyDeletionNotificationThreadMessage(moderator, threadMessage) {
    let content = `**${moderator.user.username}#${moderator.user.discriminator} (\`${moderator.id}\`) deleted reply \`[${threadMessage.message_number}]\`:**`;
    content += `\n\`B:\` ${threadMessage.body}`;
    return utils.disableLinkPreviews(content);
  },

  formatStaffReplyDeletionNotificationLogMessage(moderator, threadMessage) {
    let content = `${moderator.user.username}#${moderator.user.discriminator} (${moderator.id}) deleted reply [${threadMessage.message_number}]:`;
    content += `\nB: ${threadMessage.body}`;
    return content;
  },
};

/**
 * @type {MessageFormatters}
 */
const formatters = { ...defaultFormatters };

module.exports = {
  formatters,

  /**
   * @param {FormatStaffReplyDM} fn
   * @return {void}
   */
  setStaffReplyDMFormatter(fn) {
    formatters.formatStaffReplyDM = fn;
  },

  /**
   * @param {FormatStaffReplyThreadMessage} fn
   * @return {void}
   */
  setStaffReplyThreadMessageFormatter(fn) {
    formatters.formatStaffReplyThreadMessage = fn;
  },

  /**
   * @param {FormatStaffReplyLogMessage} fn
   * @return {void}
   */
  setStaffReplyLogMessageFormatter(fn) {
    formatters.formatStaffReplyLogMessage = fn;
  },

  /**
   * @param {FormatUserReplyThreadMessage} fn
   * @return {void}
   */
  setUserReplyThreadMessageFormatter(fn) {
    formatters.formatUserReplyThreadMessage = fn;
  },

  /**
   * @param {FormatUserReplyLogMessage} fn
   * @return {void}
   */
  setUserReplyLogMessageFormatter(fn) {
    formatters.formatUserReplyLogMessage = fn;
  },

  /**
   * @param {FormatStaffReplyEditNotificationThreadMessage} fn
   * @return {void}
   */
  setStaffReplyEditNotificationThreadMessageFormatter(fn) {
    formatters.formatStaffReplyEditNotificationThreadMessage = fn;
  },

  /**
   * @param {FormatStaffReplyEditNotificationLogMessage} fn
   * @return {void}
   */
  setStaffReplyEditNotificationLogMessageFormatter(fn) {
    formatters.formatStaffReplyEditNotificationLogMessage = fn;
  },

  /**
   * @param {FormatStaffReplyDeletionNotificationThreadMessage} fn
   * @return {void}
   */
  setStaffReplyDeletionNotificationThreadMessageFormatter(fn) {
    formatters.formatStaffReplyDeletionNotificationThreadMessage = fn;
  },

  /**
   * @param {FormatStaffReplyDeletionNotificationLogMessage} fn
   * @return {void}
   */
  setStaffReplyDeletionNotificationLogMessageFormatter(fn) {
    formatters.formatStaffReplyDeletionNotificationLogMessage = fn;
  },
};
