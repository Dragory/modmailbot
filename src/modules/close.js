const humanizeDuration = require('humanize-duration');
const moment = require('moment');
const Eris = require('eris');
const config = require('../config');
const utils = require('../utils');
const threads = require('../data/threads');
const blocked = require('../data/blocked');
const {messageQueue} = require('../queue');

module.exports = bot => {
  const humanizeDelay = (delay, opts = {}) => humanizeDuration(delay, Object.assign({conjunction: ' and '}, opts));

  // Check for threads that are scheduled to be closed and close them
  async function applyScheduledCloses() {
    const threadsToBeClosed = await threads.getThreadsThatShouldBeClosed();
    for (const thread of threadsToBeClosed) {
      if(config.closeMessage) await thread.postToUser(config.closeMessage).catch(() => {});
      await thread.close();

      const logUrl = await thread.getLogUrl();
      utils.postLog(utils.trimAll(`
        Modmail thread with ${thread.user_name} (${thread.user_id}) was closed as scheduled by ${thread.scheduled_close_name}
        Logs: ${logUrl}
      `));
    }
  }

  async function scheduledCloseLoop() {
    try {
      await applyScheduledCloses();
    } catch (e) {
      console.error(e);
    }

    setTimeout(scheduledCloseLoop, 2000);
  }

  scheduledCloseLoop();

  // Close a thread. Closing a thread saves a log of the channel's contents and then deletes the channel.
  bot.registerCommand('close', async (msg, args) => {
    let thread, closedBy;

    if (msg.channel instanceof Eris.PrivateChannel) {
      // User is closing the thread by themselves (if enabled)
      if (! config.allowUserClose) return;
      if (await blocked.isBlocked(msg.author.id)) return;

      thread = await threads.findOpenThreadByUserId(msg.author.id);
      if (! thread) return;

      // We need to add this operation to the message queue so we don't get a race condition
      // between showing the close command in the thread and closing the thread
      await messageQueue.add(async () => {
        thread.postSystemMessage('Thread closed by user, closing...');
        await thread.close(true);
      });

      closedBy = 'the user';
    } else {
      // A staff member is closing the thread
      if (! utils.messageIsOnInboxServer(msg)) return;
      if (! utils.isStaff(msg.member)) return;

      thread = await threads.findOpenThreadByChannelId(msg.channel.id);
      if (! thread) return;

      // Timed close
      if (args.length) {
        if (args[0].startsWith('c')) {
          // Cancel timed close
          if (thread.scheduled_close_at) {
            await thread.cancelScheduledClose();
            thread.postSystemMessage(`Cancelled scheduled closing`);
          }

          return;
        }

        // Set a timed close
        const delay = utils.convertDelayStringToMS(args.join(' '));
        if (delay === 0 || delay === null) {
          thread.postSystemMessage(`Invalid delay specified. Format: "1h30m"`);
          return;
        }

        const closeAt = moment.utc().add(delay, 'ms');
        await thread.scheduleClose(closeAt.format('YYYY-MM-DD HH:mm:ss'), msg.author);
        thread.postSystemMessage(`Thread is now scheduled to be closed in ${humanizeDelay(delay)}. Use \`${config.prefix}close cancel\` to cancel.`);

        return;
      }

      // Regular close
      await thread.close();
      closedBy = msg.author.username;
    }

    if (config.closeMessage) {
      await thread.postToUser(config.closeMessage).catch(() => {});
    }

    const logUrl = await thread.getLogUrl();
    utils.postLog(utils.trimAll(`
      Modmail thread with ${thread.user_name} (${thread.user_id}) was closed by ${closedBy}
      Logs: ${logUrl}
    `));
  });

  // Auto-close threads if their channel is deleted
  bot.on('channelDelete', async (channel) => {
    if (! (channel instanceof Eris.TextChannel)) return;
    if (channel.guild.id !== utils.getInboxGuild().id) return;

    const thread = await threads.findOpenThreadByChannelId(channel.id);
    if (! thread) return;

    console.log(`[INFO] Auto-closing thread with ${thread.user_name} because the channel was deleted`);
    if (config.closeMessage) await thread.postToUser(config.closeMessage).catch(() => {});
    await thread.close(true);

    const logUrl = await thread.getLogUrl();
    utils.postLog(utils.trimAll(`
      Modmail thread with ${thread.user_name} (${thread.user_id}) was closed automatically because the channel was deleted
      Logs: ${logUrl}
    `));
  });
};
