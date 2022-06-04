
exports.up = async function(knex, Promise) {
  if (! await knex.schema.hasTable("notes")) {
    await knex.schema.createTable("notes", table => {
      table.string("user_id", 20).nullable();
      table.mediumtext("note").nullable();
    });
  }
};

exports.down = async function(knex, Promise) {
  if (await knex.schema.hasTable("notes")) {
    await knex.schema.dropTable("notes");
  }
};
