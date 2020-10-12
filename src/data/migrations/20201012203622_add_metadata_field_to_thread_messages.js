exports.up = async function(knex) {
  await knex.schema.table("thread_messages", table => {
    table.text("metadata").nullable().defaultTo(null);
  });
};

exports.down = async function(knex) {
  await knex.schema.table("thread_messages", table => {
    table.dropColumn("metadata");
  });
};
