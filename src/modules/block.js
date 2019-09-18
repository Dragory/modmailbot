const humanizeDuration = require('humanize-duration');
const moment = require('moment');
const blocked = require("../data/blocked");
const utils = require("../utils");

module.exports = ({ bot, knex, config, commands }) => {
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

  const blockCmd = async (msg, args, thread) => {
    const userIdToBlock = args.userId || (thread && thread.user_id);
    if (! userIdToBlock) return;

    const isBlocked = await blocked.isBlocked(userIdToBlock);
    if (isBlocked) {
      msg.channel.createMessage('User is already blocked');
      return;
    }

    const expiresAt = args.blockTime
      ? moment.utc().add(args.blockTime, 'ms').format('YYYY-MM-DD HH:mm:ss')
      : null;

    const user = bot.users.get(userIdToBlock);
    await blocked.block(userIdToBlock, (user ? `${user.username}#${user.discriminator}` : ''), msg.author.id, expiresAt);

    if (expiresAt) {
      const humanized = humanizeDuration(args.blockTime, { largest: 2, round: true });
      msg.channel.createMessage(`Blocked <@${userIdToBlock}> (id \`${userIdToBlock}\`) from modmail for ${humanized}`);
    } else {
      msg.channel.createMessage(`Blocked <@${userIdToBlock}> (id \`${userIdToBlock}\`) from modmail indefinitely`);
    }
  };

  commands.addInboxServerCommand('block', '<userId:userId> [blockTime:delay]', blockCmd);
  commands.addInboxServerCommand('block', '[blockTime:delay]', blockCmd);

  const unblockCmd = async (msg, args, thread) => {
    const userIdToUnblock = args.userId || (thread && thread.user_id);
    if (! userIdToUnblock) return;

    const isBlocked = await blocked.isBlocked(userIdToUnblock);
    if (! isBlocked) {
      msg.channel.createMessage('User is not blocked');
      return;
    }

    const unblockAt = args.unblockDelay
      ? moment.utc().add(args.unblockDelay, 'ms').format('YYYY-MM-DD HH:mm:ss')
      : null;

    const user = bot.users.get(userIdToUnblock);
    if (unblockAt) {
      const humanized = humanizeDuration(args.unblockDelay, { largest: 2, round: true });
      await blocked.updateExpiryTime(userIdToUnblock, unblockAt);
      msg.channel.createMessage(`Scheduled <@${userIdToUnblock}> (id \`${userIdToUnblock}\`) to be unblocked in ${humanized}`);
    } else {
      await blocked.unblock(userIdToUnblock);
      msg.channel.createMessage(`Unblocked <@${userIdToUnblock}> (id ${userIdToUnblock}) from modmail`);
    }
  };

  commands.addInboxServerCommand('unblock', '<userId:userId> [unblockDelay:delay]', unblockCmd);
  commands.addInboxServerCommand('unblock', '[unblockDelay:delay]', unblockCmd);

  commands.addInboxServerCommand('is_blocked',  '[userId:userId]',async (msg, args, thread) => {
    const userIdToCheck = args.userId || (thread && thread.user_id);
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
