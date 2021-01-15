const path = require("path");
const fs = require("fs");
const {promisify} = require("util");
const utils = require("../utils");
const updates = require("../data/updates");
const { getPrettyVersion } = require("../botVersion");

const access = promisify(fs.access);
const readFile = promisify(fs.readFile);

const GIT_DIR = path.join(__dirname, "..", "..", ".git");

module.exports = ({ bot, knex, config, commands }) => {
  commands.addInboxServerCommand("version", [], async (msg, args, thread) => {
    let response = `Modmail ${getPrettyVersion()}`;

    if (config.updateNotifications) {
      const availableUpdate = await updates.getAvailableUpdate();
      if (availableUpdate) {
        response += ` (version ${availableUpdate} available)`;
      }
    }

    utils.postSystemMessageWithFallback(msg.channel, thread, response);
  });
};
