exports.up = async function(knex, Promise) {
  await knex.schema.createTableIfNotExists('threads', table => {
    table.string('id', 36).notNullable().primary();
    table.integer('status').unsigned().notNullable().index();
    table.integer('is_legacy').unsigned().notNullable();
    table.string('user_id', 20).notNullable().index();
    table.string('user_name', 128).notNullable();
    table.string('channel_id', 20).nullable().unique();
    table.dateTime('created_at').notNullable().index();
  });

  await knex.schema.createTableIfNotExists('thread_messages', table => {
    table.increments('id');
    table.string('thread_id', 36).notNullable().index().references('id').inTable('threads').onDelete('CASCADE');
    table.integer('message_type').unsigned().notNullable();
    table.string('user_id', 20).nullable();
    table.string('user_name', 128).notNullable();
    table.mediumtext('body').notNullable();
    table.integer('is_anonymous').unsigned().notNullable();
    table.string('dm_message_id', 20).nullable().unique();
    table.dateTime('created_at').notNullable().index();
  });

  await knex.schema.createTableIfNotExists('blocked_users', table => {
    table.string('user_id', 20).primary().notNullable();
    table.string('user_name', 128).notNullable();
    table.string('blocked_by', 20).nullable();
    table.dateTime('blocked_at').notNullable();
  });

  await knex.schema.createTableIfNotExists('snippets', table => {
    table.string('trigger', 32).primary().notNullable();
    table.text('body').notNullable();
    table.integer('is_anonymous').unsigned().notNullable();
    table.string('created_by', 20).nullable();
    table.dateTime('created_at').notNullable();
  });
};

exports.down = async function(knex, Promise) {
  await knex.schema.dropTableIfExists('thread_messages');
  await knex.schema.dropTableIfExists('threads');
  await knex.schema.dropTableIfExists('blocked_users');
  await knex.schema.dropTableIfExists('snippets');
};
