const Knex = require("knex");

/**
 * @param {Knex} knex
 */
exports.up = async function(knex) {
  await knex.schema.table("thread_messages", table => {
    table.string("dm_channel_id", 20).nullable();
  });
};

/**
 * @param {Knex} knex
 */
exports.down = async function(knex) {
  await knex.schema.table("thread_messages", table => {
    table.dropColumn("dm_channel_id");
  });
};
