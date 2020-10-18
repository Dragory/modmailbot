exports.up = async function(knex) {
  await knex.schema.table("thread_messages", table => {
    table.text("temp_body");
  });

  await knex.raw("UPDATE thread_messages SET temp_body = body");

  await knex.schema.table("thread_messages", table => {
    table.dropColumn("body");
  });

  await knex.schema.table("thread_messages", table => {
    table.renameColumn("temp_body", "body");
  });
};

exports.down = async function(knex) {

};
