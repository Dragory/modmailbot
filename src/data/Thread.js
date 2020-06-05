const moment = require('moment');

const bot = require('../bot');
const knex = require('../knex');
const utils = require('../utils');
const config = require('../config');
const attachments = require('./attachments');

const ThreadMessage = require('./ThreadMessage');

const {THREAD_MESSAGE_TYPE, THREAD_STATUS} = require('./constants');

/**
 * @property {String} id
 * @property {Number} status
 * @property {String} user_id
 * @property {String} user_name
 * @property {String} channel_id
 * @property {String} scheduled_close_at
 * @property {String} scheduled_close_id
 * @property {String} scheduled_close_name
 * @property {Number} scheduled_close_silent
 * @property {String} alert_id
 * @property {String} created_at
 */
class Thread {
  constructor(props) {
    utils.setDataModelProps(this, props);
  }

  /**
   * @param {Eris.Member} moderator
   * @param {string} text
   * @param {boolean} isAnonymous
   * @returns {string}
   * @private
   */
  _formatStaffReplyDM(moderator, text, isAnonymous) {
    const mainRole = utils.getMainRole(moderator);
    const modName = (config.useNicknames ? moderator.nick || moderator.user.username : moderator.user.username);
    const modInfo = isAnonymous
      ? (mainRole ? mainRole.name : 'Moderator')
      : (mainRole ? `(${mainRole.name}) ${modName}` : modName);

    return `**${modInfo}:** ${text}`;
  }

  /**
   * @param {Eris.Member} moderator
   * @param {string} text
   * @param {boolean} isAnonymous
   * @param {number} messageNumber
   * @param {number} timestamp
   * @returns {string}
   * @private
   */
  _formatStaffReplyThreadMessage(moderator, text, isAnonymous, messageNumber, timestamp) {
    const mainRole = utils.getMainRole(moderator);
    const modName = (config.useNicknames ? moderator.nick || moderator.user.username : moderator.user.username);
    const modInfo = isAnonymous
      ? `(Anonymous) (${modName}) ${mainRole ? mainRole.name : 'Moderator'}`
      : (mainRole ? `(${mainRole.name}) ${modName}` : modName);

    // TODO: Add \`[${messageNumber}]\` here once !edit and !delete exist
    let result = `**${modInfo}:** ${text}`;

    if (config.threadTimestamps) {
      const formattedTimestamp = timestamp ? utils.getTimestamp(timestamp, 'x') : utils.getTimestamp();
      result = `[${formattedTimestamp}] ${result}`;
    }

    return result;
  }

  /**
   * @param {Eris.Member} moderator
   * @param {string} text
   * @param {boolean} isAnonymous
   * @param {string[]} attachmentLinks
   * @returns {string}
   * @private
   */
  _formatStaffReplyLogMessage(moderator, text, isAnonymous, attachmentLinks = []) {
    const mainRole = utils.getMainRole(moderator);
    const modName = moderator.user.username;

    // Mirroring the DM formatting here...
    const modInfo = isAnonymous
      ? (mainRole ? mainRole.name : 'Moderator')
      : (mainRole ? `(${mainRole.name}) ${modName}` : modName);

    let result = `**${modInfo}:** ${text}`;

    if (attachmentLinks.length) {
      result += '\n';
      for (const link of attachmentLinks) {
        result += `\n**Attachment:** ${link}`;
      }
    }

    return result;
  }

  /**
   * @param {Eris.User} user
   * @param {string} body
   * @param {Eris.EmbedBase[]} embeds
   * @param {string[]} formattedAttachments
   * @param {number} timestamp
   * @return string
   * @private
   */
  _formatUserReplyThreadMessage(user, body, embeds, formattedAttachments = [], timestamp) {
    const content = (body.trim() === '' && embeds.length)
      ? '<message contains embeds>'
      : body;

    let result = `**${user.username}#${user.discriminator}:** ${content}`;

    if (formattedAttachments.length) {
      for (const formatted of formattedAttachments) {
        result += `\n\n${formatted}`;
      }
    }

    if (config.threadTimestamps) {
      const formattedTimestamp = timestamp ? utils.getTimestamp(timestamp, 'x') : utils.getTimestamp();
      result = `[${formattedTimestamp}] ${result}`;
    }

    return result;
  }

  /**
   * @param {Eris.User} user
   * @param {string} body
   * @param {Eris.EmbedBase[]} embeds
   * @param {string[]} formattedAttachments
   * @return string
   * @private
   */
  _formatUserReplyLogMessage(user, body, embeds, formattedAttachments = []) {
    const content = (body.trim() === '' && embeds.length)
      ? '<message contains embeds>'
      : body;

    let result = content;

    if (formattedAttachments.length) {
      for (const formatted of formattedAttachments) {
        result += `\n\n${formatted}`;
      }
    }

    return result;
  }

