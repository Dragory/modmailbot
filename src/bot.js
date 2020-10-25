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

bot.on("error", err => {
  if (err.code === 1006 || err.code === "ECONNRESET") {
    // 1006 = "Connection reset by peer"
    // ECONNRESET is similar
    // Eris allegedly handles these internally, so we can ignore them
    return;
  }

  throw err;
});

/**
 * @type {Eris.Client}
 */
module.exports = bot;
