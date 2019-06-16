const Eris = require('eris');
const config = require('./config');

const bot = new Eris.Client(config.token, {
  getAllUsers: true,
  restMode: true,
});

module.exports = bot;
