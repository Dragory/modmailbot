const utils = require("../utils");
const threadUtils = require("../threadUtils");
const threads = require("../data/threads");

module.exports = bot => {
  const addInboxServerCommand = (...args) => threadUtils.addInboxServerCommand(bot, ...args);

  addInboxServerCommand('newthread', async (msg, args, thread) => {
    if (args.length === 0) return;

    const userId = utils.getUserMention(args[0]);
    if (! userId) return;

    const user = bot.users.get(userId);
    if (! user) {
      utils.postSystemMessageWithFallback(msg.channel, thread, 'User not found!');
      return;
    }

    let member;
    const mainGuilds = utils.getMainGuilds();
    if (mainGuilds.length === 1) {
      member = bot.guilds.get(mainGuilds[0]).members.get(msg.author.id);
      if (! member) {
        member = false;
      }
    } else {
      member = false;
    }

    const existingThread = await threads.findOpenThreadByUserId(user.id);
    if (existingThread) {
      utils.postSystemMessageWithFallback(msg.channel, thread, `Cannot create a new thread; there is another open thread with this user: <#${existingThread.channel_id}>`);
      return;
    }

    const createdThread = await threads.createNewThreadForUser(user, member, true);
    createdThread.postSystemMessage(`Thread was opened by ${msg.author.username}#${msg.author.discriminator}`);

    if (thread) {
      msg.delete();
    }
  });
};
