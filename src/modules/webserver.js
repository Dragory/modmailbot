const http = require("http");
const mime = require("mime");
const url = require("url");
const fs = require("fs");
const qs = require("querystring");
const moment = require("moment");
const config = require("../cfg");
const threads = require("../data/threads");
const attachments = require("../data/attachments");
const { formatters } = require("../formatters");

function notfound(res) {
  res.statusCode = 404;
  res.end("Page Not Found");
}

async function serveLogs(req, res, pathParts, query) {
  const threadId = pathParts[pathParts.length - 1];
  if (threadId.match(/^[0-9a-f\-]+$/) === null) return notfound(res);

  const thread = await threads.findById(threadId);
  if (! thread) return notfound(res);

  let threadMessages = await thread.getThreadMessages();

  const formatLogResult = await formatters.formatLog(thread, threadMessages, {
    simple: Boolean(query.simple),
    verbose: Boolean(query.verbose),
  });

  const contentType = formatLogResult.extra && formatLogResult.extra.contentType || "text/plain; charset=UTF-8";

  res.setHeader("Content-Type", contentType);
  res.end(formatLogResult.content);
}

function serveAttachments(req, res, pathParts) {
  const desiredFilename = pathParts[pathParts.length - 1];
  const id = pathParts[pathParts.length - 2];

  if (id.match(/^[0-9]+$/) === null) return notfound(res);
  if (desiredFilename.match(/^[0-9a-z._-]+$/i) === null) return notfound(res);

  const attachmentPath = attachments.getLocalAttachmentPath(id);
  fs.access(attachmentPath, (err) => {
    if (err) return notfound(res);

    const filenameParts = desiredFilename.split(".");
    const ext = (filenameParts.length > 1 ? filenameParts[filenameParts.length - 1] : "bin");
    const fileMime = mime.getType(ext);

    res.setHeader("Content-Type", fileMime);

    const read = fs.createReadStream(attachmentPath);
    read.pipe(res);
  })
}

module.exports = () => {
  const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(`http://${req.url}`);
    const pathParts = parsedUrl.pathname.split("/").filter(v => v !== "");
    const query = qs.parse(parsedUrl.query);

    if (parsedUrl.pathname.startsWith("/logs/")) {
      serveLogs(req, res, pathParts, query);
    } else if (parsedUrl.pathname.startsWith("/attachments/")) {
      serveAttachments(req, res, pathParts, query);
    } else {
      notfound(res);
    }
  });

  server.on("error", err => {
    console.log("[WARN] Web server error:", err.message);
  });

  server.listen(config.port);
};
