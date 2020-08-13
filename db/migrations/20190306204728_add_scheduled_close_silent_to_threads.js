exports.up = async function(knex, Promise) {
  await knex.schema.table("threads", table => {
    table.integer("scheduled_close_silent").nullable().after("scheduled_close_name");
  });
};

exports.down = async function(knex, Promise) {
  await knex.schema.table("threads", table => {
    table.dropColumn("scheduled_close_silent");
  });
};
