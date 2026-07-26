const server = require("./webserver");
const utils = require("../utils");

module.exports = ({ config, bot, commands }) => {
  server.listen(config.port, config.host);

  commands.addInboxServerCommand("privacy_policy_link", "", async (msg, args, thread) => {
    const url = await utils.getSelfUrl("privacy-policy");
    utils.postSystemMessageWithFallback(msg.channel, thread, `<${url}>`);
  });
};
