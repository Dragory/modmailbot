const fs = require('fs');
const crypto = require('crypto');
const moment = require('moment');
const config = require('../config');

const logDir = config.logDir || `${__dirname}/logs`;
const logFileFormatRegex = /^([0-9\-]+?)__([0-9]+?)__([0-9a-f]+?)\.txt$/;

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

function getLogFilePath(logFilename) {
  return `${logDir}/${logFilename}`;
}

function getLogFileUrl(logFilename) {
  const info = getLogFileInfo(logFilename);
  return utils.getSelfUrl(`logs/${info.token}`);
}

function getNewLogFile(userId) {
  return new Promise(resolve => {
    crypto.randomBytes(16, (err, buf) => {
      const token = buf.toString('hex');
      const date = moment.utc().format('YYYY-MM-DD-HH-mm-ss');

      resolve(`${date}__${userId}__${token}.txt`);
    });
  });
}

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

function getLogsByUserId(userId) {
  return new Promise(resolve => {
    fs.readdir(logDir, (err, files) => {
      const logfileInfos = files
        .map(file => getLogFileInfo(file))
        .filter(info => info && info.userId === userId);

      resolve(logfileInfos);
    });
  });
}

function getLogsWithUrlByUserId(userId) {
  return getLogsByUserId(userId).then(infos => {
    const urlPromises = infos.map(info => {
      return getLogFileUrl(info.filename).then(url => {
        info.url = url;
        return info;
      });
    });

    return Promise.all(urlPromises).then(infos => {
      infos.sort((a, b) => {
        if (a.date > b.date) return 1;
        if (a.date < b.date) return -1;
        return 0;
      });

      return infos;
    });
  });
}

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
};
