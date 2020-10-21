exports.up = async function(knex, Promise) {
  if (! await knex.schema.hasTable("moderator_role_overrides")) {
    await knex.schema.createTable("moderator_role_overrides", table => {
      table.string("moderator_id", 20);
      table.string("thread_id", 36).nullable().defaultTo(null);
      table.string("role_id", 20);

      table.primary(["moderator_id", "thread_id"]);
    });
  }
};

exports.down = async function(knex, Promise) {
  if (await knex.schema.hasTable("moderator_role_overrides")) {
    await knex.schema.dropTable("moderator_role_overrides");
  }
};
