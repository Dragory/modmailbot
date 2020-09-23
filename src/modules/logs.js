const threads = require("../data/threads");
const moment = require("moment");
const utils = require("../utils");
const { getLogUrl, getLogFile, getLogCustomResponse, saveLogToStorage } = require("../data/logs");

const LOG_LINES_PER_PAGE = 10;

module.exports = ({ bot, knex, config, commands, hooks }) => {
  const logsCmd = async (msg, args, thread) => {
    let userId = args.userId || (thread && thread.user_id);
    if (! userId) return;

    let userThreads = await threads.getClosedThreadsByUserId(userId);

    // Descending by date
    userThreads.sort((a, b) => {
      if (a.created_at > b.created_at) return -1;
      if (a.created_at < b.created_at) return 1;
      return 0;
    });

    // Pagination
    const totalUserThreads = userThreads.length;
    const maxPage = Math.ceil(totalUserThreads / LOG_LINES_PER_PAGE);
    const inputPage = args.page;
    const page = Math.max(Math.min(inputPage ? parseInt(inputPage, 10) : 1, maxPage), 1); // Clamp page to 1-<max page>
    const isPaginated = totalUserThreads > LOG_LINES_PER_PAGE;
    const start = (page - 1) * LOG_LINES_PER_PAGE;
    const end = page * LOG_LINES_PER_PAGE;
    userThreads = userThreads.slice((page - 1) * LOG_LINES_PER_PAGE, page * LOG_LINES_PER_PAGE);

    const threadLines = await Promise.all(userThreads.map(async thread => {
      const logUrl = await getLogUrl(thread.id);
      const formattedLogUrl = logUrl
        ? `<${logUrl}>`
        : `View log with \`${config.prefix}log ${thread.id}\``
      const formattedDate = moment.utc(thread.created_at).format("MMM Do [at] HH:mm [UTC]");
      return `\`${formattedDate}\`: ${formattedLogUrl}`;
    }));

    let message = isPaginated
      ? `**Log files for <@${userId}>** (page **${page}/${maxPage}**, showing logs **${start + 1}-${end}/${totalUserThreads}**):`
      : `**Log files for <@${userId}>:**`;

    message += `\n${threadLines.join("\n")}`;

    if (isPaginated) {
      message += "\nTo view more, add a page number to the end of the command";
    }

    // Send the list of logs in chunks of 15 lines per message
    const lines = message.split("\n");
    const chunks = utils.chunk(lines, 15);

    let root = Promise.resolve();
    chunks.forEach(lines => {
      root = root.then(() => msg.channel.createMessage(lines.join("\n")));
    });
  };

  const logCmd = async (msg, args, thread) => {
    const threadId = args.threadId || (thread && thread.id);
    if (! threadId) return;

    const customResponse = await getLogCustomResponse(threadId);
    if (customResponse && (customResponse.content || customResponse.file)) {
      msg.channel.createMessage(customResponse.content, customResponse.file);
    }

    const logUrl = await getLogUrl(threadId);
    if (logUrl) {
      msg.channel.createMessage(`Open the following link to view the log:\n<${logUrl}>`);
      return;
    }

    const logFile = await getLogFile(threadId);
    if (logFile) {
      msg.channel.createMessage("Download the following file to view the log:", logFile);
      return;
    }

    msg.channel.createMessage("This thread's logs are not currently available");
  };

  commands.addInboxServerCommand("logs", "<userId:userId> [page:number]", logsCmd);
  commands.addInboxServerCommand("logs", "[page:number]", logsCmd);

  commands.addInboxServerCommand("log", "[threadId:string]", logCmd);
  commands.addInboxServerCommand("loglink", "[threadId:string]", logCmd);

  hooks.afterThreadClose(async ({ threadId }) => {
    const thread = await threads.findById(threadId);
    const threadMessages = await thread.getThreadMessages();
    await saveLogToStorage(thread, threadMessages);
  });
};
