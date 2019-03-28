const Eris = require('eris');
const config = require('./config');

const bot = new Eris.CommandClient(config.token, {
  getAllUsers: true,
  restMode: true,
}, {
  prefix: config.prefix,
  ignoreSelf: true,
  ignoreBots: true,
  defaultHelpCommand: false,
  defaultCommandOptions: {
    caseInsensitive: true,
  },
});

module.exports = bot;
