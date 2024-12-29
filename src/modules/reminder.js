const { CronJob } = require('cron');
const threads = require("../data/threads");

const reminderJobs = {};

async function loadReminders(knex, bot) {
  const reminders = await knex('reminders').select('*');
  for (const reminder of reminders) {
    const { id, thread_id, user_id, reminder_time, message } = reminder;
    const alertTime = new Date(reminder_time);
    const now = new Date();

    if (alertTime > now) {
      const cronTime = `${alertTime.getUTCMinutes()} ${alertTime.getUTCHours()} * * *`;
      const job = new CronJob(cronTime, async () => {
        const thread = await threads.findById(thread_id);
        if (thread) {
          await thread.postSystemMessage(`<@!${user_id}> Rappel : ${message}`);
        }
        job.stop();
        delete reminderJobs[id];
      }, null, true, 'UTC');

      reminderJobs[id] = job;
    }
  }
}

module.exports = async ({ bot, knex, config, commands }) => {

  await loadReminders(knex, bot);

  commands.addInboxThreadCommand("rem", [{name: "message", type: "string", catchAll: true}], async (msg, args, thread) => {
    
    const messageParts = args.message.split(" ");
    const timePart = messageParts.shift();
    const reminderMessage = messageParts.join(" ");

    const timeMatch = timePart.match(/^(\d{1,2}):(\d{2})$/);
    if (!timeMatch) {
      await thread.postSystemMessage("Incorrect format. Use: `!rem HH:MM message`");
      return;
    }

    const hour = parseInt(timeMatch[1], 10) - 2;
    const minute = parseInt(timeMatch[2], 10);
    const realHour = parseInt(timeMatch[1], 10);

    if (isNaN(hour) || hour < 0 || hour > 23 || isNaN(minute) || minute < 0 || minute > 59) {
      await thread.postSystemMessage("Invalid time. Use: `!rem HH:MM message`");
      return;
    }

    const now = new Date();
    let alertTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute);
    let realAlertTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), realHour, minute);

    if (alertTime < now) {
      alertTime.setDate(alertTime.getDate() + 1);
    }

    const alertTimeUtc = alertTime.toISOString();

    const [reminder] = await knex('reminders').insert({
      thread_id: thread.id,
      user_id: msg.author.id,
      reminder_time: alertTimeUtc,
      message: reminderMessage
    }).returning('id');

    const reminderId = reminder.id;

    const cronTime = `${minute} ${hour} * * *`;
    const job = new CronJob(cronTime, async () => {
      await thread.postSystemMessage(`⏰ **REMINDER** <@${msg.author.id}> : \n\n >>> ${reminderMessage}`, {
        allowedMentions: {
          users: [msg.author.id],
        },
      });
      job.stop();
      delete reminderJobs[reminderId];
    }, null, true, 'UTC');

    reminderJobs[reminderId] = job;

    await thread.postSystemMessage(`**⏰ Reminder set for ${realAlertTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} :** \n\n > ${reminderMessage} \n\n **(ID: ${reminderId})**`);
  }, { allowSuspended: true });

  commands.addInboxThreadCommand("delrem", [{name: "id", type: "number"}], async (msg, args, thread) => {
    await knex('reminders')
      .where({ id: args.id, thread_id: thread.id })
      .delete();

    if (reminderJobs[args.id]) {
      reminderJobs[args.id].stop();
      delete reminderJobs[args.id];
    }

    await thread.postSystemMessage(`The reminder with ID **${args.id}** has been deleted.`);
  }, { allowSuspended: true });

};
