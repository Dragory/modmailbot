
exports.up = async function(knex) {
    if (! await knex.schema.hasTable("name_prefixes")) {
        await knex.schema.createTable("name_prefixes", table => {
          table.string("user_id", 20);
          table.string("prefix", 48);
    
          table.primary(["user_id"]);
        });
    }
};

exports.down = async function(knex) {
    if (await knex.schema.hasTable("name_prefixes")) {
        await knex.schema.dropTable("name_prefixes");
    }
};
