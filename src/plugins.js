const attachments = require('./data/attachments');
const { beforeNewThread } = require('./hooks');
const formats = require('./formatters');

module.exports = {
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
      },
      formats,
    };
  },

  async loadPlugin(plugin, api) {
    await plugin(api);
  }
};
