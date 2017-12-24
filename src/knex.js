const config = require('./config');
module.exports = require('knex')(config.knex);
