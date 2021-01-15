exports.up = async function(knex) {
  await knex.schema.table("threads", table => {
    table.integer("thread_number");
    table.unique("thread_number");
  });
};

exports.down = async function(knex) {
  await knex.schema.table("threads", table => {
    table.dropColumn("thread_number");
  });
};
