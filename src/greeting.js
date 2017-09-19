const path = require('path');
const fs = require('fs');
const config = require('./config');

const greetingGuildId = config.mainGuildId || config.greetingGuildId;

function init(bot) {
  if (! config.enableGreeting) return;

  bot.on('guildMemberAdd', (guild, member) => {
    if (guild.id !== greetingGuildId) return;

    function sendGreeting(file) {
      bot.getDMChannel(member.id).then(channel => {
        if (! channel) return;
        channel.createMessage(config.greetingMessage || '', file);
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
}

module.exports = {
  init,
};
