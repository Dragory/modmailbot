exports.up = async function(knex, Promise) {
  await knex.schema.createTableIfNotExists('threads', table => {
    table.string('id', 36).notNullable().primary();
    table.integer('status').unsigned().notNullable().index();
    table.integer('is_legacy').unsigned().notNullable();
    table.bigInteger('user_id').unsigned().notNullable().index();
    table.string('user_name', 128).notNullable();
    table.bigInteger('channel_id').unsigned().nullable().unique();
    table.dateTime('created_at').notNullable().index();
  });

  await knex.schema.createTableIfNotExists('thread_messages', table => {
    table.increments('id');
    table.string('thread_id', 36).notNullable().index().references('id').inTable('threads').onDelete('CASCADE');
    table.integer('message_type').unsigned().notNullable();
    table.bigInteger('user_id').unsigned().notNullable();
    table.string('user_name', 128).notNullable();
    table.text('body').notNullable();
    table.bigInteger('original_message_id').unsigned().nullable();
    table.dateTime('created_at').notNullable().index();
  });

  await knex.schema.createTableIfNotExists('blocked_users', table => {
    table.bigInteger('user_id').unsigned().primary().notNullable();
    table.string('user_name', 128).notNullable();
    table.bigInteger('blocked_by').unsigned().nullable();
    table.dateTime('blocked_at').notNullable();
  });

  await knex.schema.createTableIfNotExists('snippets', table => {
    table.string('trigger', 32).primary().notNullable();
    table.text('body').notNullable();
    table.integer('is_anonymous').unsigned().notNullable();
    table.bigInteger('created_by').unsigned().nullable();
    table.dateTime('created_at').notNullable();
  });
};

exports.down = async function(knex, Promise) {
  await knex.schema.dropTableIfExists('thread_messages');
  await knex.schema.dropTableIfExists('threads');
  await knex.schema.dropTableIfExists('blocked_users');
  await knex.schema.dropTableIfExists('snippets');
};
