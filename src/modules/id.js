const threadUtils = require("../threadUtils");

module.exports = bot => {
  const addInboxServerCommand = (...args) => threadUtils.addInboxServerCommand(bot, ...args);

  addInboxServerCommand('id', async (msg, args, thread) => {
    if (! thread) return;
    thread.postSystemMessage(thread.user_id);
  });
};
