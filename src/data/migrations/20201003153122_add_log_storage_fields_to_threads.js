exports.up = async function(knex) {
  await knex.schema.table("threads", table => {
    table.string("log_storage_type", 255).nullable().defaultTo(null);
    table.text("log_storage_data").nullable().defaultTo(null);
  });
};

exports.down = async function(knex) {
  await knex.schema.table("threads", table => {
    table.dropColumn("log_storage_type");
    table.dropColumn("log_storage_data");
  });
};
