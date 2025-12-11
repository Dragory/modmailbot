const humanizeDuration = require("humanize-duration");
const moment = require("moment");
const blocked = require("../data/blocked");
const utils = require("../utils");
const embedPaginator = require('eris-pagination');
const {getOrFetchChannel} = require("../utils");

module.exports = ({ bot, knex, config, commands }) => {
  if (! config.allowBlock) return;
  async function removeExpiredBlocks() {
    const expiredBlocks = await blocked.getExpiredBlocks();
    const logChannel = utils.getLogChannel();
    for (const userId of expiredBlocks) {
      await blocked.unblock(userId);
      logChannel.createMessage({
        content: `Block of <@!${userId}> (id \`${userId}\`) expired`,
        allowedMentions: {
          users: [userId],
        },
      });
    }
  }

  async function expiredBlockLoop() {
    try {
      await removeExpiredBlocks();
    } catch (e) {
      console.error(e);
    }

    setTimeout(expiredBlockLoop, 2000);
  }

  expiredBlockLoop();

  async function getUserREST(userId) {
    let user; 
    try {
      console.log(`Getting data for user ${userId} from the REST API...`);
      user = await bot.getRESTUser(userId);
    } catch (e) {
      console.log(e);
    }

    return user;
  }

  const blockCmd = async (msg, args, thread) => {
    const userIdToBlock = args.userId || (thread && thread.user_id);
    if (! userIdToBlock) return;

    const channel = await getOrFetchChannel(bot, msg.channel.id);

    const isBlocked = await blocked.isBlocked(userIdToBlock);
    if (isBlocked) {
      channel.createMessage("User is already blocked");
      return;
    }

    const expiresAt = args.blockTime
      ? moment.utc().add(args.blockTime, "ms").format("YYYY-MM-DD HH:mm:ss")
      : null;

    let user = bot.users.get(userIdToBlock) || await getUserREST(userIdToBlock);
    if (! user) return channel.createMessage(`Unable to block user due to an internal error.`);

    await blocked.block(userIdToBlock, (user ? user.username : ""), msg.author.id, expiresAt);

    if (expiresAt) {
      const humanized = humanizeDuration(args.blockTime, { largest: 2, round: true });
      msg.channel.createMessage(`Blocked <@${userIdToBlock}> (id \`${userIdToBlock}\`) from modmail for ${humanized}`);

      const timedBlockMessage = config.timedBlockMessage || config.blockMessage;
      if (timedBlockMessage) {
        const dmChannel = await user.getDMChannel();
        const formatted = timedBlockMessage
          .replace(/\{duration}/g, humanized)
          .replace(/\{timestamp}/g, moment.utc(expiresAt).format("X"));
        dmChannel.createMessage(formatted).catch(utils.noop);
      }
    } else {
      msg.channel.createMessage(`Blocked <@${userIdToBlock}> (id \`${userIdToBlock}\`) from modmail indefinitely`);

      if (config.blockMessage != null) {
        const dmChannel = await user.getDMChannel();
        dmChannel.createMessage(config.blockMessage).catch(utils.noop);
      }
    }
  };

  commands.addInboxServerCommand("block", "<userId:userId> [blockTime:delay]", blockCmd);
  commands.addInboxServerCommand("block", "[blockTime:delay]", blockCmd);

  const unblockCmd = async (msg, args, thread) => {
    const userIdToUnblock = args.userId || (thread && thread.user_id);
    if (! userIdToUnblock) return;

    const isBlocked = await blocked.isBlocked(userIdToUnblock);
    if (! isBlocked) {
      msg.channel.createMessage("User is not blocked");
      return;
    }

    const unblockAt = args.unblockDelay
      ? moment.utc().add(args.unblockDelay, "ms").format("YYYY-MM-DD HH:mm:ss")
      : null;

    let user = bot.users.get(userIdToUnblock) || await getUserREST(userIdToUnblock);
    if (! user) return channel.createMessage(`Unable to unblock user due to an internal error.`);

    if (unblockAt) {
      const humanized = humanizeDuration(args.unblockDelay, { largest: 2, round: true });
      await blocked.updateExpiryTime(userIdToUnblock, unblockAt);
      msg.channel.createMessage(`Scheduled <@${userIdToUnblock}> (id \`${userIdToUnblock}\`) to be unblocked in ${humanized}`);

      const timedUnblockMessage = config.timedUnblockMessage || config.unblockMessage;
      if (timedUnblockMessage) {
        const dmChannel = await user.getDMChannel();
        const formatted = timedUnblockMessage
          .replace(/\{delay}/g, humanized)
          .replace(/\{timestamp}/g, moment.utc(unblockAt).format("X"))
        dmChannel.createMessage(formatted).catch(utils.noop);
      }
    } else {
      await blocked.unblock(userIdToUnblock);
      msg.channel.createMessage(`Unblocked <@${userIdToUnblock}> (id ${userIdToUnblock}) from modmail`);

      if (config.unblockMessage) {
        const dmChannel = await user.getDMChannel();
        dmChannel.createMessage(config.unblockMessage).catch(utils.noop);
      }
    }
  };

  commands.addInboxServerCommand("unblock", "<userId:userId> [unblockDelay:delay]", unblockCmd);
  commands.addInboxServerCommand("unblock", "[unblockDelay:delay]", unblockCmd);

  commands.addInboxServerCommand("is_blocked",  "[userId:userId]",async (msg, args, thread) => {
    const userIdToCheck = args.userId || (thread && thread.user_id);
    if (! userIdToCheck) return;

    const blockStatus = await blocked.getBlockStatus(userIdToCheck);
    if (blockStatus.isBlocked) {
      if (blockStatus.expiresAt) {
        msg.channel.createMessage({
          content: `<@!${userIdToCheck}> (id \`${userIdToCheck}\`) is blocked until ${blockStatus.expiresAt} (UTC)`,
          allowedMentions: { users: [userIdToCheck] },
        });
      } else {
        msg.channel.createMessage({
          content: `<@!${userIdToCheck}> (id \`${userIdToCheck}\`) is blocked indefinitely`,
          allowedMentions: { users: [userIdToCheck] },
        });
      }
    } else {
      msg.channel.createMessage({
        content: `<@!${userIdToCheck}> (id \`${userIdToCheck}\`) is NOT blocked`,
        allowedMentions: { users: [userIdToCheck] },
      });
    }
  });

  commands.addInboxServerCommand("blocklist", "", async (msg, args, thread) => {
    const blockedUsers = await blocked.getBlockedUsers();
    if (blockedUsers.length === 0) {
      msg.channel.createMessage("No users are currently blocked.");
      return;
    }

    const userInfoArray = [];

    for (const user of blockedUsers) {
      const userInfo = `**<@!${user.userId}>** - Blocked by <@${user.blockedBy}>${user.expiresAt ? ` until ${user.expiresAt} (UTC)` : " permanently"}`;
      userInfoArray.push(userInfo);
    }

    const embedDescriptionCharacterLimit = 4096;

    const embedColor = 15785893;
    const embedTitle = "List of Blocked Users";
    const embedTimestamp = new Date().toISOString();

    const embeds = [];

    let currentPage = [];
    let currentLength = 0;

    for (const info of userInfoArray) {
      const infoLength = info.length + 1;

      if (currentLength + infoLength > embedDescriptionCharacterLimit) {
        embeds.push({
          color: embedColor,
          title: embedTitle,
          description: currentPage.join("\n"),
          timestamp: embedTimestamp
        });

        currentPage = [info];
        currentLength = info.length + 1;
      } else {
        currentPage.push(info);
        currentLength += infoLength;
      }
    }

    if (currentPage.length > 0) {
      embeds.push({
        color: embedColor,
        title: embedTitle,
        description: currentPage.join("\n"),
        timestamp: embedTimestamp
      });
    }

    embedPaginator.createPaginationEmbed(msg, embeds, { timeout: 180000, cycling: true }); // 3 minute timeout
  });
};
