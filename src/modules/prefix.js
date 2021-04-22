const prefixes = require("../data/prefixes");
const MAX_PREFIX_LENGTH = 48;

module.exports = ({ config, commands }) => {
  commands.addInboxServerCommand("setprefix", "<prefix:string>", async (msg, args) => {
    if (config.allowPrefix) {
      if (args.prefix.length > MAX_PREFIX_LENGTH) {
        await msg.channel.createMessage("Prefix must be 48 characters at most");
        return;
      }
      await prefixes.setPrefix(msg.author.id, args.prefix);

      await msg.channel.createMessage(`Set your reply prefix to \`${args.prefix}\``);
    }
  });

  commands.addInboxServerCommand("removeprefix", "", async (msg) => {
    if (config.allowPrefix) {
      await prefixes.removePrefix(msg.author.id);

      await msg.channel.createMessage("Removed your reply prefix");
    }
  });

  commands.addInboxServerCommand("prefix", "", async (msg) => {
    if (config.allowPrefix) {
      const prefix = await prefixes.getPrefix(msg.author.id);

      if (prefix != "") {
        await msg.channel.createMessage(`Your current prefix is \`${prefix}\``);
      } else {
        await msg.channel.createMessage("You currently do not have a reply prefix");
      }
    }
  });
};
