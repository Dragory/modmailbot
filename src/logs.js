const fs = require('fs');
const crypto = require('crypto');
const moment = require('moment');
const config = require('./config');

const getUtils = () => require('./utils');

const logDir = config.logDir || `${__dirname}/../logs`;
const logFileFormatRegex = /^([0-9\-]+?)__([0-9]+?)__([0-9a-f]+?)\.txt$/;

/**
 * @typedef {Object} LogFileInfo
 * @property {String} filename
 * @property {String} date
 * @property {String} userId
 * @property {String} token
 * @property {String=} url
 */

/**
 * Returns information about the given logfile
 * @param {String} logFilename
 * @returns {LogFileInfo}
 */
function getLogFileInfo(logFilename) {
  const match = logFilename.match(logFileFormatRegex);
  if (! match) return null;

  const date = moment.utc(match[1], 'YYYY-MM-DD-HH-mm-ss').format('YYYY-MM-DD HH:mm:ss');

  return {
    filename: logFilename,
    date: date,
    userId: match[2],
    token: match[3],
  };
}

/**
 * Returns the filesystem path to the given logfile
 * @param {String} logFilename
 * @returns {String}
 */
function getLogFilePath(logFilename) {
  return `${logDir}/${logFilename}`;
}

/**
 * Returns the self-hosted URL to the given logfile
 * @param {String} logFilename
 * @returns {String}
 */
function getLogFileUrl(logFilename) {
  const info = getLogFileInfo(logFilename);
  return getUtils().getSelfUrl(`logs/${info.token}`);
}

/**
 * Returns a new, unique log file name for the given userId
 * @param {String} userId
 * @returns {Promise<String>}
 */
function getNewLogFile(userId) {
  return new Promise(resolve => {
    crypto.randomBytes(16, (err, buf) => {
      const token = buf.toString('hex');
      const date = moment.utc().format('YYYY-MM-DD-HH-mm-ss');

      resolve(`${date}__${userId}__${token}.txt`);
    });
  });
}

/**
 * Finds a log file name by its token
 * @param {String} token
 * @returns {Promise<String>}
 */
function findLogFile(token) {
  return new Promise(resolve => {
    fs.readdir(logDir, (err, files) => {
      for (const file of files) {
        if (file.endsWith(`__${token}.txt`)) {
          resolve(file);
          return;
        }
      }

      resolve(null);
    });
  });
}

/**
 * Returns all log file infos for the given userId
 * @param {String} userId
 * @returns {Promise<LogFileInfo[]>}
 */
function getLogsByUserId(userId) {
  return new Promise((resolve, reject) => {
    fs.readdir(logDir, (err, files) => {
      if (err) return reject(err);

      const logfileInfos = files
        .map(file => getLogFileInfo(file))
        .filter(info => info && info.userId === userId);

      resolve(logfileInfos);
    });
  });
}

/**
 * Returns all log file infos with URLs for the given userId
 * @param {String} userId
 * @returns {Promise<LogFileInfo[]>}
 */
function getLogsWithUrlByUserId(userId) {
  return getLogsByUserId(userId).then(infos => {
    const urlPromises = infos.map(info => {
      return getLogFileUrl(info.filename).then(url => {
        info.url = url;
        return info;
      });
    });

    return Promise.all(urlPromises).then(infos => {
      // Sort logs by date, in descending order
      infos.sort((a, b) => {
        if (a.date > b.date) return -1;
        if (a.date < b.date) return 1;
        return 0;
      });

      return infos;
    });
  });
}

/**
 * @param {String} logFilename
 * @param {String} content
 * @returns {Promise}
 */
function saveLogFile(logFilename, content) {
  return new Promise((resolve, reject) => {
    fs.writeFile(getLogFilePath(logFilename), content, {encoding: 'utf8'}, err => {
      if (err) return reject(err);
      resolve();
    });
  });
}

module.exports = {
  getLogFileInfo,
  getLogFilePath,
  getNewLogFile,
  findLogFile,
  getLogsByUserId,
  getLogsWithUrlByUserId,
  saveLogFile,
  getLogFileUrl,
};
