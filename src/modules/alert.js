module.exports = ({ bot, knex, config, commands }) => {
  commands.addInboxThreadCommand("alert", "[opt:string]", async (msg, args, thread) => {
    if (args.opt && args.opt.startsWith("c")) {
      await thread.removeAlert(msg.author.id)
      await thread.postSystemMessage("Cancelled new message alert");
    } else {
      await thread.addAlert(msg.author.id);
      await thread.postSystemMessage(`Pinging ${msg.author.username} when this thread gets a new reply`);
    }
  }, { allowSuspended: true });
};
