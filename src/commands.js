const { CommandManager, defaultParameterTypes, TypeConversionError } = require('knub-command-manager');
const config = require('./config');
const utils = require('./utils');
const threads = require('./data/threads');

module.exports = {
  createCommandManager(bot) {
    const manager = new CommandManager({
      prefix: config.prefix,
      types: Object.assign({}, defaultParameterTypes, {
        userId(value) {
          const userId = utils.getUserMention(value);
          if (! userId) throw new TypeConversionError();
          return userId;
        },

        delay(value) {
          const ms = utils.convertDelayStringToMS(value);
          if (ms === null) throw new TypeConversionError();
          return ms;
        }
      })
    });

    const handlers = {};
    const aliasMap = new Map();

    bot.on('messageCreate', async msg => {
      if (msg.author.bot) return;
      if (msg.author.id === bot.user.id) return;
      if (! msg.content) return;

      const matchedCommand = await manager.findMatchingCommand(msg.content, { msg });
      if (matchedCommand === null) return;
      if (matchedCommand.error !== undefined) {
        utils.postError(msg.channel, matchedCommand.error);
        return;
      }

      const allArgs = {};
      for (const [name, arg] of Object.entries(matchedCommand.args)) {
        allArgs[name] = arg.value;
      }
      for (const [name, opt] of Object.entries(matchedCommand.opts)) {
        allArgs[name] = opt.value;
      }

      handlers[matchedCommand.id](msg, allArgs);
    });

    /**
     * Add a command that can be invoked anywhere
     */
    const addGlobalCommand = (trigger, parameters, handler, commandConfig = {}) => {
      let aliases = aliasMap.has(trigger) ? [...aliasMap.get(trigger)] : [];
      if (commandConfig.aliases) aliases.push(...commandConfig.aliases);

      const cmd = manager.add(trigger, parameters, { ...commandConfig, aliases });
      handlers[cmd.id] = handler;
    };

    /**
     * Add a command that can only be invoked on the inbox server
     */
    const addInboxServerCommand = (trigger, parameters, handler, commandConfig = {}) => {
      const aliases = aliasMap.has(trigger) ? [...aliasMap.get(trigger)] : [];
      if (commandConfig.aliases) aliases.push(...commandConfig.aliases);

      const cmd = manager.add(trigger, parameters, {
        ...commandConfig,
        aliases,
        preFilters: [
          (_, context) => {
            if (! utils.messageIsOnInboxServer(context.msg)) return false;
            if (! utils.isStaff(context.msg.member)) return false;
            return true;
          }
        ]
      });

      handlers[cmd.id] = async (msg, args) => {
        const thread = await threads.findOpenThreadByChannelId(msg.channel.id);
        handler(msg, args, thread);
      };
    };

    /**
     * Add a command that can only be invoked in a thread on the inbox server
     */
    const addInboxThreadCommand = (trigger, parameters, handler, commandConfig = {}) => {
      const aliases = aliasMap.has(trigger) ? [...aliasMap.get(trigger)] : [];
      if (commandConfig.aliases) aliases.push(...commandConfig.aliases);

      let thread;
      const cmd = manager.add(trigger, parameters, {
        ...commandConfig,
        aliases,
        preFilters: [
          async (_, context) => {
            if (! utils.messageIsOnInboxServer(context.msg)) return false;
            if (! utils.isStaff(context.msg.member)) return false;
            thread = await threads.findOpenThreadByChannelId(context.msg.channel.id);
            if (! thread) return false;
            return true;
          }
        ]
      });

      handlers[cmd.id] = async (msg, args) => {
        handler(msg, args, thread);
      };
    };

    const addAlias = (originalCmd, alias) => {
      if (! aliasMap.has(originalCmd)) {
        aliasMap.set(originalCmd, new Set());
      }

      aliasMap.get(originalCmd).add(alias);
    };

    return {
      manager,
      addGlobalCommand,
      addInboxServerCommand,
      addInboxThreadCommand,
      addAlias,
    };
  }
};
