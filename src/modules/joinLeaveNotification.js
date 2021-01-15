const config = require("../cfg");
const threads = require("../data/threads");
const utils = require("../utils");

module.exports = ({ bot }) => {
    // Join Notification: Post a message in the thread if the user joins a main server
    if (config.notifyOnMainServerJoin) {
        bot.on("guildMemberAdd", async (guild, member) => {
            const mainGuilds = utils.getMainGuilds();
            if (! mainGuilds.find(gld => gld.id === guild.id)) return;

            const thread = await threads.findOpenThreadByUserId(member.id);
            if (thread != null) {
                await thread.postSystemMessage(`***The user joined the guild ${guild.name}.***`);
            }
        });
    }

    // Leave Notification: Post a message in the thread if the user leaves a main server
    if (config.notifyOnMainServerLeave) {
        bot.on("guildMemberRemove", async (guild, member) => {
            const mainGuilds = utils.getMainGuilds();
            if (! mainGuilds.find(gld => gld.id === guild.id)) return;

            const thread = await threads.findOpenThreadByUserId(member.id);
            if (thread != null) {
                await thread.postSystemMessage(`***The user left the guild ${guild.name}.***`);
            }
        });
    }
};
