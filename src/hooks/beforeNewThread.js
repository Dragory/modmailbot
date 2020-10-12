const Eris = require("eris");

/**
 * @callback BeforeNewThreadHook_SetCategoryId
 * @param {String} categoryId
 * @return void
 */

/**
 * @typedef BeforeNewThreadHookData
 * @property {Eris.User} user
 * @property {Eris.Message} [message]
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
 * @callback BeforeNewThreadHookFn
 * @param {BeforeNewThreadHookData} data
 * @return {void|Promise<void>}
 */

/**
 * @callback AddBeforeNewThreadHookFn
 * @param {BeforeNewThreadHookFn} fn
 * @return {void}
 */

/**
 * @type BeforeNewThreadHookFn[]
 */
const beforeNewThreadHooks = [];

/**
 * @type {AddBeforeNewThreadHookFn}
 */
let beforeNewThread; // Workaround to inconsistent IDE bug with @type and anonymous functions
beforeNewThread = (fn) => {
  beforeNewThreadHooks.push(fn);
};

/**
 * @param {{
 *   user: Eris.User,
 *   message?: Eris.Message,
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
