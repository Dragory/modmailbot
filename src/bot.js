const Eris = require("eris");
const config = require("./cfg");

const bot = new Eris.Client(config.token, {
  restMode: true,
});

module.exports = bot;
