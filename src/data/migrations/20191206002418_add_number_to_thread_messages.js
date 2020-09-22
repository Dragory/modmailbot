const Knex = require("knex");

/**
 * @param {Knex} knex
 */
exports.up = async function(knex) {
  await knex.schema.table("thread_messages", table => {
    table.integer("message_number").unsigned().nullable();
  });
};

/**
 * @param {Knex} knex
 */
exports.down = async function(knex) {
  await knex.schema.table("thread_messages", table => {
    table.dropColumn("message_number");
  });
};
