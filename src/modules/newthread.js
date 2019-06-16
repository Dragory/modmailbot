const utils = require("../utils");
const threads = require("../data/threads");

module.exports = (bot, knex, config, commands) => {
  commands.addInboxServerCommand('newthread', '<userId:userId>', async (msg, args, thread) => {
    const user = bot.users.get(args.userId);
    if (! user) {
      utils.postSystemMessageWithFallback(msg.channel, thread, 'User not found!');
      return;
    }

    const existingThread = await threads.findOpenThreadByUserId(user.id);
    if (existingThread) {
      utils.postSystemMessageWithFallback(msg.channel, thread, `Cannot create a new thread; there is another open thread with this user: <#${existingThread.channel_id}>`);
      return;
    }

    const createdThread = await threads.createNewThreadForUser(user, true, true);
    createdThread.postSystemMessage(`Thread was opened by ${msg.author.username}#${msg.author.discriminator}`);

    msg.channel.createMessage(`Thread opened: <#${createdThread.channel_id}>`);
  });
};
