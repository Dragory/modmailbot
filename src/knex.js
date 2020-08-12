const config = require("./cfg");
module.exports = require("knex")(config.knex);
