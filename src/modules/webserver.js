// gist: https://gist.github.com/promise/951880b7ee092aedaa5d6f281f181046#file-webserver-js

const express = require("express");
const helmet = require("helmet");
const fs = require("fs");
const path = require("path");
const marked = require("marked");

const mdPrivacyPolicyPath = path.resolve(__dirname, "../../PRIVACY.md");
let htmlPrivacyPolicy = null;
if (fs.existsSync(mdPrivacyPolicyPath)) {
  const mdPrivacyPolicy = fs.readFileSync(mdPrivacyPolicyPath, { encoding: "utf8" });
  const parsedPrivacyPolicy = marked.parse(mdPrivacyPolicy);
  htmlPrivacyPolicy = `
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Privacy policy</title>
      <style>
        html {
          font: normal 16px/1.4 system-ui, sans-serif;
        }
        body {
          width: 100%;
          max-width: 900px;
          margin: 32px auto;
          padding: 0 16px;
        }
      </style>
    </head>
    <body>${parsedPrivacyPolicy}</body>
    </html>
  `;
}

const server = express();
server.use(helmet());

if (htmlPrivacyPolicy) {
  server.get("/privacy-policy", (req, res) => {
    res.set("Content-Type", "text/html; charset=utf8");
    res.send(htmlPrivacyPolicy);
  });
}

server.on("error", (err) =>
  console.log("[WARN] Web server error:", err.message)
);

module.exports = server;
