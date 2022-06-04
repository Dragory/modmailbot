const threads = require("../data/threads");
const snippets = require("../data/snippets");
const utils = require("../utils");
const { parseArguments } = require("knub-command-manager");

const whitespaceRegex = /\s/;
const quoteChars = ["'", "\""];

module.exports = ({ bot, knex, config, commands }) => {
  if (! config.allowSnippets) return;
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
      .replace(/\\{/g, "{");
  }

  /**
   * When a staff member uses a snippet (snippet prefix + trigger word), find the snippet and post it as a reply in the thread
   */
  bot.on("messageCreate", async msg => {
    if (! await utils.messageIsOnInboxServer(bot, msg)) return;
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

    const snippetInvoke = msg.content.slice(snippetPrefix.length);
    if (! snippetInvoke) return;

    let [, trigger, rawArgs] = snippetInvoke.match(/(\S+)(?:\s+(.*))?/s);
    trigger = trigger.toLowerCase();

    const snippet = await snippets.get(trigger);
    if (! snippet) return;

    let args = rawArgs ? parseArguments(rawArgs) : [];
    args = args.map(arg => arg.value);
    const rendered = renderSnippet(snippet.body, args);

    const replied = await thread.replyToUser(msg.member, rendered, [], isAnonymous, msg.messageReference);
    if (replied) msg.delete();
  });

  // Show or add a snippet
  commands.addInboxServerCommand("snippet", "<trigger> [text$]", async (msg, args, thread) => {
    const snippet = await snippets.get(args.trigger);

    if (snippet) {
      if (args.text) {
        // If the snippet exists and we're trying to create a new one, inform the user the snippet already exists
        utils.postSystemMessageWithFallback(msg.channel, thread, `Snippet "${args.trigger}" already exists! You can edit or delete it with ${config.prefix}edit_snippet and ${config.prefix}delete_snippet respectively.`);
      } else {
        // If the snippet exists and we're NOT trying to create a new one, show info about the existing snippet
        utils.postSystemMessageWithFallback(msg.channel, thread, `\`${config.snippetPrefix}${args.trigger}\` replies with: \`\`\`\n${utils.disableCodeBlocks(snippet.body)}\`\`\``);
      }
    } else {
      if (args.text) {
        // If the snippet doesn't exist and the user wants to create it, create it
        await snippets.add(args.trigger, args.text, msg.author.id);
        utils.postSystemMessageWithFallback(msg.channel, thread, `Snippet "${args.trigger}" created!`);
      } else {
        // If the snippet doesn't exist and the user isn't trying to create it, inform them how to create it
        utils.postSystemMessageWithFallback(msg.channel, thread, `Snippet "${args.trigger}" doesn't exist! You can create it with \`${config.prefix}snippet ${args.trigger} text\``);
      }
    }
  }, {
    aliases: ["s"]
  });

  commands.addInboxServerCommand("delete_snippet", "<trigger>", async (msg, args, thread) => {
    const snippet = await snippets.get(args.trigger);
    if (! snippet) {
      utils.postSystemMessageWithFallback(msg.channel, thread, `Snippet "${args.trigger}" doesn't exist!`);
      return;
    }

    await snippets.del(args.trigger);
    utils.postSystemMessageWithFallback(msg.channel, thread, `Snippet "${args.trigger}" deleted!`);
  }, {
    aliases: ["ds"]
  });

  commands.addInboxServerCommand("edit_snippet", "<trigger> <text$>", async (msg, args, thread) => {
    const snippet = await snippets.get(args.trigger);
    if (! snippet) {
      utils.postSystemMessageWithFallback(msg.channel, thread, `Snippet "${args.trigger}" doesn't exist!`);
      return;
    }

    await snippets.del(args.trigger);
    await snippets.add(args.trigger, args.text, msg.author.id);

    utils.postSystemMessageWithFallback(msg.channel, thread, `Snippet "${args.trigger}" edited!`);
  }, {
    aliases: ["es"]
  });

  commands.addInboxServerCommand("snippets", [], async (msg, args, thread) => {
    const allSnippets = await snippets.all();
    const triggers = allSnippets.map(s => s.trigger);
    triggers.sort();

    utils.postSystemMessageWithFallback(msg.channel, thread, `Available snippets (prefix ${config.snippetPrefix}):\n${triggers.join(", ")}`);
  }, {
    aliases: ["s"]
  });
};
