module.exports = ({ bot, knex, config, commands }) => {
  commands.addInboxThreadCommand('id', [], async (msg, args, thread) => {
    thread.postSystemMessage(thread.user_id);
  });

  commands.addInboxThreadCommand('dm_channel_id', [], async (msg, args, thread) => {
    const dmChannel = await thread.getDMChannel();
    thread.postSystemMessage(dmChannel.id);
  });
};
