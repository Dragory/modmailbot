const Eris = require("eris");
const config = require("./cfg");

const intents = [
  "directMessages", // For core functionality
  "guildMessages", // For bot commands and mentions
  "guilds", // For core functionality
  "guildVoiceStates", // For member information in the thread header
  "guildMessageTyping", // For typing indicators
  "directMessageTyping", // For typing indicators

  ...config.extraIntents, // Any extra intents added to the config
];

const bot = new Eris.Client(config.token, {
  restMode: true,
  intents: Array.from(new Set(intents)),
});

/**
 * @type {Eris.Client}
 */
module.exports = bot;
