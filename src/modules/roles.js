const utils = require("../utils");

const ROLE_OVERRIDES_METADATA_KEY = "moderatorRoleOverrides";

module.exports = ({ bot, knex, config, commands }) => {
  if (! config.allowChangingDisplayedRole) {
    return;
  }

  commands.addInboxThreadCommand("role", "[role:string$]", async (msg, args, thread) => {
    const moderatorRoleOverrides = thread.getMetadataValue(ROLE_OVERRIDES_METADATA_KEY);

    // Set display role
    if (args.role) {
      if (args.role === "reset") {
        await thread.resetModeratorRoleOverride(msg.member.id);

        const displayRole = thread.getModeratorDisplayRoleName(msg.member);
        if (displayRole) {
          thread.postSystemMessage(`Your display role has been reset. Your replies will now display the role **${displayRole}**.`);
        } else {
          thread.postSystemMessage("Your display role has been reset. Your replies will no longer display a role.");
        }

        return;
      }

      let role;
      if (utils.isSnowflake(args.role)) {
        if (! msg.member.roles.includes(args.role)) {
          thread.postSystemMessage("No matching role found. Make sure you have the role before trying to set it as your role.");
          return;
        }

        role = utils.getInboxGuild().roles.get(args.role);
      } else {
        const matchingMemberRole = utils.getInboxGuild().roles.find(r => {
          if (! msg.member.roles.includes(r.id)) return false;
          return r.name.toLowerCase() === args.role.toLowerCase();
        });

        if (! matchingMemberRole) {
          thread.postSystemMessage("No matching role found. Make sure you have the role before trying to set it as your role.");
          return;
        }

        role = matchingMemberRole;
      }

      await thread.setModeratorRoleOverride(msg.member.id, role.id);
      thread.postSystemMessage(`Your display role has been set to **${role.name}**. You can reset it with \`${config.prefix}role reset\`.`);
      return;
    }

    // Get display role
    const displayRole = thread.getModeratorDisplayRoleName(msg.member);
    if (displayRole) {
      thread.postSystemMessage(`Your displayed role is currently: **${displayRole}**`);
    } else {
      thread.postSystemMessage("Your replies do not currently display a role");
    }
  });
};
