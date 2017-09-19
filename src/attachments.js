const Eris = require('eris');
const fs = require('fs');
const https = require('https');
const config = require('./config');

const getUtils = () => require('./utils');

const attachmentDir = config.attachmentDir || `${__dirname}/../attachments`;

/**
 * Returns the filesystem path for the given attachment id
 * @param {String} attachmentId
 * @returns {String}
 */
function getPath(attachmentId) {
  return `${attachmentDir}/${attachmentId}`;
}

/**
 * Attempts to download and save the given attachement
 * @param {Object} attachment
 * @param {Number=0} tries
 * @returns {Promise}
 */
function saveAttachment(attachment, tries = 0) {
  return new Promise((resolve, reject) => {
    if (tries > 3) {
      console.error('Attachment download failed after 3 tries:', attachment);
      reject('Attachment download failed after 3 tries');
      return;
    }

    const filepath = getPath(attachment.id);
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

/**
 * Attempts to download and save all attachments in the given message
 * @param {Eris.Message} msg
 * @returns {Promise}
 */
function saveAttachmentsInMessage(msg) {
  if (! msg.attachments || msg.attachments.length === 0) return Promise.resolve();
  return Promise.all(msg.attachments.map(saveAttachment));
}

/**
 * Returns the self-hosted URL to the given attachment ID
 * @param {String} attachmentId
 * @param {String=null} desiredName Custom name for the attachment as a hint for the browser
 * @returns {String}
 */
function getUrl(attachmentId, desiredName = null) {
  if (desiredName == null) desiredName = 'file.bin';
  return getUtils().getSelfUrl(`attachments/${attachmentId}/${desiredName}`);
}

module.exports = {
  getPath,
  saveAttachment,
  saveAttachmentsInMessage,
  getUrl,
};
