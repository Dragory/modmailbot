const http = require('http');
const mime = require('mime');
const url = require('url');
const fs = require('fs');
const config = require('./config');
const logs = require('./logs');
const attachments = require('./attachments');

const port = config.port || 8890;

function serveLogs(res, pathParts) {
  const token = pathParts[pathParts.length - 1];
  if (token.match(/^[0-9a-f]+$/) === null) return res.end();

  logs.findLogFile(token).then(logFilename => {
    if (logFilename === null) return res.end();

    fs.readFile(logs.getLogFilePath(logFilename), {encoding: 'utf8'}, (err, data) => {
      if (err) {
        res.statusCode = 404;
        res.end('Log not found');
        return;
      }

      res.setHeader('Content-Type', 'text/plain; charset=UTF-8');
      res.end(data);
    });
  });
}

function serveAttachments(res, pathParts) {
  const desiredFilename = pathParts[pathParts.length - 1];
  const id = pathParts[pathParts.length - 2];

  if (id.match(/^[0-9]+$/) === null) return res.end();
  if (desiredFilename.match(/^[0-9a-z\._-]+$/i) === null) return res.end();

  const attachmentPath = attachments.getPath(id);
  fs.access(attachmentPath, (err) => {
    if (err) {
      res.statusCode = 404;
      res.end('Attachment not found');
      return;
    }

    const filenameParts = desiredFilename.split('.');
    const ext = (filenameParts.length > 1 ? filenameParts[filenameParts.length - 1] : 'bin');
    const fileMime = mime.lookup(ext);

    res.setHeader('Content-Type', fileMime);

    const read = fs.createReadStream(attachmentPath);
    read.pipe(res);
  })
}

function run() {
  const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(`http://${req.url}`);
    const pathParts = parsedUrl.path.split('/').filter(v => v !== '');

    if (parsedUrl.path.startsWith('/logs/')) serveLogs(res, pathParts);
    if (parsedUrl.path.startsWith('/attachments/')) serveAttachments(res, pathParts);
  });

  server.listen(port);
}

module.exports = {
  run,
};
