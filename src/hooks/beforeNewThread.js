const Eris = require("eris");

/**
 * @callback BeforeNewThreadHook_SetCategoryId
 * @param {String} categoryId
 * @return void
 */

/**
 * @typedef BeforeNewThreadHookData
 * @property {Eris.User} user
 * @property {CreateNewThreadForUserOpts} opts
 * @property {Function} cancel
 * @property {BeforeNewThreadHook_SetCategoryId} setCategoryId
 */

/**
 * @typedef BeforeNewThreadHookResult
 * @property {boolean} cancelled
 * @property {string|null} categoryId
 */

/**
 * @callback BeforeNewThreadHookData
 * @param {BeforeNewThreadHookData} data
 * @return {void|Promise<void>}
 */

/**
 * @type BeforeNewThreadHookData[]
 */
const beforeNewThreadHooks = [];

/**
 * @param {BeforeNewThreadHookData} fn
 */
function beforeNewThread(fn) {
  beforeNewThreadHooks.push(fn);
}

/**
 * @param {{
 *   user: Eris.User,
 *   opts: CreateNewThreadForUserOpts,
 * }} input
 * @return {Promise<BeforeNewThreadHookResult>}
 */
async function callBeforeNewThreadHooks(input) {
  /**
   * @type {BeforeNewThreadHookResult}
   */
  const result = {
    cancelled: false,
    categoryId: null,
  };

  /**
   * @type {BeforeNewThreadHookData}
   */
  const data = {
    ...input,

    cancel() {
      result.cancelled = true;
    },

    setCategoryId(value) {
      result.categoryId = value;
    },
  };

  for (const hook of beforeNewThreadHooks) {
    await hook(data);
  }

  return result;
}

module.exports = {
  beforeNewThread,
  callBeforeNewThreadHooks,
};
