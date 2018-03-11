const threadUtils = require('../threadUtils');
const threads = require("../data/threads");

module.exports = bot => {
  const addInboxServerCommand = (...args) => threadUtils.addInboxServerCommand(bot, ...args);

  addInboxServerCommand('suspend', async (msg, args, thread) => {
    if (! thread) return;
    await thread.suspend();
    thread.postSystemMessage(`**Thread suspended!** This thread will act as closed until unsuspended with \`!unsuspend\``);
  });

  addInboxServerCommand('unsuspend', async msg => {
    const thread = await threads.findSuspendedThreadByChannelId(msg.channel.id);
    if (! thread) return;

    const otherOpenThread = await threads.findOpenThreadByUserId(thread.user_id);
    if (otherOpenThread) {
      thread.postSystemMessage(`Cannot unsuspend; there is another open thread with this user: <#${otherOpenThread.channel_id}>`);
      return;
    }

    await thread.unsuspend();
    thread.postSystemMessage(`**Thread unsuspended!**`);
  });
};
