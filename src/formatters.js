const Eris = require("eris");
const utils = require("./utils");
const config = require("./cfg");
const ThreadMessage = require("./data/ThreadMessage");
const {THREAD_MESSAGE_TYPE} = require("./data/constants");
const moment = require("moment");

/**
 * Function to format the DM that is sent to the user when a staff member replies to them via !reply
 * @callback FormatStaffReplyDM
 * @param {ThreadMessage} threadMessage
 * @return {Eris.MessageContent} Message content to send as a DM
 */

/**
 * Function to format a staff reply in a thread channel
 * @callback FormatStaffReplyThreadMessage
 * @param {ThreadMessage} threadMessage
 * @return {Eris.MessageContent} Message content to post in the thread channel
 */

/**
 * Function to format a user reply in a thread channel
 * @callback FormatUserReplyThreadMessage
 * @param {ThreadMessage} threadMessage
 * @return {Eris.MessageContent} Message content to post in the thread channel
 */

/**
 * Function to format the inbox channel notification for a staff reply edit
 * @callback FormatStaffReplyEditNotificationThreadMessage
 * @param {ThreadMessage} threadMessage
 * @param {string} newText
 * @param {Eris.Member} moderator Moderator that edited the message
 * @return {Eris.MessageContent} Message content to post in the thread channel
 */

/**
 * Function to format the inbox channel notification for a staff reply deletion
 * @callback FormatStaffReplyDeletionNotificationThreadMessage
 * @param {ThreadMessage} threadMessage
 * @param {Eris.Member} moderator Moderator that deleted the message
 * @return {Eris.MessageContent} Message content to post in the thread channel
 */

/**
 * @typedef {Object} FormatLogOptions
 * @property {Boolean?} simple
 * @property {Boolean?} verbose
 */

/**
 * @typedef {Object} FormatLogResult
 * @property {String} content Contents of the entire log
 * @property {*?} extra
 */

/**
 * Function to format the inbox channel notification for a staff reply deletion
 * @callback FormatLog
 * @param {Thread} thread
 * @param {ThreadMessage[]} threadMessages
 * @param {FormatLogOptions={}} opts
 * @return {FormatLogResult}
 */

/**
 * @typedef MessageFormatters
 * @property {FormatStaffReplyDM} formatStaffReplyDM
 * @property {FormatStaffReplyThreadMessage} formatStaffReplyThreadMessage
 * @property {FormatUserReplyThreadMessage} formatUserReplyThreadMessage
 * @property {FormatStaffReplyEditNotificationThreadMessage} formatStaffReplyEditNotificationThreadMessage
 * @property {FormatStaffReplyDeletionNotificationThreadMessage} formatStaffReplyDeletionNotificationThreadMessage
 * @property {FormatLog} formatLog
 */

/**
 * @type {MessageFormatters}
 */
