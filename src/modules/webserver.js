// gist: https://gist.github.com/promise/951880b7ee092aedaa5d6f281f181046#file-webserver-js

const express = require("express");
const helmet = require("helmet");

const server = express();
server.use(helmet());

server.on("error", (err) =>
  console.log("[WARN] Web server error:", err.message)
);

module.exports = server;
