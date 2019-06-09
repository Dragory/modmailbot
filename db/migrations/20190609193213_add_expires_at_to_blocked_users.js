exports.up = async function(knex, Promise) {
  await knex.schema.table('blocked_users', table => {
    table.dateTime('expires_at').nullable();
  });
};

exports.down = async function(knex, Promise) {
  await knex.schema.table('blocked_users', table => {
    table.dropColumn('expires_at');
  });
};
