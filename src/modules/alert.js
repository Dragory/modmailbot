module.exports = (bot, knex, config, commands) => {
  commands.addInboxThreadCommand('alert', '[opt:string]', async (msg, args, thread) => {
    if (args.opt && args.opt.startsWith('c')) {
      await thread.setAlert(null);
      await thread.postSystemMessage(`Cancelled new message alert`);
    } else {
      await thread.setAlert(msg.author.id);
      await thread.postSystemMessage(`Pinging ${msg.author.username}#${msg.author.discriminator} when this thread gets a new reply`);
    }
  });
};
