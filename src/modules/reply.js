const attachments = require("../data/attachments");

module.exports = (bot, knex, config, commands) => {
  // Mods can reply to modmail threads using !r or !reply
  // These messages get relayed back to the DM thread between the bot and the user
  commands.addInboxThreadCommand('reply', '<text$>', async (msg, args, thread) => {
    const replied = await thread.replyToUser(msg.member, args.text, msg.attachments, false);
    if (replied) msg.delete();
  }, {
    aliases: ['r']
  });


  // Anonymous replies only show the role, not the username
  commands.addInboxThreadCommand('anonreply', '<text$>', async (msg, args, thread) => {
    const replied = await thread.replyToUser(msg.member, args.text, msg.attachments, true);
    if (replied) msg.delete();
  }, {
    aliases: ['ar']
  });
};
