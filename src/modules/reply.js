const attachments = require("../data/attachments");
const threadUtils = require("../threadUtils");

module.exports = bot => {
  const addInboxServerCommand = (...args) => threadUtils.addInboxServerCommand(bot, ...args);

  // Mods can reply to modmail threads using !r or !reply
  // These messages get relayed back to the DM thread between the bot and the user
  addInboxServerCommand('reply', async (msg, args, thread) => {
    if (! thread) return;

    const text = args.join(' ').trim();
    if (msg.attachments.length) await attachments.saveAttachmentsInMessage(msg);
    await thread.replyToUser(msg.member, text, msg.attachments, false);
    msg.delete();
  });

  bot.registerCommandAlias('r', 'reply');

  // Anonymous replies only show the role, not the username
  addInboxServerCommand('anonreply', async (msg, args, thread) => {
    if (! thread) return;

    const text = args.join(' ').trim();
    if (msg.attachments.length) await attachments.saveAttachmentsInMessage(msg);
    await thread.replyToUser(msg.member, text, msg.attachments, true);
    msg.delete();
  });

  bot.registerCommandAlias('ar', 'anonreply');
};
