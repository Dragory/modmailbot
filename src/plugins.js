const attachments = require('./data/attachments');
const { beforeNewThread } = require('./hooks');

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
    };
  },

  async loadPlugin(plugin, api) {
    await plugin(api);
  }
};
