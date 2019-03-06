exports.up = async function(knex, Promise) {
  await knex.schema.table('threads', table => {
    table.integer('scheduled_close_silent').nullable();
  });
};

exports.down = async function(knex, Promise) {
  await knex.schema.table('threads', table => {
    table.dropColumn('scheduled_close_silent');
  });
};
