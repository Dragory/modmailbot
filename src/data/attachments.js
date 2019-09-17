const Eris = require('eris');
const fs = require('fs');
const https = require('https');
const {promisify} = require('util');
const tmp = require('tmp');
const config = require('../config');
const utils = require('../utils');
const mv = promisify(require('mv'));

const getUtils = () => require('../utils');

const access = promisify(fs.access);
const readFile = promisify(fs.readFile);

const localAttachmentDir = config.attachmentDir || `${__dirname}/../../attachments`;

const attachmentSavePromises = {};

const attachmentStorageTypes = {};

function getErrorResult(msg = null) {
  return {
    url: `Attachment could not be saved${msg ? ': ' + msg : ''}`,
    failed: true
  };
}

/**
 * Attempts to download and save the given attachement
 * @param {Object} attachment
 * @param {Number=0} tries
 * @returns {Promise<{ url: string }>}
 */
async function saveLocalAttachment(attachment) {
  const targetPath = getLocalAttachmentPath(attachment.id);

  try {
    // If the file already exists, resolve immediately
    await access(targetPath);
    const url = await getLocalAttachmentUrl(attachment.id, attachment.filename);
    return { url };
  } catch (e) {}

  // Download the attachment
  const downloadResult = await downloadAttachment(attachment);

  // Move the temp file to the attachment folder
  await mv(downloadResult.path, targetPath);

  // Resolve the attachment URL
  const url = await getLocalAttachmentUrl(attachment.id, attachment.filename);

  return { url };
}

/**
 * @param {Object} attachment
 * @param {Number} tries
 * @returns {Promise<{ path: string, cleanup: function }>}
 */
function downloadAttachment(attachment, tries = 0) {
  return new Promise((resolve, reject) => {
    if (tries > 3) {
      console.error('Attachment download failed after 3 tries:', attachment);
      reject('Attachment download failed after 3 tries');
      return;
    }

    tmp.file((err, filepath, fd, cleanupCallback) => {
      const writeStream = fs.createWriteStream(filepath);

      https.get(attachment.url, (res) => {
        res.pipe(writeStream);
        writeStream.on('finish', () => {
          writeStream.end();
          resolve({
            path: filepath,
            cleanup: cleanupCallback
          });
        });
      }).on('error', (err) => {
        fs.unlink(filepath);
        console.error('Error downloading attachment, retrying');
        resolve(downloadAttachment(attachment, tries++));
      });
    });
  });
}

/**
 * Returns the filesystem path for the given attachment id
 * @param {String} attachmentId
 * @returns {String}
 */
function getLocalAttachmentPath(attachmentId) {
  return `${localAttachmentDir}/${attachmentId}`;
}

/**
 * Returns the self-hosted URL to the given attachment ID
 * @param {String} attachmentId
 * @param {String=null} desiredName Custom name for the attachment as a hint for the browser
 * @returns {Promise<String>}
 */
function getLocalAttachmentUrl(attachmentId, desiredName = null) {
  if (desiredName == null) desiredName = 'file.bin';
  return getUtils().getSelfUrl(`attachments/${attachmentId}/${desiredName}`);
}

/**
 * @param {Object} attachment
 * @returns {Promise<{ url: string }>}
 */
async function saveDiscordAttachment(attachment) {
  if (attachment.size > 1024 * 1024 * 8) {
    return getErrorResult('attachment too large (max 8MB)');
  }

  const attachmentChannelId = config.attachmentStorageChannelId;
  const inboxGuild = utils.getInboxGuild();

  if (! inboxGuild.channels.has(attachmentChannelId)) {
    throw new Error('Attachment storage channel not found!');
  }

  const attachmentChannel = inboxGuild.channels.get(attachmentChannelId);
  if (! (attachmentChannel instanceof Eris.TextChannel)) {
    throw new Error('Attachment storage channel must be a text channel!');
  }

  const file = await attachmentToDiscordFileObject(attachment);
  const savedAttachment = await createDiscordAttachmentMessage(attachmentChannel, file);
  if (! savedAttachment) return getErrorResult();

  return { url: savedAttachment.url };
}

async function createDiscordAttachmentMessage(channel, file, tries = 0) {
  tries++;

  try {
    const attachmentMessage = await channel.createMessage(undefined, file);
    return attachmentMessage.attachments[0];
  } catch (e) {
    if (tries > 3) {
      console.error(`Attachment storage message could not be created after 3 tries: ${e.message}`);
      return;
    }

    return createDiscordAttachmentMessage(channel, file, tries);
  }
}

/**
 * Turns the given attachment into a file object that can be sent forward as a new attachment
 * @param {Object} attachment
 * @returns {Promise<{file, name: string}>}
 */
async function attachmentToDiscordFileObject(attachment) {
  const downloadResult = await downloadAttachment(attachment);
  const data = await readFile(downloadResult.path);
  downloadResult.cleanup();
  return {file: data, name: attachment.filename};
}

/**
 * Saves the given attachment based on the configured storage system
 * @param {Object} attachment
 * @returns {Promise<{ url: string }>}
 */
function saveAttachment(attachment) {
  if (attachmentSavePromises[attachment.id]) {
    return attachmentSavePromises[attachment.id];
  }

  if (attachmentStorageTypes[config.attachmentStorage]) {
    attachmentSavePromises[attachment.id] = Promise.resolve(attachmentStorageTypes[config.attachmentStorage](attachment));
  } else {
    throw new Error(`Unknown attachment storage option: ${config.attachmentStorage}`);
  }

  attachmentSavePromises[attachment.id].then(() => {
    delete attachmentSavePromises[attachment.id];
  });

  return attachmentSavePromises[attachment.id];
}

function addStorageType(name, handler) {
  attachmentStorageTypes[name] = handler;
}

attachmentStorageTypes.local = saveLocalAttachment;
attachmentStorageTypes.discord = saveDiscordAttachment;

module.exports = {
  getLocalAttachmentPath,
  attachmentToDiscordFileObject,
  saveAttachment,
  addStorageType,
  downloadAttachment
};
