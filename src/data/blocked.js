const moment = require('moment');
const knex = require('../knex');

/**
 * Checks whether userId is blocked
 * @param {String} userId
 * @returns {Promise<Boolean>}
 */
async function isBlocked(userId) {
  const row = await knex('blocked_users')
    .where('user_id', userId)
    .first();

  return !! row;
}

/**
 * Blocks the given userId
 * @param {String} userId
 * @param {String} userName
 * @param {String} blockedBy
 * @returns {Promise}
 */
async function block(userId, userName = '', blockedBy = null) {
  if (await isBlocked(userId)) return;

  return knex('blocked_users')
    .insert({
      user_id: userId,
      user_name: userName,
      blocked_by: blockedBy,
      blocked_at: moment.utc().format('YYYY-MM-DD HH:mm:ss')
    });
}

/**
 * Unblocks the given userId
 * @param {String} userId
 * @returns {Promise}
 */
async function unblock(userId) {
  return knex('blocked_users')
    .where('user_id', userId)
    .delete();
}

module.exports = {
  isBlocked,
  block,
  unblock,
};
