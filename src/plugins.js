const attachments = require("./data/attachments");
const logs = require("./data/logs");
const { beforeNewThread } = require("./hooks/beforeNewThread");
const { afterThreadClose } = require("./hooks/afterThreadClose");
const formats = require("./formatters");
const { server: webserver } = require("./modules/webserver");

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
      logs: {
        addStorageType: logs.addStorageType,
        saveLogToStorage: logs.saveLogToStorage,
        getLogUrl: logs.getLogUrl,
        getLogFile: logs.getLogFile,
        getLogCustomResponse: logs.getLogCustomResponse,
      },
      hooks: {
        beforeNewThread,
        afterThreadClose,
      },
      formats,
      webserver,
    };
  },

  async loadPlugin(plugin, api) {
    await plugin(api);
  }
};
