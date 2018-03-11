const threadUtils = require('../threadUtils');
const blocked = require("../data/blocked");
const utils = require("../utils");

module.exports = bot => {
  const addInboxServerCommand = (...args) => threadUtils.addInboxServerCommand(bot, ...args);

  addInboxServerCommand('block', (msg, args, thread) => {
    async function block(userId) {
      const user = bot.users.get(userId);
      await blocked.block(userId, (user ? `${user.username}#${user.discriminator}` : ''), msg.author.id);
      msg.channel.createMessage(`Blocked <@${userId}> (id ${userId}) from modmail`);
    }

    if (args.length > 0) {
      // User mention/id as argument
      const userId = utils.getUserMention(args.join(' '));
      if (! userId) return;
      block(userId);
    } else if (thread) {
      // Calling !block without args in a modmail thread blocks the user of that thread
      block(thread.user_id);
    }
  });

  addInboxServerCommand('unblock', (msg, args, thread) => {
    async function unblock(userId) {
      await blocked.unblock(userId);
      msg.channel.createMessage(`Unblocked <@${userId}> (id ${userId}) from modmail`);
    }

    if (args.length > 0) {
      // User mention/id as argument
      const userId = utils.getUserMention(args.join(' '));
      if (! userId) return;
      unblock(userId);
    } else if (thread) {
      // Calling !unblock without args in a modmail thread unblocks the user of that thread
      unblock(thread.user_id);
    }
  });
};
