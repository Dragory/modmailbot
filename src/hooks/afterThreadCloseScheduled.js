/* eslint-disable prefer-const */
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
// Workaround to inconsistent IDE bug with @type and anonymous functions
let afterThreadCloseScheduled;
afterThreadCloseScheduled = (fn) => {
	afterThreadCloseScheduledHooks.push(fn);
};

/**
 * @param {AfterThreadCloseScheduledHookData} input
 * @return {Promise<void>}
 */
async function callAfterThreadCloseScheduledHooks(input) {
	for (const hook of afterThreadCloseScheduledHooks) await hook(input);
}

module.exports = {
	afterThreadCloseScheduled: afterThreadCloseScheduled,
	callAfterThreadCloseScheduledHooks: callAfterThreadCloseScheduledHooks,
};
