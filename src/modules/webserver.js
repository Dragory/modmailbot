/* eslint-disable space-unary-ops */
const { formatters } = require('../formatters');
const attachments = require('../data/attachments');
const express = require('express');
const fs = require('fs');
const helmet = require('helmet');
const mime = require('mime');
const threads = require('../data/threads');

function notfound(res) {
	res.status(404).send('Page Not Found');
}

/**
 * @param {express.Request} req
 * @param {express.Response} res
 */
async function serveLogs(req, res) {
	const thread = await threads.findById(req.params.threadId);
	if (!thread) return notfound(res);

	const threadMessages = await thread.getThreadMessages();
	const formatLogResult = await formatters.formatLog(thread, threadMessages, {
		simple: Boolean(req.query.simple),
		verbose: Boolean(req.query.verbose),
	});
	const contentType = formatLogResult.extra && formatLogResult.extra.contentType || 'text/plain; charset=UTF-8';
	res.set('Content-Type', contentType);
	res.send(formatLogResult.content);
}

function serveAttachments(req, res) {
	if (req.params.attachmentId.match(/^[0-9]+$/) === null) return notfound(res);
	if (req.params.filename.match(/^[0-9a-z._-]+$/i) === null) return notfound(res);

	const attachmentPath = attachments.getLocalAttachmentPath(req.params.attachmentId);
	fs.access(attachmentPath, (err) => {
		if (err) return notfound(res);

		const filenameParts = req.params.filename.split('.');
		const ext = (filenameParts.length > 1 ? filenameParts[filenameParts.length - 1] : 'bin');
		const fileMime = mime.getType(ext);
		res.set('Content-Type', fileMime);

		const read = fs.createReadStream(attachmentPath);
		read.pipe(res);
	});
}

const server = express();
server.use(helmet());
server.get('/logs/:threadId', serveLogs);
server.get('/attachments/:attachmentId/:filename', serveAttachments);
server.on('error', err => {
	console.log('[WARN] Web server error:', err.message);
});

module.exports = server;
