const Knex = require("knex");

/**
 * @param {Knex} knex
 */
exports.up = async function(knex) {
  await knex.schema.table("thread_messages", table => {
    table.string("inbox_message_id", 20).nullable().unique();
  });
};

/**
 * @param {Knex} knex
 */
exports.down = async function(knex) {
  await knex.schema.table("thread_messages", table => {
    table.dropColumn("inbox_message_id");
  });
};