  /**
   * @param {string} text
   * @param {Eris.MessageFile|Eris.MessageFile[]} file
   * @returns {Promise<Eris.Message>}
   * @throws Error
   * @private
   */
  async _sendDMToUser(text, file = null) {
    // Try to open a DM channel with the user
    const dmChannel = await this.getDMChannel();
    if (! dmChannel) {
      throw new Error('Could not open DMs with the user. They may have blocked the bot or set their privacy settings higher.');
    }

    // Send the DM
    const chunks = utils.chunk(text, 2000);
    const messages = await Promise.all(chunks.map((chunk, i) => {
      return dmChannel.createMessage(
        chunk,
        (i === chunks.length - 1 ? file : undefined)  // Only send the file with the last message
      );
    }));
    return messages[0];
  }

  /**
   * @returns {Promise<Eris.Message>}
   * @private
   */
  async _postToThreadChannel(...args) {
    try {
      if (typeof args[0] === 'string') {
        const chunks = utils.chunk(args[0], 2000);
        const messages = await Promise.all(chunks.map((chunk, i) => {
          const rest = (i === chunks.length - 1 ? args.slice(1) : []); // Only send the rest of the args (files, embeds) with the last message
          return bot.createMessage(this.channel_id, chunk, ...rest);
        }));
        return messages[0];
      } else {
        return bot.createMessage(this.channel_id, ...args);
      }
    } catch (e) {
      // Channel not found
      if (e.code === 10003) {
        console.log(`[INFO] Failed to send message to thread channel for ${this.user_name} because the channel no longer exists. Auto-closing the thread.`);
        this.close(true);
      } else {
        throw e;
      }
    }
  }

  /**
   * @param {Object} data
   * @returns {Promise<ThreadMessage>}
   * @private
   */
  async _addThreadMessageToDB(data) {
    if (data.message_type === THREAD_MESSAGE_TYPE.TO_USER) {
      data.message_number = knex.raw(`IFNULL((${this._lastMessageNumberInThreadSQL()}), 0) + 1`);
    }

    const dmChannel = await this.getDMChannel();
    const insertedIds = await knex('thread_messages').insert({
      thread_id: this.id,
      created_at: moment.utc().format('YYYY-MM-DD HH:mm:ss'),
      is_anonymous: 0,
      dm_channel_id: dmChannel.id,
      ...data
    });

    const threadMessage = await knex('thread_messages')
      .where('id', insertedIds[0])
      .select();

    return new ThreadMessage(threadMessage[0]);
  }

  /**
   * @param {string} id
   * @param {Object} data
   * @returns {Promise<void>}
   * @private
   */
  async _updateThreadMessage(id, data) {
    await knex('thread_messages')
      .where('id', id)
      .update(data);
  }

  /**
   * @returns {string}
   * @private
   */
  _lastMessageNumberInThreadSQL() {
    return knex('thread_messages AS tm_msg_num_ref')
      .select(knex.raw('MAX(tm_msg_num_ref.message_number)'))
      .whereRaw(`tm_msg_num_ref.thread_id = '${this.id}'`)
      .toSQL()
      .sql;
  }

  /**
   * @param {Eris.Member} moderator
   * @param {string} text
   * @param {Eris.MessageFile[]} replyAttachments
   * @param {boolean} isAnonymous
   * @returns {Promise<boolean>} Whether we were able to send the reply
   */
  async replyToUser(moderator, text, replyAttachments = [], isAnonymous = false) {
    const fullModeratorName = `${moderator.user.username}#${moderator.user.discriminator}`;

    // Prepare attachments, if any
    const files = [];
    const attachmentLinks = [];

    if (replyAttachments.length > 0) {
      for (const attachment of replyAttachments) {
        await Promise.all([
          attachments.attachmentToDiscordFileObject(attachment).then(file => {
            files.push(file);
          }),
          attachments.saveAttachment(attachment).then(result => {
            attachmentLinks.push(result.url);
          })
        ]);
      }
    }

    // Send the reply DM
    const dmContent = this._formatStaffReplyDM(moderator, text, isAnonymous);
    let dmMessage;
    try {
      dmMessage = await this._sendDMToUser(dmContent, files);
    } catch (e) {
      await this.postSystemMessage(`Error while replying to user: ${e.message}`);
      return false;
    }

    // Save the log entry
    const logContent = this._formatStaffReplyLogMessage(moderator, text, isAnonymous, attachmentLinks);
    const threadMessage = await this._addThreadMessageToDB({
      message_type: THREAD_MESSAGE_TYPE.TO_USER,
      user_id: moderator.id,
      user_name: fullModeratorName,
      body: logContent,
      is_anonymous: (isAnonymous ? 1 : 0),
      dm_message_id: dmMessage.id
    });

    // Show the reply in the inbox thread
    const inboxContent = this._formatStaffReplyThreadMessage(moderator, text, isAnonymous, threadMessage.message_number, null);
    const inboxMessage = await this._postToThreadChannel(inboxContent, files);
    await this._updateThreadMessage(threadMessage.id, { inbox_message_id: inboxMessage.id });

    // Interrupt scheduled closing, if in progress
    if (this.scheduled_close_at) {
      await this.cancelScheduledClose();
      await this.postSystemMessage(`Cancelling scheduled closing of this thread due to new reply`);
    }

    return true;
  }

