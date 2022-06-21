const { getPrettyVersion } = require('../botVersion');
const updates = require('../data/updates');
const utils = require('../utils');

module.exports = ({ config, commands }) => {
	commands.addInboxServerCommand('version', [], async (msg, args, thread) => {
		let response = `Modmail ${getPrettyVersion()}`;

		if (config.updateNotifications) {
			const availableUpdate = await updates.getAvailableUpdate();
			if (availableUpdate) response += ` (version ${availableUpdate} available)`;
		}

		utils.postSystemMessageWithFallback(msg.channel, thread, response);
	});
};
