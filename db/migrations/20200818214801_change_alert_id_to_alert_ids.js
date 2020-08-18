exports.up = async function(knex) {
  await knex.schema.table("threads", table => {
    table.text("alert_ids").nullable();
  });

  await knex("threads")
    .update({
      alert_ids: knex.raw("alert_id"),
    });

  await knex.schema.table("threads", table => {
    table.dropColumn("alert_id");
  });
};

exports.down = async function(knex) {
  await knex.schema.table("threads", table => {
    table.dropColumn("alert_ids");
    table.text("alert_id").nullable();
  });
};
