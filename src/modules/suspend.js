const moment = require("moment");
const threads = require("../data/threads");
const utils = require("../utils");

const {THREAD_STATUS} = require("../data/constants");
const {getOrFetchChannel} = require("../utils");

module.exports = ({ bot, knex, config, commands }) => {
  if (! config.allowSuspend) return;
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

  commands.addInboxThreadCommand("suspend cancel", [], async (msg, args, thread) => {
    // Cancel timed suspend
    if (thread.scheduled_suspend_at) {
      await thread.cancelScheduledSuspend();
      thread.postSystemMessage("Cancelled scheduled suspension");
    } else {
      thread.postSystemMessage("Thread is not scheduled to be suspended");
    }
  });

  commands.addInboxThreadCommand("suspend", "[delay:delay]", async (msg, args, thread) => {
    if (thread.status === THREAD_STATUS.SUSPENDED) {
      thread.postSystemMessage("Thread is already suspended.");
      return;
    }
    if (args.delay) {
      const suspendAt = moment.utc().add(args.delay, "ms");
      await thread.scheduleSuspend(suspendAt.format("YYYY-MM-DD HH:mm:ss"), msg.author);

      thread.postSystemMessage(`Thread will be suspended in ${utils.humanizeDelay(args.delay)}. Use \`${config.prefix}suspend cancel\` to cancel.`);

      return;
    }

    await thread.suspend();
    thread.postSystemMessage("**Thread suspended!** This thread will act as closed until unsuspended with `!unsuspend`");
  }, { allowSuspended: true });

  commands.addInboxServerCommand("unsuspend", [], async (msg, args, thread) => {
    if (thread) {
      thread.postSystemMessage("Thread is not suspended");
      return;
    }

    thread = await threads.findSuspendedThreadByChannelId(msg.channel.id);
    if (! thread) {
      const channel = await getOrFetchChannel(bot, msg.channel.id);
      channel.createMessage("Not in a thread");
      return;
    }

    const otherOpenThread = await threads.findOpenThreadByUserId(thread.user_id);
    if (otherOpenThread) {
      thread.postSystemMessage(`Cannot unsuspend; there is another open thread with this user: <#${otherOpenThread.channel_id}>`);
      return;
    }

    await thread.unsuspend();
    thread.postSystemMessage("**Thread unsuspended!**");
  });
};
