const Thread = require("./Thread");
const ThreadMessage = require("./ThreadMessage");
const utils = require("../utils");
const config = require("../cfg");
const { THREAD_STATUS } = require("./constants");
const path = require("path");
const fs = require("fs");
const { formatters } = require("../formatters");

/**
 * @typedef {object} LogStorageTypeHandler
 * @property {LogStorageTypeHandlerSaveFn?} save
 * @property {LogStorageTypeHandlerGetUrlFn?} getUrl
 * @property {LogStorageTypeHandlerGetFileFn?} getFile
 * @property {LogStorageTypeHandlerGetCustomResponseFn?} getCustomResponse
 */

/**
 * @callback LogStorageTypeHandlerSaveFn
 * @param {Thread} thread
 * @param {ThreadMessage[]} threadMessages
 * @return {void|Promise<void>}
 */

/**
 * @callback LogStorageTypeHandlerGetUrlFn
 * @param {string} threadId
 * @return {string|Promise<string>|null|Promise<null>}
 */

/**
 * @callback LogStorageTypeHandlerGetFileFn
 * @param {string} threadId
 * @return {Eris.MessageFile|Promise<Eris.MessageFile>|null|Promise<null>>}
 */

/**
 * @typedef {object} LogStorageTypeHandlerGetCustomResult
 * @property {Eris.MessageContent?} content
 * @property {Eris.MessageFile?} file
 */

/**
 * @callback LogStorageTypeHandlerGetCustomResponseFn
 * @param {string} threadId
 * @return {LogStorageTypeHandlerGetCustomResponseResult|Promise<LogStorageTypeHandlerGetCustomResponseResult>|null|Promise<null>>}
 */

/**
 * @callback AddLogStorageTypeFn
 * @param {string} name
 * @param {LogStorageTypeHandler} handler
 */

const logStorageTypes = {};

/**
 * @type AddLogStorageTypeFn
 */
const addStorageType = (name, handler) => {
  logStorageTypes[name] = handler;
};

/**
 * @callback SaveLogToStorageFn
 * @param {Thread} thread
 * @param {ThreadMessage[]} threadMessages
 * @returns {Promise<void>}
 */
/**
 * @type {SaveLogToStorageFn}
 */
const saveLogToStorage = async (thread, threadMessages) => {
  const { save } = logStorageTypes[config.logStorage];
  if (save) {
    await save(thread, threadMessages);
  }
};

/**
 * @callback GetLogUrlFn
 * @param {string} threadId
 * @returns {Promise<string|null>}
 */
/**
 * @type {GetLogUrlFn}
 */
const getLogUrl = async (threadId) => {
  const { getUrl } = logStorageTypes[config.logStorage];
  return getUrl
    ? getUrl(threadId)
    : null;
};

/**
 * @callback GetLogFileFn
 * @param {string} threadId
 * @returns {Promise<Eris.MessageFile|null>}
 */
/**
 * @type {GetLogFileFn}
 */
const getLogFile = async (threadId) => {
  const { getFile } = logStorageTypes[config.logStorage];
  return getFile
    ? getFile(threadId)
    : null;
};

/**
 * @callback GetLogCustomResponseFn
 * @param {string} threadId
 * @returns {Promise<LogStorageTypeHandlerGetCustomResult|null>}
 */
/**
 * @type {GetLogCustomResponseFn}
 */
const getLogCustomResponse = async (threadId) => {
  const { getCustomResponse } = logStorageTypes[config.logStorage];
  return getCustomResponse
    ? getCustomResponse(threadId)
    : null;
};

addStorageType("local", {
  getUrl(threadId) {
    return utils.getSelfUrl(`logs/${threadId}`);
  },
});

const getLogAttachmentFilename = threadId => {
  const filename = `${threadId}.txt`;
  const fullPath = path.resolve(config.logOptions.attachmentDirectory, filename);

  return { filename, fullPath };
};

addStorageType("attachment", {
  async save(thread, threadMessages) {
    const { fullPath } = getLogAttachmentFilename(thread.id);

    const formatLogResult = await formatters.formatLog(thread, threadMessages);
    fs.writeFileSync(fullPath, formatLogResult.content, { encoding: "utf8" });
  },

  async getUrl(threadId) {
    if (! config.logOptions.allowAttachmentUrlFallback) {
      return null;
    }

    const { fullPath } = getLogAttachmentFilename(threadId);
    try {
      fs.accessSync(fullPath);
      return null;
    } catch (e) {
      return utils.getSelfUrl(`logs/${threadId}`);
    }
  },

  async getFile(threadId) {
    const { filename, fullPath } = getLogAttachmentFilename(threadId);

    try {
      fs.accessSync(fullPath);
    } catch (e) {
      return null;
    }

    return {
      file: fs.readFileSync(fullPath, { encoding: "utf8" }),
      name: filename,
    };
  }
});

addStorageType("none", {});

module.exports = {
  addStorageType,
  saveLogToStorage,
  getLogUrl,
  getLogFile,
  getLogCustomResponse,
};
