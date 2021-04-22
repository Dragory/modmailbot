const knex = require("../knex");
const config = require("../cfg");

/**
 * @param {String} userId
 * @returns {Promise<string>}
 */
 async function getPrefix(userId) {
  if (! config.allowPrefix || userId == null) return "";
  const prefixRow = await knex("name_prefixes")
    .where("user_id", userId)
    .first();

  return prefixRow ? prefixRow.prefix : "";
}

/**
 * Sets prefix for given userId
 * @param {String} userId
 * @param {String} prefix
 * @returns {Promise}
 */
async function setPrefix(userId, prefix) {
  if (! config.allowPrefix) return null;
  if (await getPrefix(userId)) {

    return knex("name_prefixes")
    .update({
      prefix,
    })
    .where({
      user_id: userId,
    });

  } else {

    return knex("name_prefixes")
    .insert({
      user_id: userId,
      prefix,
    });
  }
}

/**
 * Removes prefix of given userId
 * @param {String} userId
 * @returns {Promise}
 */
async function removePrefix(userId) {
  return knex("name_prefixes")
    .where("user_id", userId)
    .delete();
}

module.exports = {
  getPrefix,
  setPrefix,
  removePrefix,
};
