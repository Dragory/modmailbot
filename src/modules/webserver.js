const http = require('http');
const mime = require('mime');
const url = require('url');
const fs = require('fs');
const qs = require('querystring');
const moment = require('moment');
const config = require('../config');
const threads = require('../data/threads');
const attachments = require('../data/attachments');

const {THREAD_MESSAGE_TYPE} = require('../data/constants');

function notfound(res) {
  res.statusCode = 404;
  res.end('Page Not Found');
}

async function serveLogs(req, res, pathParts, query) {
  const threadId = pathParts[pathParts.length - 1];
  if (threadId.match(/^[0-9a-f\-]+$/) === null) return notfound(res);

  const thread = await threads.findById(threadId);
  if (! thread) return notfound(res);

  let threadMessages = await thread.getThreadMessages();

  if (query.simple) {
    threadMessages = threadMessages.filter(message => {
      return (
        message.message_type !== THREAD_MESSAGE_TYPE.SYSTEM
        && message.message_type !== THREAD_MESSAGE_TYPE.SYSTEM_TO_USER
        && message.message_type !== THREAD_MESSAGE_TYPE.CHAT
        && message.message_type !== THREAD_MESSAGE_TYPE.COMMAND
      );
    });
  }

  const lines = threadMessages.map(message => {
    // Legacy messages are the entire log in one message, so just serve them as they are
    if (message.message_type === THREAD_MESSAGE_TYPE.LEGACY) {
      return message.body;
    }

    let line = `[${moment.utc(message.created_at).format('YYYY-MM-DD HH:mm:ss')}]`;

    if (query.verbose) {
      if (message.dm_channel_id) {
        line += ` [DM CHA ${message.dm_channel_id}]`;
      }

      if (message.dm_message_id) {
        line += ` [DM MSG ${message.dm_message_id}]`;
      }
    }

    if (message.message_type === THREAD_MESSAGE_TYPE.FROM_USER) {
      line += ` [FROM USER] [${message.user_name}] ${message.body}`;
    } else if (message.message_type === THREAD_MESSAGE_TYPE.TO_USER) {
      line += ` [TO USER] [${message.user_name}] ${message.body}`;
    } else if (message.message_type === THREAD_MESSAGE_TYPE.SYSTEM) {
      line += ` [SYSTEM] ${message.body}`;
    } else if (message.message_type === THREAD_MESSAGE_TYPE.SYSTEM_TO_USER) {
      line += ` [SYSTEM TO USER] ${message.body}`;
    } else if (message.message_type === THREAD_MESSAGE_TYPE.CHAT) {
      line += ` [CHAT] [${message.user_name}] ${message.body}`;
    } else if (message.message_type === THREAD_MESSAGE_TYPE.COMMAND) {
      line += ` [COMMAND] [${message.user_name}] ${message.body}`;
    } else {
      line += ` [${message.user_name}] ${message.body}`;
    }

    return line;
  });

  const openedAt = moment(thread.created_at).format('YYYY-MM-DD HH:mm:ss');
  const header = `# Modmail thread with ${thread.user_name} (${thread.user_id}) started at ${openedAt}. All times are in UTC+0.`;

  const fullResponse = header + '\n\n' + lines.join('\n');

  res.setHeader('Content-Type', 'text/plain; charset=UTF-8');
  res.end(fullResponse);
}

function serveAttachments(req, res, pathParts) {
  const desiredFilename = pathParts[pathParts.length - 1];
  const id = pathParts[pathParts.length - 2];

  if (id.match(/^[0-9]+$/) === null) return notfound(res);
  if (desiredFilename.match(/^[0-9a-z._-]+$/i) === null) return notfound(res);

  const attachmentPath = attachments.getLocalAttachmentPath(id);
  fs.access(attachmentPath, (err) => {
    if (err) return notfound(res);

    const filenameParts = desiredFilename.split('.');
    const ext = (filenameParts.length > 1 ? filenameParts[filenameParts.length - 1] : 'bin');
    const fileMime = mime.getType(ext);

    res.setHeader('Content-Type', fileMime);

    const read = fs.createReadStream(attachmentPath);
    read.pipe(res);
  })
}

module.exports = () => {
  const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(`http://${req.url}`);
    const pathParts = parsedUrl.pathname.split('/').filter(v => v !== '');
    const query = qs.parse(parsedUrl.query);

    if (parsedUrl.pathname.startsWith('/logs/')) {
      serveLogs(req, res, pathParts, query);
    } else if (parsedUrl.pathname.startsWith('/attachments/')) {
      serveAttachments(req, res, pathParts, query);
    } else {
      notfound(res);
    }
  });

  server.on('error', err => {
    console.log('[WARN] Web server error:', err.message);
  });

  server.listen(config.port);
};
