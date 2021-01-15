exports.up = async function(knex) {
  const threads = await knex.table("threads")
    .orderBy("created_at", "ASC")
    .select(["id"]);

  let threadNumber = 0;
  for (const { id } of threads) {
    await knex.table("threads")
      .where("id", id)
      .update({ thread_number: ++threadNumber });
  }
};

exports.down = async function(knex) {
  // Nothing
};
