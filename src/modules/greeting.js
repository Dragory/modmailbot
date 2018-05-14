const path = require('path');
const fs = require('fs');
const config = require('../config');

module.exports = bot => {
  if (! config.enableGreeting) return;

  const greetingGuilds = config.mainGuildId;

  bot.on('guildMemberAdd', (guild, member) => {
    if (! greetingGuilds.includes(guild.id)) return;

    function sendGreeting(file) {
      bot.getDMChannel(member.id).then(channel => {
        if (! channel) return;

        channel.createMessage(config.greetingMessage || '', file)
          .catch(e => {
            if (e.code === 50007) return;
            throw e;
          });
      });
    }

    if (config.greetingAttachment) {
      const filename = path.basename(config.greetingAttachment);
      fs.readFile(config.greetingAttachment, (err, data) => {
        const file = {file: data, name: filename};
        sendGreeting(file);
      });
    } else {
      sendGreeting();
    }
  });
};
