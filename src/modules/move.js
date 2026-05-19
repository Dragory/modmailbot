const Eris = require("eris");
const threads = require("../data/threads");
const utils = require("../utils");
const { Routes } = require("discord-api-types/v10");

module.exports = ({ bot, knex, config, commands }) => {
  if (! config.allowMove) return;

  commands.addInboxThreadCommand("move", "<category:string$>", async (msg, args, thread) => {
    const searchStr = args.category;

    const categories = bot.guilds.get(msg.guildID).channels.filter(c => {
      if (config.allowedCategories && config.allowedCategories.length) {
        if (config.allowedCategories.find(id => id === c.id)) {
          return true;
        }

        return false;
      }
      // Filter to categories that are not the thread's current parent category
      return (c instanceof Eris.CategoryChannel) && (c.id !== msg.channel.parentID);
    });

    if (categories.length === 0) return;

     /**
     * @type {Eris.CategoryChannel}
     */
     const targetCategory = categories.find(c =>
      c.id == searchStr ||
      c.name.toLowerCase() === searchStr.toLowerCase() ||
      c.name.toLowerCase().startsWith(searchStr.toLowerCase()) ||
      c.name.toLowerCase().endsWith(searchStr.toLowerCase())
    );

    if (! targetCategory) {
      return utils.postError(msg.channel, "No matching category found.");
    }

    try {
      if(targetCategory.id === config.communityThreadCategoryId || targetCategory.id === config.categoryAutomation.newThread) {
        threads.moveThread(thread, targetCategory, false);
      } else {
        threads.moveThread(thread, targetCategory, true);
      }
    } catch (err) {
      console.log(err);
      return utils.postError(msg.channel, "Something went wrong while trying to move this thread.");
    }

    // If enabled, sync thread channel permissions with the category it's moved to
    if (config.syncPermissionsOnMove) {
      const newPerms = Array.from(targetCategory.permissionOverwrites.map(ow => {
        return {
          id: ow.id,
          type: ow.type,
          allow: ow.allow,
          deny: ow.deny
        };
      }));

      try {
        await bot.requestHandler.request("PATCH", Routes.channel(thread.channel_id), true, {
          permission_overwrites: newPerms
        });
      } catch (e) {
        thread.postSystemMessage(`Thread moved to ${targetCategory.name.toUpperCase()}, but failed to sync permissions: ${e.message}`);
        return;
      }
    }

    thread.postSystemMessage(`Thread moved to ${targetCategory.name.toUpperCase()}`);
  });
};
