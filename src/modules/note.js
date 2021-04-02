const utils = require("../utils");

module.exports = ({ bot, knex, config, commands }) => {
	commands.addInboxServerCommand("setnote","<userId:userId> [text$]", async (msg, args, thread) => {
		if (args.text == undefined) {
			return utils.postError(msg.channel, "Missing required argument: text");
		}
		const row = await knex("notes")
			.where("user_id", args.userId)
			.first();
		if (row !== undefined) {
			await knex('notes')
				.where('user_id', args.userId)
				.update({ "note": args.text })
		}
		else {
			await knex("notes").insert({
				user_id: args.userId,
				note: args.text
			})
		}
		msg.channel.createMessage("Note for <@" + args.userId + "> is now: `" + args.text + "`")
	})
	commands.addInboxThreadCommand("setnote", "<text:string$>", async (msg, args, thread) => {
		let user;
		if (args.userId) {
			user = bot.users.get(args.userId)
			if (!user) {
				utils.postError(msg.channel, "User not found")
				return;
			}
			else {
				user = user.id;
			}
		}
		if (!user || !args.userId) {
			user = thread.user_id;
		}
		const row = await knex("notes")
			.where("user_id", user)
			.first();
		if (row !== undefined) {
			await knex('notes')
				.where('user_id', user)
				.update({ "note": args.text })
		}
		else {
			await knex("notes").insert({
				user_id: user,
				note: args.text
			})
		}
		thread.postSystemMessage("Note for <@" + thread.user_id + "> is now: `" + args.text + "`")

	})
	commands.addInboxServerCommand("shownote", "<userId:userId>", async (msg, args, thread) => {
		const user = bot.users.get(args.userId)
		if (!user) {
			utils.postError(msg.channel, "User not found")
			return;
		}
		const row = await knex("notes")
			.where("user_id", user.id)
			.first();
		if (row !== undefined && row.note !== "undefined") {
			msg.channel.createMessage("Note for <@" + user.id + ">: `" + row.note + "`")
		}
		else {
			msg.channel.createMessage("No note for this user.")
		}
	})
	commands.addInboxThreadCommand("shownote", [{ name: "userId", type: "userId", required: false }], async (msg, args, thread) => {
		let user;
		if (args.userId) {
			user = bot.users.get(args.userId)
			if (!user) {
				utils.postError(msg.channel, "User not found")
				return;
			}
			else {
				user = user.id;
			}
		}
		if (!user || !args.userId) {
			user = thread.user_id;
		}
		const row = await knex("notes")
			.where("user_id", user)
			.first();
		if (row !== undefined && row.note !== "undefined") {
			msg.channel.createMessage("Note for <@" + user + ">: `" + row.note + "`")
		}
		else {
			msg.channel.createMessage("No note for this user.")
		}
	})
	commands.addInboxServerCommand("delnote", "<userId:userId>", async (msg, args, thread) => {
		const row = await knex("notes")
			.where("user_id", args.userId)
			.del();
		msg.channel.createMessage("Note for <@" + args.userId + "> deleted.")
	})
	commands.addInboxThreadCommand("delnote", [{ name: "userId", type: "userId", required: false }], async (msg, args, thread) => {
		let user;
		if (args.userId) {
			user = bot.users.get(args.userId)
			if (!user) {
				utils.postError(msg.channel, "User not found")
				return;
			}
			else {
				user = user.id;
			}
		}
		if (!user || !args.userId) {
			user = thread.user_id;
		}
		const row = await knex("notes")
			.where("user_id", user)
			.del();
		msg.channel.createMessage("Note for <@" + user + "> deleted.")
	})
};