const defaultFormatters = {
  formatStaffReplyDM(threadMessage) {
    const modInfo = threadMessage.is_anonymous
      ? (threadMessage.role_name ? threadMessage.role_name : "Moderator")
      : (threadMessage.role_name ? `(${threadMessage.role_name}) ${threadMessage.user_name}` : threadMessage.user_name);

    return `**${modInfo}:** ${threadMessage.body}`;
  },

  formatStaffReplyThreadMessage(threadMessage) {
    const modInfo = threadMessage.is_anonymous
      ? `(Anonymous) (${threadMessage.user_name}) ${threadMessage.role_name || "Moderator"}`
      : (threadMessage.role_name ? `(${threadMessage.role_name}) ${threadMessage.user_name}` : threadMessage.user_name);

    let result = `**${modInfo}:** ${threadMessage.body}`;

    if (config.threadTimestamps) {
      const formattedTimestamp = utils.getTimestamp(threadMessage.created_at);
      result = `[${formattedTimestamp}] ${result}`;
    }

    result = `\`${threadMessage.message_number}\`  ${result}`;

    return result;
  },

  formatUserReplyThreadMessage(threadMessage) {
    let result = `**${threadMessage.user_name}:** ${threadMessage.body}`;

    for (const link of threadMessage.attachments) {
      result += `\n\n${link}`;
    }

    if (config.threadTimestamps) {
      const formattedTimestamp = utils.getTimestamp(threadMessage.created_at);
      result = `[${formattedTimestamp}] ${result}`;
    }

    return result;
  },

  formatStaffReplyEditNotificationThreadMessage(threadMessage, newText, moderator) {
    let content = `**${moderator.user.username}#${moderator.user.discriminator}** (\`${moderator.id}\`) edited reply \`[${threadMessage.message_number}]\`:`;
    content += `\n\nBefore:\n\`\`\`${utils.disableCodeBlocks(threadMessage.body)}\`\`\``;
    content += `\nAfter:\n\`\`\`${utils.disableCodeBlocks(newText)}\`\`\``;
    return content;
  },

  formatStaffReplyDeletionNotificationThreadMessage(threadMessage, moderator) {
    let content = `**${moderator.user.username}#${moderator.user.discriminator}** (\`${moderator.id}\`) deleted reply \`[${threadMessage.message_number}]\`:`;
    content += "```" + utils.disableCodeBlocks(threadMessage.body) + "```";
    return content;
  },

  formatLog(thread, threadMessages, opts = {}) {
    if (opts.simple) {
      threadMessages = threadMessages.filter(message => {
        return (
          message.message_type !== THREAD_MESSAGE_TYPE.SYSTEM
          && message.message_type !== THREAD_MESSAGE_TYPE.SYSTEM_TO_USER
          && message.message_type !== THREAD_MESSAGE_TYPE.CHAT
          && message.message_type !== THREAD_MESSAGE_TYPE.COMMAND
        );
      });
    }

    const lines = threadMessages.map(message => {
      // Legacy messages (from 2018) are the entire log in one message, so just serve them as they are
      if (message.message_type === THREAD_MESSAGE_TYPE.LEGACY) {
        return message.body;
      }

      let line = `[${moment.utc(message.created_at).format("YYYY-MM-DD HH:mm:ss")}]`;

      if (opts.verbose) {
        if (message.dm_channel_id) {
          line += ` [DM CHA ${message.dm_channel_id}]`;
        }

        if (message.dm_message_id) {
          line += ` [DM MSG ${message.dm_message_id}]`;
        }
      }

      if (message.message_type === THREAD_MESSAGE_TYPE.FROM_USER) {
        line += ` [FROM USER] [${message.user_name}] ${message.body}`;
      } else if (message.message_type === THREAD_MESSAGE_TYPE.TO_USER) {
        if (opts.verbose) {
          line += ` [TO USER] [${message.message_number || "0"}] [${message.user_name}]`;
        } else {
          line += ` [TO USER] [${message.user_name}]`;
        }

        if (message.use_legacy_format) {
          // Legacy format (from pre-2.31.0) includes the role and username in the message body, so serve that as is
          line += ` ${message.body}`;
        } else if (message.is_anonymous) {
          if (message.role_name) {
            line += ` (Anonymous) ${message.role_name}: ${message.body}`;
          } else {
            line += ` (Anonymous) Moderator: ${message.body}`;
          }
        } else {
          if (message.role_name) {
            line += ` (${message.role_name}) ${message.user_name}: ${message.body}`;
          } else {
            line += ` ${message.user_name}: ${message.body}`;
          }
        }
      } else if (message.message_type === THREAD_MESSAGE_TYPE.SYSTEM) {
        line += ` [SYSTEM] ${message.body}`;
      } else if (message.message_type === THREAD_MESSAGE_TYPE.SYSTEM_TO_USER) {
        line += ` [SYSTEM TO USER] ${message.body}`;
      } else if (message.message_type === THREAD_MESSAGE_TYPE.CHAT) {
        line += ` [CHAT] [${message.user_name}] ${message.body}`;
      } else if (message.message_type === THREAD_MESSAGE_TYPE.COMMAND) {
        line += ` [COMMAND] [${message.user_name}] ${message.body}`;
      } else {
        line += ` [${message.user_name}] ${message.body}`;
      }

      return line;
    });

    const openedAt = moment(thread.created_at).format("YYYY-MM-DD HH:mm:ss");
    const header = `# Modmail thread with ${thread.user_name} (${thread.user_id}) started at ${openedAt}. All times are in UTC+0.`;

    const fullResult = header + "\n\n" + lines.join("\n");

    return {
      content: fullResult,
    };
  },
};

/**
 * @type {MessageFormatters}
 */
const formatters = { ...defaultFormatters };

/**
 * @typedef {object} FormattersExport
 * @property {MessageFormatters} formatters Read only
 * @property {function(FormatStaffReplyDM): void} setStaffReplyDMFormatter
 * @property {function(FormatStaffReplyThreadMessage): void} setStaffReplyThreadMessageFormatter
 * @property {function(FormatUserReplyThreadMessage): void} setUserReplyThreadMessageFormatter
 * @property {function(FormatStaffReplyEditNotificationThreadMessage): void} setStaffReplyEditNotificationThreadMessageFormatter
 * @property {function(FormatStaffReplyDeletionNotificationThreadMessage): void} setStaffReplyDeletionNotificationThreadMessageFormatter
 * @property {function(FormatLog): void} setLogFormatter
 */

/**
 * @type {FormattersExport}
 */
module.exports = {
  formatters: new Proxy(formatters, {
    set() {
      throw new Error("Please use the formatter setter functions instead of modifying the formatters directly");
    },
  }),

  setStaffReplyDMFormatter(fn) {
    formatters.formatStaffReplyDM = fn;
  },

  setStaffReplyThreadMessageFormatter(fn) {
    formatters.formatStaffReplyThreadMessage = fn;
  },

  setUserReplyThreadMessageFormatter(fn) {
    formatters.formatUserReplyThreadMessage = fn;
  },

  setStaffReplyEditNotificationThreadMessageFormatter(fn) {
    formatters.formatStaffReplyEditNotificationThreadMessage = fn;
  },

  setStaffReplyDeletionNotificationThreadMessageFormatter(fn) {
    formatters.formatStaffReplyDeletionNotificationThreadMessage = fn;
  },

  setLogFormatter(fn) {
    formatters.formatLog = fn;
  },
};
