const path = require('path');
const fs = require('fs');
const config = require('../config');
const utils = require('../utils');

module.exports = ({ bot }) => {
  if (! config.enableGreeting) return;

  bot.on('guildMemberAdd', (guild, member) => {
    const guildGreeting = config.guildGreetings[guild.id];
    if (! guildGreeting || (! guildGreeting.message && ! guildGreeting.attachment)) return;

    function sendGreeting(message, file) {
      bot.getDMChannel(member.id).then(channel => {
        if (! channel) return;

        channel.createMessage(message || '', file)
          .catch(e => {
            if (e.code === 50007) return;
            throw e;
          });
      });
    }

    const greetingMessage = utils.readMultilineConfigValue(guildGreeting.message);

    if (guildGreeting.attachment) {
      const filename = path.basename(guildGreeting.attachment);
      fs.readFile(guildGreeting.attachment, (err, data) => {
        const file = {file: data, name: filename};
        sendGreeting(greetingMessage, file);
      });
    } else {
      sendGreeting(greetingMessage);
    }
  });
};
