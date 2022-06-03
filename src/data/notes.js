const moment = require("moment");
const knex = require("../knex");
const Note = require("./Note");

/**
 * @param {string} userId
 * @returns {Promise<Note[]>}
 */
async function findNotesByUserId(userId) {
  const rows = await knex("notes")
    .where("user_id", userId)
    .select();

  return rows.map(row => new Note(row));
}

/**
 * @param {number} id
 * @returns {Promise<Note|null>}
 */
async function findNote(id) {
  const row = await knex("notes")
    .where("id", id)
    .first();

  return row ? new Note(row) : null;
}

/**
 * @param {number} id
 * @returns {Promise<void>}
 */
async function deleteNote(id) {
  await knex("notes")
    .where("id", id)
    .delete();
}

/**
 * @param {string} userId
 * @param {string} authorId
 * @param {string} body
 * @returns {Promise<Note>}
 */
async function createUserNote(userId, authorId, body) {
  const createdRow = await knex("notes").insert({
    user_id: userId,
    author_id: authorId,
    body,
    created_at: moment.utc().format("YYYY-MM-DD HH:mm:ss"),
  });

  return new Note(createdRow);
}

module.exports = {
  findNotesByUserId,
  findNote,
  deleteNote,
  createUserNote,
};
