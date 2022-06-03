exports.up = async function(knex) {
  await knex.schema.renameTable("moderator_role_overrides", "old_moderator_role_overrides");

  await knex.schema.createTable("moderator_role_overrides", table => {
    table.increments("id");
    table.string("moderator_id", 20).notNullable();
    table.string("thread_id", 36).nullable().defaultTo(null);
    table.string("role_id", 20).notNullable();

    table.unique(["moderator_id", "thread_id"]);
  });

  const rows = await knex.table("old_moderator_role_overrides")
    .select();

  if (rows.length) {
    await knex.batchInsert('moderator_role_overrides', rows, 50);
  }

  await knex.schema.dropTable("old_moderator_role_overrides");
};

exports.down = async function(knex) {
  await knex.schema.renameTable("moderator_role_overrides", "new_moderator_role_overrides");

  await knex.schema.createTable("moderator_role_overrides", table => {
    table.string("moderator_id", 20);
    table.string("thread_id", 36).nullable().defaultTo(null);
    table.string("role_id", 20);

    table.primary(["moderator_id", "thread_id"]);
  });

  const rows = await knex.table("new_moderator_role_overrides")
    .select();

  if (rows.length) {
    await knex.table("moderator_role_overrides").insert(rows.map(r => {
      delete r.id;
      return r;
    }));
  }

  await knex.schema.dropTable("new_moderator_role_overrides");
};
