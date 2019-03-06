const moment = require('moment');
const threadUtils = require('../threadUtils');
const threads = require("../data/threads");
const utils = require('../utils');
const config = require('../config');

const {THREAD_STATUS} = require('../data/constants');

module.exports = bot => {
  const addInboxServerCommand = (...args) => threadUtils.addInboxServerCommand(bot, ...args);

  // Check for threads that are scheduled to be suspended and suspend them
  async function applyScheduledSuspensions() {
    const threadsToBeSuspended = await threads.getThreadsThatShouldBeSuspended();
    for (const thread of threadsToBeSuspended) {
      if (thread.status === THREAD_STATUS.OPEN) {
        await thread.suspend();
        await thread.postSystemMessage(`**Thread suspended** as scheduled by ${thread.scheduled_suspend_name}. This thread will act as closed until unsuspended with \`!unsuspend\``);
      }
    }
  }

  async function scheduledSuspendLoop() {
    try {
      await applyScheduledSuspensions();
    } catch (e) {
      console.error(e);
    }

    setTimeout(scheduledSuspendLoop, 2000);
  }

  scheduledSuspendLoop();

  addInboxServerCommand('suspend', async (msg, args, thread) => {
    if (! thread) return;

    if (args.length) {
      // Cancel timed suspend
      if (args.includes('cancel') || args.includes('c')) {
        // Cancel timed suspend
        if (thread.scheduled_suspend_at) {
          await thread.cancelScheduledSuspend();
          thread.postSystemMessage(`Cancelled scheduled suspension`);
        }

        return;
      }

      // Timed suspend
      const delayStringArg = args.find(arg => utils.delayStringRegex.test(arg));
      if (delayStringArg) {
        const delay = utils.convertDelayStringToMS(delayStringArg);
        if (delay === 0 || delay === null) {
          thread.postSystemMessage(`Invalid delay specified. Format: "1h30m"`);
          return;
        }

        const suspendAt = moment.utc().add(delay, 'ms');
        await thread.scheduleSuspend(suspendAt.format('YYYY-MM-DD HH:mm:ss'), msg.author);

        thread.postSystemMessage(`Thread will be suspended in ${utils.humanizeDelay(delay)}. Use \`${config.prefix}suspend cancel\` to cancel.`);

        return;
      }
    }

    await thread.suspend();
    thread.postSystemMessage(`**Thread suspended!** This thread will act as closed until unsuspended with \`!unsuspend\``);
  });

  addInboxServerCommand('unsuspend', async msg => {
    const thread = await threads.findSuspendedThreadByChannelId(msg.channel.id);
    if (! thread) return;

    const otherOpenThread = await threads.findOpenThreadByUserId(thread.user_id);
    if (otherOpenThread) {
      thread.postSystemMessage(`Cannot unsuspend; there is another open thread with this user: <#${otherOpenThread.channel_id}>`);
      return;
    }

    await thread.unsuspend();
    thread.postSystemMessage(`**Thread unsuspended!**`);
  });
};
