const attachments = require('./data/attachments');

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
    };
  },

  loadPlugin(plugin, api) {
    plugin(api);
  }
};
