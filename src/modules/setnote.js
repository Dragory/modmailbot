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
	commands.addInboxThreadCommand("setnote", "<text:string$>", async (msg, args, thread) => {
		let notes = JSON.parse(fs.readFileSync("./logs/notes/notes.json", "utf8"));
		notes[thread.user_id] = {
		  note: args.text
		};
		fs.writeFile("./logs/notes/notes.json", JSON.stringify(notes, null, 4), (err) => {
		  if (err) console.log(err);
		})
		thread.postSystemMessage("Note for <@" + thread.user_id + "> is now : `" +  args.text + "`")
	  
	})
};
