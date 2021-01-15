exports.up = async function(knex, Promise) {
  if (! await knex.schema.hasTable("threads")) {
    await knex.schema.createTable("threads", table => {
      table.string("id", 36).notNullable().primary();
      table.integer("status").unsigned().notNullable().index();
      table.integer("is_legacy").unsigned().notNullable();
      table.string("user_id", 20).notNullable().index();
      table.string("user_name", 128).notNullable();
      table.string("channel_id", 20).nullable().unique();
      table.dateTime("created_at").notNullable().index();
    });
  }

  if (! await knex.schema.hasTable("thread_messages")) {
    await knex.schema.createTable("thread_messages", table => {
      table.increments("id");
      table.string("thread_id", 36).notNullable().index().references("id").inTable("threads").onDelete("CASCADE");
      table.integer("message_type").unsigned().notNullable();
      table.string("user_id", 20).nullable();
      table.string("user_name", 128).notNullable();
      table.mediumtext("body").notNullable();
      table.integer("is_anonymous").unsigned().notNullable();
      table.string("dm_message_id", 20).nullable().unique();
      table.dateTime("created_at").notNullable().index();
    });
  }

  if (! await knex.schema.hasTable("blocked_users")) {
    await knex.schema.createTable("blocked_users", table => {
      table.string("user_id", 20).primary().notNullable();
      table.string("user_name", 128).notNullable();
      table.string("blocked_by", 20).nullable();
      table.dateTime("blocked_at").notNullable();
    });
  }

  if (! await knex.schema.hasTable("snippets")) {
    await knex.schema.createTable("snippets", table => {
      table.string("trigger", 32).primary().notNullable();
      table.text("body").notNullable();
      table.integer("is_anonymous").unsigned().notNullable();
      table.string("created_by", 20).nullable();
      table.dateTime("created_at").notNullable();
    });
  }
};

exports.down = async function(knex, Promise) {
  if (await knex.schema.hasTable("thread_messages")) {
    await knex.schema.dropTable("thread_messages");
  }

  if (await knex.schema.hasTable("threads")) {
    await knex.schema.dropTable("threads");
  }

  if (await knex.schema.hasTable("blocked_users")) {
    await knex.schema.dropTable("blocked_users");
  }

  if (await knex.schema.hasTable("snippets")) {
    await knex.schema.dropTable("snippets");
  }
};
