const threads = require('../data/threads');
const snippets = require('../data/snippets');
const config = require('../config');
const utils = require('../utils');
const threadUtils = require('../threadUtils');

module.exports = bot => {
  const addInboxServerCommand = (...args) => threadUtils.addInboxServerCommand(bot, ...args);

  /**
   * When a staff member uses a snippet (snippet prefix + trigger word), find the snippet and post it as a reply in the thread
   */
  bot.on('messageCreate', async msg => {
    if (! utils.messageIsOnInboxServer(msg)) return;
    if (! utils.isStaff(msg.member)) return;

    if (msg.author.bot) return;
    if (! msg.content) return;
    if (! msg.content.startsWith(config.snippetPrefix)) return;

    const thread = await threads.findByChannelId(msg.channel.id);
    if (! thread) return;

    const trigger = msg.content.replace(config.snippetPrefix, '').toLowerCase();
    const snippet = await snippets.get(trigger);
    if (! snippet) return;

    await thread.replyToUser(msg.member, snippet.body, [], !! snippet.is_anonymous);
    msg.delete();
  });

  // Show or add a snippet
  addInboxServerCommand('snippet', async (msg, args, thread) => {
    const trigger = args[0];
    if (! trigger) return

    const text = args.slice(1).join(' ').trim();
    const snippet = await snippets.get(trigger);

    if (snippet) {
      if (text) {
        // If the snippet exists and we're trying to create a new one, inform the user the snippet already exists
        utils.postSystemMessageWithFallback(msg.channel, thread, `Snippet "${trigger}" already exists! You can edit or delete it with ${config.prefix}edit_snippet and ${config.prefix}delete_snippet respectively.`);
      } else {
        // If the snippet exists and we're NOT trying to create a new one, show info about the existing snippet
        utils.postSystemMessageWithFallback(msg.channel, thread, `\`${config.snippetPrefix}${trigger}\` replies ${snippet.is_anonymous ? 'anonymously ' : ''}with:\n${snippet.body}`);
      }
    } else {
      if (text) {
        // If the snippet doesn't exist and the user wants to create it, create it
        await snippets.add(trigger, text, false);
        utils.postSystemMessageWithFallback(msg.channel, thread, `Snippet "${trigger}" created!`);
      } else {
        // If the snippet doesn't exist and the user isn't trying to create it, inform them how to create it
        utils.postSystemMessageWithFallback(msg.channel, thread, `Snippet "${trigger}" doesn't exist! You can create it with \`${config.prefix}snippet ${trigger} text\``);
      }
    }
  });

  bot.registerCommandAlias('s', 'snippet');

  addInboxServerCommand('delete_snippet', async (msg, args, thread) => {
    const trigger = args[0];
    if (! trigger) return;

    const snippet = await snippets.get(trigger);
    if (! snippet) {
      utils.postSystemMessageWithFallback(msg.channel, thread, `Snippet "${trigger}" doesn't exist!`);
      return;
    }

    await snippets.del(trigger);
    utils.postSystemMessageWithFallback(msg.channel, thread, `Snippet "${trigger}" deleted!`);
  });

  bot.registerCommandAlias('ds', 'delete_snippet');

  addInboxServerCommand('edit_snippet', async (msg, args, thread) => {
    const trigger = args[0];
    if (! trigger) return;

    const text = args.slice(1).join(' ').trim();
    if (! text) return;

    const snippet = await snippets.get(trigger);
    if (! snippet) {
      utils.postSystemMessageWithFallback(msg.channel, thread, `Snippet "${trigger}" doesn't exist!`);
      return;
    }

    await snippets.del(trigger);
    await snippets.add(trigger, text, snippet.isAnonymous);

    utils.postSystemMessageWithFallback(msg.channel, thread, `Snippet "${trigger}" edited!`);
  });

  bot.registerCommandAlias('es', 'edit_snippet');

  addInboxServerCommand('snippets', async (msg, args, thread) => {
    const allSnippets = await snippets.all();
    const triggers = allSnippets.map(s => s.trigger);
    triggers.sort();

    utils.postSystemMessageWithFallback(msg.channel, thread, `Available snippets (prefix ${config.snippetPrefix}):\n${triggers.join(', ')}`);
  });
};
