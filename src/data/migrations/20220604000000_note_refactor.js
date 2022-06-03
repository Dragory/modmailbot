exports.up = async function(knex, Promise) {
  if (await knex.schema.hasTable("notes")) {
    await knex.schema.dropTable("notes");
  }

  await knex.schema.createTable("notes", table => {
    table.increments("id");
    table.string("user_id", 20).nullable().index();
    table.string("author_id", 20).nullable().index();
    table.mediumtext("body").nullable();
    table.datetime("created_at");
  });
};

exports.down = async function(knex, Promise) {
  if (await knex.schema.hasTable("notes")) {
		await knex.schema.dropTable("notes");
	}

  // Create previous version of the notes table
  await knex.schema.createTable("notes", table => {
    table.string("user_id", 20).nullable();
    table.mediumtext("note").nullable();
  });
};
