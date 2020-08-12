const config = require("./cfg");
module.exports = require("knex")({
  ...config.knex,
  log: {
    warn(message) {
      if (message.startsWith("FS-related option specified for migration configuration")) {
        return;
      }

      console.warn(message);
    },
  },
});
