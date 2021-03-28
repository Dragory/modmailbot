const path = require("path");
const fs = require("fs");
const { promisify } = require("util");
const utils = require("../utils");
const updates = require("../data/updates");
const { getPrettyVersion } = require("../botVersion");

const access = promisify(fs.access);
const readFile = promisify(fs.readFile);

const GIT_DIR = path.join(__dirname, "..", "..", ".git");

module.exports = ({ bot, knex, config, commands }) => {
  commands.addInboxServerCommand("shownote", "<userId:userId>", async (msg, args, thread) => {
    const user = bot.users.get(args.userId)
    if (! user) {
      msg.channel.createMessage("User not found!");
      return;
    }
    let notes = JSON.parse(fs.readFileSync("./logs/notes/notes.json", "utf8"));
    let found = -1;
    if (notes[user.id]) {
      found = 1;
    }
    if (found !== -1 && notes[user.id].note !== "undefined") {
      msg.channel.createMessage("Note for <@" + user.id + "> : `" + notes[user.id].note + "`")
    }
    else {
      msg.channel.createMessage("No note for this user.")
    }
  })
};
