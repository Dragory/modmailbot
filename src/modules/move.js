const config = require('../config');
const Eris = require('eris');
const transliterate = require("transliteration");
const erisEndpoints = require('eris/lib/rest/Endpoints');

module.exports = (bot, knex, config, commands) => {
  if (! config.allowMove) return;

  commands.addInboxThreadCommand('move', '<category:string$>', async (msg, args, thread) => {
    const searchStr = args.category;
    const normalizedSearchStr = transliterate.slugify(searchStr);

    const categories = msg.channel.guild.channels.filter(c => {
      // Filter to categories that are not the thread's current parent category
      return (c instanceof Eris.CategoryChannel) && (c.id !== msg.channel.parentID);
    });

    if (categories.length === 0) return;

    // See if any category name contains a part of the search string
    const containsRankings = categories.map(cat => {
      const normalizedCatName = transliterate.slugify(cat.name);

      let i = 0;
      do {
        if (! normalizedCatName.includes(normalizedSearchStr.slice(0, i + 1))) break;
        i++;
      } while (i < normalizedSearchStr.length);

      if (i > 0 && normalizedCatName.startsWith(normalizedSearchStr.slice(0, i))) {
        // Slightly prioritize categories that *start* with the search string
        i += 0.5;
      }

      return [cat, i];
    });

    // Sort by best match
    containsRankings.sort((a, b) => {
      return a[1] > b[1] ? -1 : 1;
    });

    if (containsRankings[0][1] === 0) {
      thread.postSystemMessage('No matching category');
      return;
    }

    const targetCategory = containsRankings[0][0];

    try {
      await bot.editChannel(thread.channel_id, {
        parentID: targetCategory.id
      });
    } catch (e) {
      thread.postSystemMessage(`Failed to move thread: ${e.message}`);
      return;
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
        await bot.requestHandler.request("PATCH", erisEndpoints.CHANNEL(thread.channel_id), true, {
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
