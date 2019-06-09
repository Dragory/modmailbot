exports.up = async function(knex, Promise) {
  if (! await knex.schema.hasTable('updates')) {
    await knex.schema.createTable('updates', table => {
      table.string('available_version', 16).nullable();
      table.dateTime('last_checked').nullable();
    });
  }
};

exports.down = async function(knex, Promise) {
  if (await knex.schema.hasTable('updates')) {
    await knex.schema.dropTable('updates');
  }
};
