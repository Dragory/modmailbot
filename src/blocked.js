const jsonDb = require('./jsonDb');

/**
 * Checks whether userId is blocked
 * @param {String} userId
 * @returns {Promise<Boolean>}
 */
function isBlocked(userId) {
  return jsonDb.get('blocked', []).then(blocked => {
    return blocked.indexOf(userId) !== -1;
  });
}

/**
 * Blocks the given userId
 * @param {String} userId
 * @returns {Promise}
 */
function block(userId) {
  return jsonDb.get('blocked', []).then(blocked => {
    blocked.push(userId);
    return jsonDb.save('blocked', blocked);
  });
}

/**
 * Unblocks the given userId
 * @param {String} userId
 * @returns {Promise}
 */
function unblock(userId) {
  return jsonDb.get('blocked', []).then(blocked => {
    blocked.splice(blocked.indexOf(userId), 1);
    return jsonDb.save('blocked', blocked);
  });
}

module.exports = {
  isBlocked,
  block,
  unblock,
};
