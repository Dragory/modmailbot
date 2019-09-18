const config = require('../config');
const threads = require("../data/threads");
const Eris = require("eris");

module.exports = ({ bot }) => {
  // Typing proxy: forwarding typing events between the DM and the modmail thread
  if(config.typingProxy || config.typingProxyReverse) {
    bot.on("typingStart", async (channel, user) => {
      // config.typingProxy: forward user typing in a DM to the modmail thread
      if (config.typingProxy && (channel instanceof Eris.PrivateChannel)) {
        const thread = await threads.findOpenThreadByUserId(user.id);
        if (! thread) return;

        try {
          await bot.sendChannelTyping(thread.channel_id);
        } catch (e) {}
      }

      // config.typingProxyReverse: forward moderator typing in a thread to the DM
      else if (config.typingProxyReverse && (channel instanceof Eris.GuildChannel) && ! user.bot) {
        const thread = await threads.findByChannelId(channel.id);
        if (! thread) return;

        const dmChannel = await thread.getDMChannel();
        if (! dmChannel) return;

        try {
          await bot.sendChannelTyping(dmChannel.id);
        } catch(e) {}
      }
    });
  }
};
