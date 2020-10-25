const Eris = require("eris");
const config = require("./cfg");

const intents = [
  // PRIVILEGED INTENTS
  "guildMembers", // For server greetings

  // REGULAR INTENTS
  "directMessages", // For core functionality
  "guildMessages", // For bot commands and mentions
  "guilds", // For core functionality
  "guildVoiceStates", // For member information in the thread header
  "guildMessageTyping", // For typing indicators
  "directMessageTyping", // For typing indicators

  // EXTRA INTENTS (from the config)
  ...config.extraIntents,
];

const bot = new Eris.Client(config.token, {
  restMode: true,
  intents: Array.from(new Set(intents)),
  allowedMentions: {
    everyone: false,
    roles: false,
    users: false,
  },
});

// Eris allegedly handles these internally, so we can ignore them
const SAFE_TO_IGNORE_ERROR_CODES = [
  1001, // "CloudFlare WebSocket proxy restarting"
  1006, // "Connection reset by peer"
  "ECONNRESET", // Pretty much the same as above
];

bot.on("error", err => {
  if (SAFE_TO_IGNORE_ERROR_CODES.includes(err.code)) {
    return;
  }

  throw err;
});

/**
 * @type {Eris.Client}
 */
module.exports = bot;
