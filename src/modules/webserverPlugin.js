module.exports = ({ config, bot }) => {
  const server = require("./webserver")(bot);
  server.listen(config.port, config.host);
};