  /**
   * @param {Eris.Message} msg
   * @returns {Promise<void>}
   */
  async receiveUserReply(msg) {
    // Prepare attachments
    const attachmentFiles = [];
    const threadFormattedAttachments = [];
    const logFormattedAttachments = [];

    // TODO: Save attachment info with the message, use that to re-create attachment formatting in
    // TODO: this._formatUserReplyLogMessage and this._formatUserReplyThreadMessage
    for (const attachment of msg.attachments) {
      const savedAttachment = await attachments.saveAttachment(attachment);

      const formatted = await utils.formatAttachment(attachment, savedAttachment.url);
      logFormattedAttachments.push(formatted);

      // Forward small attachments (<2MB) as attachments, link to larger ones
      if (config.relaySmallAttachmentsAsAttachments && attachment.size <= config.smallAttachmentLimit) {
        const file = await attachments.attachmentToDiscordFileObject(attachment);
        attachmentFiles.push(file);
      } else {
        threadFormattedAttachments.push(formatted);
      }
    }

    // Save log entry
    const logContent = this._formatUserReplyLogMessage(msg.author, msg.content, msg.embeds, logFormattedAttachments);
    const threadMessage = await this._addThreadMessageToDB({
      message_type: THREAD_MESSAGE_TYPE.FROM_USER,
      user_id: this.user_id,
      user_name: `${msg.author.username}#${msg.author.discriminator}`,
      body: logContent,
      is_anonymous: 0,
      dm_message_id: msg.id
    });

    // Show user reply in the inbox thread
    const inboxContent = this._formatUserReplyThreadMessage(msg.author, msg.content, msg.embeds, threadFormattedAttachments, null);
    const inboxMessage = await this._postToThreadChannel(inboxContent, attachmentFiles);
    if (inboxMessage) await this._updateThreadMessage(threadMessage.id, { inbox_message_id: inboxMessage.id });

    // Interrupt scheduled closing, if in progress
    if (this.scheduled_close_at) {
      await this.cancelScheduledClose();
      await this.postSystemMessage(`<@!${this.scheduled_close_id}> Thread that was scheduled to be closed got a new reply. Cancelling.`);
    }

    if (this.alert_id) {
      await this.setAlert(null);
      await this.postSystemMessage(`<@!${this.alert_id}> New message from ${this.user_name}`);
    }
  }

  /**
   * @returns {Promise<PrivateChannel>}
   */
  getDMChannel() {
    return bot.getDMChannel(this.user_id);
  }

  /**
   * @param {string|Eris.MessageContent} content
   * @param {*} args
   * @returns {Promise<void>}
   */
  async postSystemMessage(content, ...args) {
    const msg = await this._postToThreadChannel(content, ...args);
    await this._addThreadMessageToDB({
      message_type: THREAD_MESSAGE_TYPE.SYSTEM,
      user_id: null,
      user_name: '',
      body: typeof content === 'string' ? content : content.content,
      is_anonymous: 0,
      dm_message_id: msg.id
    });
  }

  /**
   * @param {string|Eris.MessageContent} content
   * @param {*} args
   * @returns {Promise<void>}
   */
  async sendSystemMessageToUser(content, ...args) {
    const msg = await this._sendDMToUser(content, ...args);
    await this._addThreadMessageToDB({
      message_type: THREAD_MESSAGE_TYPE.SYSTEM_TO_USER,
      user_id: null,
      user_name: '',
      body: typeof content === 'string' ? content : content.content,
      is_anonymous: 0,
      dm_message_id: msg.id
    });
  }

  /**
   * @param {*} args
   * @returns {Promise<void>}
   */
  async postNonLogMessage(...args) {
    await this._postToThreadChannel(...args);
  }

  /**
   * @param {Eris.Message} msg
   * @returns {Promise<void>}
   */
  async saveChatMessageToLogs(msg) {
    return this._addThreadMessageToDB({
      message_type: THREAD_MESSAGE_TYPE.CHAT,
      user_id: msg.author.id,
      user_name: `${msg.author.username}#${msg.author.discriminator}`,
      body: msg.content,
      is_anonymous: 0,
      dm_message_id: msg.id
    });
  }

