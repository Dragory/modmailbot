exports.up = async (knex) => {
    await knex.schema.table("threads", (table) => {
      table.boolean("isPrivate").defaultTo(0).after("scheduled_close_name");
    });
  };
  
  exports.down = async (knex) => {
    await knex.schema.table("threads", table => {
      table.dropColumn("isPrivate");
    });
  };