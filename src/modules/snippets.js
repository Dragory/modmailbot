const threads = require('../data/threads');
const snippets = require('../data/snippets');
const config = require('../config');
const utils = require('../utils');
const threadUtils = require('../threadUtils');

const whitespaceRegex = /\s/;
const quoteChars = ["'", '"'];

module.exports = bot => {
  const addInboxServerCommand = (...args) => threadUtils.addInboxServerCommand(bot, ...args);

  /**
   * Parse a string of arguments, e.g.
   * arg "quoted arg" with\ some\ escapes
   * ...to an array of said arguments
   * @param {String} str
   * @returns {String[]}
   */
  function parseArgs(str) {
    const args = [];
    let current = '';
    let inQuote = false;
    let escapeNext = false;

    for (const char of [...str]) {
      if (escapeNext) {
        current += char;
        escapeNext = false;
      } else if (char === '\\') {
        escapeNext = true;
      } else if (! inQuote && whitespaceRegex.test(char)) {
        args.push(current);
        current = '';
      } else if (! inQuote && quoteChars.includes(char)) {
        inQuote = char;
      } else if (inQuote && inQuote === char) {
        inQuote = false;
      } else {
        current += char;
      }
    }

    if (current !== '') args.push(current);

    return args;
  }

  /**
   * "Renders" a snippet by replacing all argument placeholders e.g. {1} {2} with their corresponding arguments.
   * The number in the placeholder is the argument's order in the argument list, i.e. {1} is the first argument (= index 0)
   * @param {String} body
   * @param {String[]} args
   * @returns {String}
   */
  function renderSnippet(body, args) {
    return body
      .replace(/(?<!\\){\d+}/g, match => {
        const index = parseInt(match.slice(1, -1), 10) - 1;
        return (args[index] != null ? args[index] : match);
      })
      .replace(/\\{/g, '{');
  }

  /**
   * When a staff member uses a snippet (snippet prefix + trigger word), find the snippet and post it as a reply in the thread
   */
  bot.on('messageCreate', async msg => {
    if (! utils.messageIsOnInboxServer(msg)) return;
    if (! utils.isStaff(msg.member)) return;

    if (msg.author.bot) return;
    if (! msg.content) return;
    if (! msg.content.startsWith(config.snippetPrefix) && ! msg.content.startsWith(config.snippetPrefixAnon)) return;

    let snippetPrefix, isAnonymous;

    if (config.snippetPrefixAnon.length > config.snippetPrefix.length) {
      // Anonymous prefix is longer -> check it first
      if (msg.content.startsWith(config.snippetPrefixAnon)) {
        snippetPrefix = config.snippetPrefixAnon;
        isAnonymous = true;
      } else {
        snippetPrefix = config.snippetPrefix;
        isAnonymous = false;
      }
    } else {
      // Regular prefix is longer -> check it first
      if (msg.content.startsWith(config.snippetPrefix)) {
        snippetPrefix = config.snippetPrefix;
        isAnonymous = false;
      } else {
        snippetPrefix = config.snippetPrefixAnon;
        isAnonymous = true;
      }
    }

    const thread = await threads.findByChannelId(msg.channel.id);
    if (! thread) return;

    let [, trigger, rawArgs] = msg.content.slice(snippetPrefix.length).match(/(\S+)(?:\s+(.*))?/s);
    trigger = trigger.toLowerCase();

    const snippet = await snippets.get(trigger);
    if (! snippet) return;

    const args = rawArgs ? parseArgs(rawArgs) : [];
    const rendered = renderSnippet(snippet.body, args);

    const replied = await thread.replyToUser(msg.member, rendered, [], isAnonymous);
    if (replied) msg.delete();
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
        utils.postSystemMessageWithFallback(msg.channel, thread, `\`${config.snippetPrefix}${trigger}\` replies with:\n${snippet.body}`);
      }
    } else {
      if (text) {
        // If the snippet doesn't exist and the user wants to create it, create it
        await snippets.add(trigger, text, msg.author.id);
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
    await snippets.add(trigger, text, msg.author.id);

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
