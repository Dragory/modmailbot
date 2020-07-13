/**
 * @callback BeforeNewThreadHook_SetCategoryId
 * @param {String} categoryId
 * @return void
 */

/**
 * @typedef BeforeNewThreadHookEvent
 * @property {Function} cancel
 * @property {BeforeNewThreadHook_SetCategoryId} setCategoryId
 *
 */

/**
 * @callback BeforeNewThreadHook
 * @param {BeforeNewThreadHookEvent} ev
 * @return {void|Promise<void>}
 */

/**
 * @type BeforeNewThreadHook[]
 */
const beforeNewThreadHooks = [];

/**
 * @param {BeforeNewThreadHook} fn
 */
function beforeNewThread(fn) {
  beforeNewThreadHooks.push(fn);
}

module.exports = {
  beforeNewThreadHooks,
  beforeNewThread,
};
