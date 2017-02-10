const fs = require('fs');
const https = require('https');
const config = require('../config');
const utils = require('./utils');

const attachmentDir = config.attachmentDir || `${__dirname}/attachments`;

function getAttachmentPath(id) {
  return `${attachmentDir}/${id}`;
}

function saveAttachment(attachment, tries = 0) {
  return new Promise((resolve, reject) => {
    if (tries > 3) {
      console.error('Attachment download failed after 3 tries:', attachment);
      reject('Attachment download failed after 3 tries');
      return;
    }

    const filepath = getAttachmentPath(attachment.id);
    const writeStream = fs.createWriteStream(filepath);

    https.get(attachment.url, (res) => {
      res.pipe(writeStream);
      writeStream.on('finish', () => {
        writeStream.close()
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath);
      console.error('Error downloading attachment, retrying');
      resolve(saveAttachment(attachment));
    });
  });
}

function saveAttachments(msg) {
  if (! msg.attachments || msg.attachments.length === 0) return Promise.resolve();
  return Promise.all(msg.attachments.map(saveAttachment));
}

function getAttachmentUrl(id, desiredName) {
  if (desiredName == null) desiredName = 'file.bin';
  return utils.getSelfUrl(`attachments/${id}/${desiredName}`);
}

module.exports = {
  getAttachmentPath,
  saveAttachment,
  saveAttachments,
  getAttachmentUrl,
};
