const threads = require('./data/threads');
const utils = require("./utils");

/**
 * Adds a command that can only be triggered on the inbox server.
 * Command handlers added with this function also get the thread the message was posted in as a third argument, if any.
 * @param {Eris~CommandClient} bot
 * @param {String} cmd
 * @param {Function} commandHandler
 * @param {Eris~CommandOptions} opts
 */
function addInboxServerCommand(bot, cmd, commandHandler, opts) {
  bot.registerCommand(cmd, async (msg, args) => {
    if (! utils.messageIsOnInboxServer(msg)) return;
    if (! utils.isStaff(msg.member)) return;

    const thread = await threads.findOpenThreadByChannelId(msg.channel.id);
    commandHandler(msg, args, thread);
  }, opts);
}

module.exports = {
  addInboxServerCommand
};
