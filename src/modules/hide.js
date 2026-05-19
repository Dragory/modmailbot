const Eris = require("eris");
const utils = require("../utils");
const threads = require("../data/threads");

/**
 * @param {Eris.CommandClient} bot
 */
module.exports = ({ bot, commands }) => {
  commands.addInboxServerCommand("hide", "<threadIdOrUrl:string>", async (msg, args, thread) => {
    if (! utils.isAdmin(msg.member)) return;
    if (! args.threadIdOrUrl) return bot.createMessage(msg.channel.id, "Please provide a thread ID!");

    let threadId = args.threadIdOrUrl;

    if (args.threadIdOrUrl.match(/(http:|https:)+[^\s]+[\w]/)) {
      threadId = args.threadIdOrUrl.split("/").pop();
    }

    thread = await threads.findById(threadId);

    if (! thread) return bot.createMessage(msg.channel.id, "Thread not found!");

    const suffix = msg.channel.id == thread.channel_id ? "this" : "that";
    const text = `Made ${suffix} thread`;

    if (! thread.isPrivate) {
      thread.makePrivate();
      bot.createMessage(msg.channel.id, text + " private!");
    } else {
      thread.makePublic();
      bot.createMessage(msg.channel.id, text + " public!");
    }
  });
};