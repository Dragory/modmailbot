const Eris = require('eris');
const config = require('./cfg');

const intents = [
	// PRIVILEGED INTENTS
	// For server greetings
	'guildMembers',
	// REGULAR INTENTS
	// For core functionality
	'directMessages',
	// For bot commands and mentions
	'guildMessages',
	// For core functionality
	'guilds',
	// For member information in the thread header
	'guildVoiceStates',
	// For typing indicators
	'guildMessageTyping',
	// For typing indicators
	'directMessageTyping',
	// For join/leave notification Ban message
	'guildBans',
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
	// "CloudFlare WebSocket proxy restarting"
	1001,
	// "Connection reset by peer"
	1006,
	// Pretty much the same as above
	'ECONNRESET',
];

bot.on('error', err => {
	if (SAFE_TO_IGNORE_ERROR_CODES.includes(err.code)) return;

	throw err;
});

/**
 * @type {Eris.Client}
 */
module.exports = bot;
