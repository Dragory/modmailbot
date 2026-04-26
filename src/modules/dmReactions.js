const Eris = require("eris");
const threads = require("../data/threads");
const { THREAD_MESSAGE_TYPE } = require("../data/constants");
const { getOrFetchChannel } = require("../utils");
const util = require("util");

module.exports = ({ bot, knex, config, commands }) => {
  /**
   * When a user reacts to a DM from the bot, notify staff in the thread
   */
  if (config.notifyOnReaction) {
    bot.on("messageReactionAdd", async (msg, emoji, reactor) => {
      try {
        const channel = await getOrFetchChannel(bot, msg.channel.id);
        if (!(channel instanceof Eris.PrivateChannel)) return;

        if (!(reactor instanceof Eris.User)) {
          reactor = await bot.getRESTUser(reactor.id);
        }

        if (reactor.bot) return;

        const threadMessage = await threads.findThreadMessageByDMMessageId(
          msg.id
        );
        if (!threadMessage) return;

        const thread = await threads.findById(threadMessage.thread_id);
        if (!thread || thread.isClosed()) return;

        if (threadMessage.message_type !== THREAD_MESSAGE_TYPE.TO_USER) return;

        // Format the emoji for display
        let emojiDisplay;
        if (emoji.id) {
          // Custom emoji
          emojiDisplay = `<:${emoji.name}:${emoji.id}>`;
        } else {
          // Unicode emoji
          emojiDisplay = emoji.name;
        }

        // Get the user's display name
        const userName = config.useDisplaynames
          ? reactor.globalName || reactor.username
          : reactor.username;

        // Post notification in the thread
        await thread.postSystemMessage(
          `${userName} reacted to message ${threadMessage.message_number} with ${emojiDisplay}`
        );
      } catch (err) {
        console.error("Error in messageReactionAdd handler:", err);
      }
    });
  }

  /**
   * When a user removes a reaction from a DM from the bot, notify staff in the thread
   */
  if (config.notifyOnReactionRemoval) {
    bot.on("messageReactionRemove", async (msg, emoji, reactorId) => {
      try {
        const channel = await getOrFetchChannel(bot, msg.channel.id);
        if (!(channel instanceof Eris.PrivateChannel)) return;

        const reactor = bot.users.get(reactorId) ?? await bot.getRESTUser(reactorId);

        if (reactor.bot) return;

        const threadMessage = await threads.findThreadMessageByDMMessageId(
          msg.id
        );
        if (!threadMessage) return;

        const thread = await threads.findById(threadMessage.thread_id);
        if (!thread || thread.isClosed()) return;

        if (threadMessage.message_type !== THREAD_MESSAGE_TYPE.TO_USER) return;

        // Format the emoji for display
        let emojiDisplay;
        if (emoji.id) {
          // Custom emoji
          emojiDisplay = `<:${emoji.name}:${emoji.id}>`;
        } else {
          // Unicode emoji
          emojiDisplay = emoji.name;
        }

        const userName = config.useDisplaynames
          ? reactor.globalName || reactor.username
          : reactor.username;

        // Post notification in the thread
        await thread.postSystemMessage(
          `${userName} removed reaction ${emojiDisplay} from message ${threadMessage.message_number}`
        );
      } catch (err) {
        console.error("Error in messageReactionRemove handler:", err);
      }
    });
  }
};
