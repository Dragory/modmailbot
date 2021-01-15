const server = require("./webserver");

module.exports = ({ config }) => {
  server.listen(config.port);
};
