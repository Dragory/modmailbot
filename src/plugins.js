const attachments = require("./data/attachments");
const { beforeNewThread } = require("./hooks/beforeNewThread");
const { afterThreadClose } = require("./hooks/afterThreadClose");
const formats = require("./formatters");

module.exports = {
  /**
   * @param bot
   * @param knex
   * @param config
   * @param commands
   * @returns {PluginAPI}
   */
  getPluginAPI({ bot, knex, config, commands }) {
    return {
      bot,
      knex,
      config,
      commands: {
        manager: commands.manager,
        addGlobalCommand: commands.addGlobalCommand,
        addInboxServerCommand: commands.addInboxServerCommand,
        addInboxThreadCommand: commands.addInboxThreadCommand,
        addAlias: commands.addAlias
      },
      attachments: {
        addStorageType: attachments.addStorageType,
        downloadAttachment: attachments.downloadAttachment
      },
      hooks: {
        beforeNewThread,
        afterThreadClose,
      },
      formats,
    };
  },

  async loadPlugin(plugin, api) {
    await plugin(api);
  }
};
