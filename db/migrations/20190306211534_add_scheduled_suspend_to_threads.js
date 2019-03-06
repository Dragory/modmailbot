exports.up = async function(knex, Promise) {
  await knex.schema.table('threads', table => {
    table.dateTime('scheduled_suspend_at').index().nullable().defaultTo(null).after('channel_id');
    table.string('scheduled_suspend_id', 20).nullable().defaultTo(null).after('channel_id');
    table.string('scheduled_suspend_name', 128).nullable().defaultTo(null).after('channel_id');
  });
};

exports.down = async function(knex, Promise) {
  await knex.schema.table('threads', table => {
    table.dropColumn('scheduled_suspend_at');
    table.dropColumn('scheduled_suspend_id');
    table.dropColumn('scheduled_suspend_name');
  });
};