  async saveCommandMessageToLogs(msg) {
    return this._addThreadMessageToDB({
      message_type: THREAD_MESSAGE_TYPE.COMMAND,
      user_id: msg.author.id,
      user_name: `${msg.author.username}#${msg.author.discriminator}`,
      body: msg.content,
      is_anonymous: 0,
      dm_message_id: msg.id
    });
  }

  /**
   * @param {Eris.Message} msg
   * @returns {Promise<void>}
   */
  async updateChatMessageInLogs(msg) {
    await knex('thread_messages')
      .where('thread_id', this.id)
      .where('dm_message_id', msg.id)
      .update({
        body: msg.content
      });
  }

  /**
   * @param {String} messageId
   * @returns {Promise<void>}
   */
  async deleteChatMessageFromLogs(messageId) {
    await knex('thread_messages')
      .where('thread_id', this.id)
      .where('dm_message_id', messageId)
      .delete();
  }

  /**
   * @returns {Promise<ThreadMessage[]>}
   */
  async getThreadMessages() {
    const threadMessages = await knex('thread_messages')
      .where('thread_id', this.id)
      .orderBy('created_at', 'ASC')
      .orderBy('id', 'ASC')
      .select();

    return threadMessages.map(row => new ThreadMessage(row));
  }

  /**
   * @param {number} messageNumber
   * @returns {Promise<ThreadMessage>}
   */
  async findThreadMessageByMessageNumber(messageNumber) {
    const data = await knex('thread_messages')
      .where('thread_id', this.id)
      .where('message_number', messageNumber)
      .select();

    return data ? new ThreadMessage(data) : null;
  }

  /**
   * @returns {Promise<void>}
   */
  async close(suppressSystemMessage = false, silent = false) {
    if (! suppressSystemMessage) {
      console.log(`Closing thread ${this.id}`);

      if (silent) {
        await this.postSystemMessage('Closing thread silently...');
      } else {
        await this.postSystemMessage('Closing thread...');
      }
    }

    // Update DB status
    await knex('threads')
      .where('id', this.id)
      .update({
        status: THREAD_STATUS.CLOSED
      });

    // Delete channel
    const channel = bot.getChannel(this.channel_id);
    if (channel) {
      console.log(`Deleting channel ${this.channel_id}`);
      await channel.delete('Thread closed');
    }
  }

  /**
   * @param {String} time
   * @param {Eris~User} user
   * @param {Number} silent
   * @returns {Promise<void>}
   */
  async scheduleClose(time, user, silent) {
    await knex('threads')
      .where('id', this.id)
      .update({
        scheduled_close_at: time,
        scheduled_close_id: user.id,
        scheduled_close_name: user.username,
        scheduled_close_silent: silent
      });
  }

  /**
   * @returns {Promise<void>}
   */
  async cancelScheduledClose() {
    await knex('threads')
      .where('id', this.id)
      .update({
        scheduled_close_at: null,
        scheduled_close_id: null,
        scheduled_close_name: null,
        scheduled_close_silent: null
      });
  }

  /**
   * @returns {Promise<void>}
   */
  async suspend() {
    await knex('threads')
      .where('id', this.id)
      .update({
        status: THREAD_STATUS.SUSPENDED,
        scheduled_suspend_at: null,
        scheduled_suspend_id: null,
        scheduled_suspend_name: null
      });
  }

  /**
   * @returns {Promise<void>}
   */
  async unsuspend() {
    await knex('threads')
      .where('id', this.id)
      .update({
        status: THREAD_STATUS.OPEN
      });
  }

  /**
   * @param {String} time
   * @param {Eris~User} user
   * @returns {Promise<void>}
   */
  async scheduleSuspend(time, user) {
    await knex('threads')
      .where('id', this.id)
      .update({
        scheduled_suspend_at: time,
        scheduled_suspend_id: user.id,
        scheduled_suspend_name: user.username
      });
  }

  /**
   * @returns {Promise<void>}
   */
  async cancelScheduledSuspend() {
    await knex('threads')
      .where('id', this.id)
      .update({
        scheduled_suspend_at: null,
        scheduled_suspend_id: null,
        scheduled_suspend_name: null
      });
  }

  /**
   * @param {String} userId
   * @returns {Promise<void>}
   */
  async setAlert(userId) {
    await knex('threads')
      .where('id', this.id)
      .update({
        alert_id: userId
      });
  }

  /**
   * @returns {Promise<String>}
   */
  getLogUrl() {
    return utils.getSelfUrl(`logs/${this.id}`);
  }
}

module.exports = Thread;
