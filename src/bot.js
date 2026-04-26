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
];

let missingAuthorWarningCount = 0;
let lastMissingAuthorWarningAt = 0;

bot.on("error", err => {
  // Discord can (rarely) send partial message objects without an author (e.g. forwards / history fetches).
  // Eris emits these as "error" events; we don't want them to crash the bot.
  if (err && typeof err.message === "string" && err.message.startsWith("MESSAGE_CREATE but no message author:")) {
    missingAuthorWarningCount++;

    const now = Date.now();
    // Log at most once per minute to avoid console spam
    if (now - lastMissingAuthorWarningAt > 60 * 1000) {
      lastMissingAuthorWarningAt = now;
      console.warn(`[WARN] Received message without an author from Discord (likely a forwarded message or partial payload). Suppressing. Seen ${missingAuthorWarningCount} time(s) since start.`);
    }
    return;
  }

  if (SAFE_TO_IGNORE_ERROR_CODES.includes(err.code)) {
    return;
  }

  throw err;
});

/**
 * @type {Eris.Client}
 */
module.exports = bot;
