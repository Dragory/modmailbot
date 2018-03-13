const threadUtils = require('../threadUtils');
const threads = require("../data/threads");
const moment = require('moment');
const utils = require("../utils");

module.exports = bot => {
  const addInboxServerCommand = (...args) => threadUtils.addInboxServerCommand(bot, ...args);

  addInboxServerCommand('logs', (msg, args, thread) => {
    async function getLogs(userId) {
      const userThreads = await threads.getClosedThreadsByUserId(userId);

      // Descending by date
      userThreads.sort((a, b) => {
        if (a.created_at > b.created_at) return -1;
        if (a.created_at < b.created_at) return 1;
        return 0;
      });

      const threadLines = await Promise.all(userThreads.map(async thread => {
        const logUrl = await thread.getLogUrl();
        const formattedDate = moment.utc(thread.created_at).format('MMM Do [at] HH:mm [UTC]');
        return `\`${formattedDate}\`: <${logUrl}>`;
      }));

      const message = `**Log files for <@${userId}>:**\n${threadLines.join('\n')}`;

      // Send the list of logs in chunks of 15 lines per message
      const lines = message.split('\n');
      const chunks = utils.chunk(lines, 15);

      let root = Promise.resolve();
      chunks.forEach(lines => {
        root = root.then(() => msg.channel.createMessage(lines.join('\n')));
      });
    }

    if (args.length > 0) {
      // User mention/id as argument
      const userId = utils.getUserMention(args.join(' '));
      if (! userId) return;
      getLogs(userId);
    } else if (thread) {
      // Calling !logs without args in a modmail thread returns the logs of the user of that thread
      getLogs(thread.user_id);
    }
  });

  addInboxServerCommand('loglink', async (msg, args, thread) => {
    if (! thread) return;
    const logUrl = await thread.getLogUrl();
    thread.postSystemMessage(`Log URL: ${logUrl}`);
  });
};
