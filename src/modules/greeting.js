const path = require("path");
const fs = require("fs");
const config = require("../cfg");
const utils = require("../utils");

module.exports = ({ bot }) => {
  if (! config.enableGreeting) return;

  bot.on("guildMemberAdd", (guild, member) => {
    const serverGreeting = config.serverGreetings[guild.id];
    if (! serverGreeting || (! serverGreeting.message && ! serverGreeting.attachment)) return;

    function sendGreeting(message, file) {
      bot.getDMChannel(member.id).then(channel => {
        if (! channel) return;

        channel.createMessage(message || "", file)
          .catch(e => {
            if (e.code === 50007) return;
            throw e;
          });
      });
    }

    const greetingMessage = utils.readMultilineConfigValue(serverGreeting.message);

    if (serverGreeting.attachment) {
      const filename = path.basename(serverGreeting.attachment);
      fs.readFile(serverGreeting.attachment, (err, data) => {
        const file = {file: data, name: filename};
        sendGreeting(greetingMessage, file);
      });
    } else {
      sendGreeting(greetingMessage);
    }
  });
};
