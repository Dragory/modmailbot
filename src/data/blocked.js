const moment = require("moment");
const knex = require("../knex");

/**
 * @param {String} userId
 * @returns {Promise<{ isBlocked: boolean, expiresAt: string }>}
 */
async function getBlockStatus(userId) {
  const row = await knex("blocked_users")
    .where("user_id", userId)
    .first();

  return {
    isBlocked: !! row,
    expiresAt: row && row.expires_at
  };
}

/**
 * Checks whether userId is blocked
 * @param {String} userId
 * @returns {Promise<Boolean>}
 */
async function isBlocked(userId) {
  return (await getBlockStatus(userId)).isBlocked;
}

/**
 * Blocks the given userId
 * @param {String} userId
 * @param {String} userName
 * @param {String} blockedBy
 * @returns {Promise}
 */
async function block(userId, userName = "", blockedBy = null, expiresAt = null) {
  if (await isBlocked(userId)) return;

  return knex("blocked_users")
    .insert({
      user_id: userId,
      user_name: userName,
      blocked_by: blockedBy,
      blocked_at: moment.utc().format("YYYY-MM-DD HH:mm:ss"),
      expires_at: expiresAt
    });
}

/**
 * Unblocks the given userId
 * @param {String} userId
 * @returns {Promise}
 */
async function unblock(userId) {
  return knex("blocked_users")
    .where("user_id", userId)
    .delete();
}

/**
 * Updates the expiry time of the block for the given userId
 * @param {String} userId
 * @param {String} expiresAt
 * @returns {Promise<void>}
 */
async function updateExpiryTime(userId, expiresAt) {
  return knex("blocked_users")
    .where("user_id", userId)
    .update({
      expires_at: expiresAt
    });
}

/**
 * @returns {String[]}
 */
async function getExpiredBlocks() {
  const now = moment.utc().format("YYYY-MM-DD HH:mm:ss");

  const blocks = await knex("blocked_users")
    .whereNotNull("expires_at")
    .where("expires_at", "<=", now)
    .select();

  return blocks.map(_block => _block.user_id);
}

module.exports = {
  getBlockStatus,
  isBlocked,
  block,
  unblock,
  updateExpiryTime,
  getExpiredBlocks,
};
