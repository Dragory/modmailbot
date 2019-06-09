const humanizeDuration = require('humanize-duration');
const moment = require('moment');
const threadUtils = require('../threadUtils');
const blocked = require("../data/blocked");
const utils = require("../utils");

module.exports = bot => {
  const addInboxServerCommand = (...args) => threadUtils.addInboxServerCommand(bot, ...args);

  async function removeExpiredBlocks() {
    const expiredBlocks = await blocked.getExpiredBlocks();
    const logChannel = utils.getLogChannel();
    for (const userId of expiredBlocks) {
      await blocked.unblock(userId);
      logChannel.createMessage(`Block of <@!${userId}> (id \`${userId}\`) expired`);
    }
  }

  async function expiredBlockLoop() {
    try {
      removeExpiredBlocks();
    } catch (e) {
      console.error(e);
    }

    setTimeout(expiredBlockLoop, 2000);
  }

  bot.on('ready', expiredBlockLoop);

  addInboxServerCommand('block', async (msg, args, thread) => {
    const firstArgUserId = utils.getUserMention(args[0]);
    const userIdToBlock = firstArgUserId
      ? firstArgUserId
      : thread && thread.user_id;

    if (! userIdToBlock) return;

    const isBlocked = await blocked.isBlocked(userIdToBlock);
    if (isBlocked) {
      msg.channel.createMessage('User is already blocked');
      return;
    }

    const inputExpiryTime = firstArgUserId ? args[1] : args[0];
    const expiryTime = inputExpiryTime ? utils.convertDelayStringToMS(inputExpiryTime) : null;
    const expiresAt = expiryTime
      ? moment.utc().add(expiryTime, 'ms').format('YYYY-MM-DD HH:mm:ss')
      : null;

    const user = bot.users.get(userIdToBlock);
    await blocked.block(userIdToBlock, (user ? `${user.username}#${user.discriminator}` : ''), msg.author.id, expiresAt);

    if (expiresAt) {
      const humanized = humanizeDuration(expiryTime, { largest: 2, round: true });
      msg.channel.createMessage(`Blocked <@${userIdToBlock}> (id \`${userIdToBlock}\`) from modmail for ${humanized}`);
    } else {
      msg.channel.createMessage(`Blocked <@${userIdToBlock}> (id \`${userIdToBlock}\`) from modmail indefinitely`);
    }
  });

  addInboxServerCommand('unblock', async (msg, args, thread) => {
    const firstArgUserId = utils.getUserMention(args[0]);
    const userIdToUnblock = firstArgUserId
      ? firstArgUserId
      : thread && thread.user_id;

    if (! userIdToUnblock) return;

    const isBlocked = await blocked.isBlocked(userIdToUnblock);
    if (! isBlocked) {
      msg.channel.createMessage('User is not blocked');
      return;
    }

    const inputUnblockDelay = firstArgUserId ? args[1] : args[0];
    const unblockDelay = inputUnblockDelay ? utils.convertDelayStringToMS(inputUnblockDelay) : null;
    const unblockAt = unblockDelay
      ? moment.utc().add(unblockDelay, 'ms').format('YYYY-MM-DD HH:mm:ss')
      : null;

    const user = bot.users.get(userIdToUnblock);
    if (unblockAt) {
      const humanized = humanizeDuration(unblockDelay, { largest: 2, round: true });
      await blocked.updateExpiryTime(userIdToUnblock, unblockAt);
      msg.channel.createMessage(`Scheduled <@${userIdToUnblock}> (id \`${userIdToUnblock}\`) to be unblocked in ${humanized}`);
    } else {
      await blocked.unblock(userIdToUnblock);
      msg.channel.createMessage(`Unblocked <@${userIdToUnblock}> (id ${userIdToUnblock}) from modmail`);
    }
  });

  addInboxServerCommand('is_blocked', async (msg, args, thread) => {
    const userIdToCheck = args[0]
      ? utils.getUserMention(args[0])
      : thread && thread.user_id;

    if (! userIdToCheck) return;

    const blockStatus = await blocked.getBlockStatus(userIdToCheck);
    if (blockStatus.isBlocked) {
      if (blockStatus.expiresAt) {
        msg.channel.createMessage(`<@!${userIdToCheck}> (id \`${userIdToCheck}\`) is blocked until ${blockStatus.expiresAt} (UTC)`);
      } else {
        msg.channel.createMessage(`<@!${userIdToCheck}> (id \`${userIdToCheck}\`) is blocked indefinitely`);
      }
    } else {
      msg.channel.createMessage(`<@!${userIdToCheck}> (id \`${userIdToCheck}\`) is NOT blocked`);
    }
  });
};
