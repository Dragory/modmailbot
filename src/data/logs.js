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
 * @property {LogStorageTypeHandlerSaveFn} save
 * @property {LogStorageTypeHandlerShouldSaveFn?} shouldSave
 * @property {LogStorageTypeHandlerGetUrlFn?} getUrl
 * @property {LogStorageTypeHandlerGetFileFn?} getFile
 * @property {LogStorageTypeHandlerGetCustomResponseFn?} getCustomResponse
 */

/**
 * @callback LogStorageTypeHandlerSaveFn
 * @param {Thread} thread
 * @param {ThreadMessage[]} threadMessages
 * @return {Object|Promise<Object>|null|Promise<null>} Information about the saved log that can be used to retrieve the log later
 */

/**
 * @callback LogStorageTypeHandlerShouldSaveFn
 * @param {Thread} thread
 * @return {boolean|Promise<boolean>} Whether the log should be saved at this time
 */

/**
 * @callback LogStorageTypeHandlerGetUrlFn
 * @param {Thread} thread
 * @return {string|Promise<string>|null|Promise<null>}
 */

/**
 * @callback LogStorageTypeHandlerGetFileFn
 * @param {Thread} thread
 * @return {Eris.MessageFile|Promise<Eris.MessageFile>|null|Promise<null>>}
 */

/**
 * @typedef {object} LogStorageTypeHandlerGetCustomResult
 * @property {Eris.MessageContent?} content
 * @property {Eris.MessageFile?} file
 */

/**
 * @callback LogStorageTypeHandlerGetCustomResponseFn
 * @param {Thread} thread
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
const saveLogToStorage = async (thread, overrideType = null) => {
  const storageType = overrideType || config.logStorage;

  const { save, shouldSave } = logStorageTypes[storageType] || {};
  if (shouldSave && ! await shouldSave(thread)) return;

  if (save) {
    const threadMessages = await thread.getThreadMessages();
    const storageData = await save(thread, threadMessages);
    await thread.updateLogStorageValues(storageType, storageData);
  }
};

/**
 * @callback GetLogUrlFn
 * @param {Thread} thread
 * @returns {Promise<string|null>}
 */
/**
 * @type {GetLogUrlFn}
 */
const getLogUrl = async (thread) => {
  if (! thread.log_storage_type) {
    await saveLogToStorage(thread);
  }

  const { getUrl } = logStorageTypes[thread.log_storage_type] || {};
  return getUrl
    ? getUrl(thread)
    : null;
};

/**
 * @callback GetLogFileFn
 * @param {Thread} thread
 * @returns {Promise<Eris.MessageFile|null>}
 */
/**
 * @type {GetLogFileFn}
 */
const getLogFile = async (thread) => {
  if (! thread.log_storage_type) {
    await saveLogToStorage(thread);
  }

  const { getFile } = logStorageTypes[thread.log_storage_type] || {};
  return getFile
    ? getFile(thread)
    : null;
};

/**
 * @callback GetLogCustomResponseFn
 * @param {Thread} threadId
 * @returns {Promise<LogStorageTypeHandlerGetCustomResult|null>}
 */
/**
 * @type {GetLogCustomResponseFn}
 */
const getLogCustomResponse = async (thread) => {
  if (! thread.log_storage_type) {
    await saveLogToStorage(thread);
  }

  const { getCustomResponse } = logStorageTypes[thread.log_storage_type] || {};
  return getCustomResponse
    ? getCustomResponse(thread)
    : null;
};

addStorageType("local", {
  save() {
    return null;
  },

  getUrl(thread) {
    return utils.getSelfUrl(`logs/${thread.id}`);
  },
});

const getLogAttachmentFilename = threadId => {
  const filename = `${threadId}.txt`;
  const fullPath = path.join(config.logOptions.attachmentDirectory, filename);

  return { filename, fullPath };
};

addStorageType("attachment", {
  shouldSave(thread) {
    return thread.status === THREAD_STATUS.CLOSED;
  },

  async save(thread, threadMessages) {
    const { fullPath, filename } = getLogAttachmentFilename(thread.id);

    const formatLogResult = await formatters.formatLog(thread, threadMessages);
    fs.writeFileSync(fullPath, formatLogResult.content, { encoding: "utf8" });

    return { fullPath, filename };
  },

  async getFile(thread) {
    const { fullPath, filename } = thread.log_storage_data || {};
    if (! fullPath) return;

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
