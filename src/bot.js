const Eris = require("eris");
const config = require("./cfg");

const intents = [
  // PRIVILEGED INTENTS
  "guildMembers", // For server greetings

  // REGULAR INTENTS
  "directMessages", // For core functionality
  "guildMessages", // For bot commands and mentions
  "messageContent", // For everything
  "guilds", // For core functionality
  "guildVoiceStates", // For member information in the thread header
  "guildMessageTyping", // For typing indicators
  "directMessageTyping", // For typing indicators
  "guildBans", // For join/leave notification Ban message

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
  "EAI_AGAIN", // DNS resolution temporary failure
];

bot.on("error", (err) => {
  if (SAFE_TO_IGNORE_ERROR_CODES.includes(err.code)) {
    console.warn(
      `[Eris warning] Ignoring transient error code ${err.code}: ${err.message || "no message"}`,
    );
    return;
  }

  if (
    err &&
    typeof err.message === "string" &&
    err.message.startsWith("Invalid channel ID:")
  ) {
    // Known noisy Eris cache race; safe to ignore
    console.warn(`[Eris warning] Ignoring known cache race: ${err.message}`);
    return;
  }

  throw err;
});

/**
 * @type {Eris.Client}
 */
module.exports = bot;
