const http = require('http');
const mime = require('mime');
const url = require('url');
const fs = require('fs');
const moment = require('moment');
const config = require('../config');
const threads = require('../data/threads');
const attachments = require('../data/attachments');

const {THREAD_MESSAGE_TYPE} = require('../data/constants');

function notfound(res) {
  res.statusCode = 404;
  res.end('Page Not Found');
}

async function serveLogs(res, pathParts) {
  const threadId = pathParts[pathParts.length - 1];
  if (threadId.match(/^[0-9a-f\-]+$/) === null) return notfound(res);

  const thread = await threads.findById(threadId);
  if (! thread) return notfound(res);

  const threadMessages = await thread.getThreadMessages();
  const lines = threadMessages.map(message => {
    // Legacy messages are the entire log in one message, so just serve them as they are
    if (message.message_type === THREAD_MESSAGE_TYPE.LEGACY) {
      return message.body;
    }

    let line = `[${moment.utc(message.created_at).format('YYYY-MM-DD HH:mm:ss')}] `;

    if (message.message_type === THREAD_MESSAGE_TYPE.SYSTEM) {
      // System messages don't need the username
      line += message.body;
    } else if (message.message_type === THREAD_MESSAGE_TYPE.FROM_USER) {
      line += `[FROM USER] ${message.user_name}: ${message.body}`;
    } else if (message.message_type === THREAD_MESSAGE_TYPE.TO_USER) {
      line += `[TO USER] ${message.user_name}: ${message.body}`;
    } else {
      line += `${message.user_name}: ${message.body}`;
    }

    return line;
  });

  res.setHeader('Content-Type', 'text/plain; charset=UTF-8');
  res.end(lines.join('\n'));
}

function serveAttachments(res, pathParts) {
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
    const pathParts = parsedUrl.path.split('/').filter(v => v !== '');

    if (parsedUrl.path.startsWith('/logs/')) {
      serveLogs(res, pathParts);
    } else if (parsedUrl.path.startsWith('/attachments/')) {
      serveAttachments(res, pathParts);
    } else {
      notfound(res);
    }
  });

  server.on('error', err => {
    console.log('[WARN] Web server error:', err.message);
  });

  server.listen(config.port);
};
