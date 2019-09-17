const attachments = require("../data/attachments");
const utils = require('../utils');

module.exports = ({ bot, knex, config, commands }) => {
  // Mods can reply to modmail threads using !r or !reply
  // These messages get relayed back to the DM thread between the bot and the user
  commands.addInboxThreadCommand('reply', '[text$]', async (msg, args, thread) => {
    if (! args.text && msg.attachments.length === 0) {
      utils.postError(msg.channel, 'Text or attachment required');
      return;
    }

    const replied = await thread.replyToUser(msg.member, args.text || '', msg.attachments, false);
    if (replied) msg.delete();
  }, {
    aliases: ['r']
  });


  // Anonymous replies only show the role, not the username
  commands.addInboxThreadCommand('anonreply', '[text$]', async (msg, args, thread) => {
    if (! args.text && msg.attachments.length === 0) {
      utils.postError(msg.channel, 'Text or attachment required');
      return;
    }

    const replied = await thread.replyToUser(msg.member, args.text || '', msg.attachments, true);
    if (replied) msg.delete();
  }, {
    aliases: ['ar']
  });
};
