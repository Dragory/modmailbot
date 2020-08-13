exports.up = async function (knex, Promise) {
  await knex.schema.table("threads", table => {
    table.string("alert_id", 20).nullable().defaultTo(null).after("scheduled_close_name");
  });
};

exports.down = async function(knex, Promise) {
  await knex.schema.table("threads", table => {
    table.dropColumn("alert_id");
  });
};
