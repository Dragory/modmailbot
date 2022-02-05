const Eris = require("eris");

/**
 * @typedef AfterThreadCloseScheduledHookData
 * @property {Thread} thread
 */

/**
 * @callback AfterThreadCloseScheduledHookFn
 * @param {AfterThreadCloseScheduledHookData} data
 * @return {void|Promise<void>}
 */

/**
 * @callback AddAfterThreadCloseScheduledHookFn
 * @param {AfterThreadCloseScheduledHookFn} fn
 * @return {void}
 */

/**
 * @type AfterThreadCloseScheduledHookFn[]
 */
const afterThreadCloseScheduledHooks = [];

/**
 * @type {AddAfterThreadCloseScheduledHookFn}
 */
let afterThreadCloseScheduled; // Workaround to inconsistent IDE bug with @type and anonymous functions
afterThreadCloseScheduled = (fn) => {
  afterThreadCloseScheduledHooks.push(fn);
};

/**
 * @param {AfterThreadCloseScheduledHookData} input
 * @return {Promise<void>}
 */
async function callAfterThreadCloseScheduledHooks(input) {
  for (const hook of afterThreadCloseScheduledHooks) {
    await hook(input);
  }
}

module.exports = {
  afterThreadCloseScheduled: afterThreadCloseScheduled,
  callAfterThreadCloseScheduledHooks: callAfterThreadCloseScheduledHooks,
};
