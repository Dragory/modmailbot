exports.up = async function(knex) {
  await knex.schema.table("thread_messages", table => {
    table.string("role_name", 255).nullable();
    table.text("attachments").nullable();
    table.text("small_attachments").nullable();
    table.boolean("use_legacy_format").nullable();
  });

  await knex("thread_messages").update({
    use_legacy_format: 1,
  });
};

exports.down = async function(knex) {
  await knex.schema.table("thread_messages", table => {
    table.dropColumn("role_name");
    table.dropColumn("attachments");
    table.dropColumn("small_attachments");
    table.dropColumn("use_legacy_format");
  });
};
