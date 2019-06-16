module.exports = (bot, knex, config, commands) => {
  commands.addInboxThreadCommand('id', [], async (msg, args, thread) => {
    thread.postSystemMessage(thread.user_id);
  });
};
