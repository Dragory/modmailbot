exports.up = async function(knex) {
  await knex.schema.table("threads", table => {
    table.integer("next_message_number").defaultTo(1);
  });
};

exports.down = async function(knex) {
  await knex.schema.table("threads", table => {
    table.dropColumn("next_message_number");
  });
};
