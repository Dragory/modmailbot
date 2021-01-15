exports.up = async function(knex) {
  await knex.schema.table("threads", table => {
    table.text("metadata").nullable().defaultTo(null);
  });
};

exports.down = async function(knex) {
  await knex.schema.table("threads", table => {
    table.dropColumn("metadata");
  });
};
