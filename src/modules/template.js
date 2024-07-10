const threads = require("../data/threads");

module.exports = async ({ bot, knex, config, commands }) => {

  commands.addInboxThreadCommand("addtemplate", [{ name: "name", type: "string" }, { name: "content", type: "string", catchAll: true }], async (msg, args, thread) => {
    await knex('templates').insert({
      name: args.name,
      content: args.content
    });

    await thread.postSystemMessage(`Template **${args.name}** created.`);
  }, { allowSuspended: true });

  commands.addInboxThreadCommand("listtemplates", [], async (msg, args, thread) => {
    const templates = await knex('templates').select('*');
    if (templates.length === 0) {
      await thread.postSystemMessage("No templates found.");
      return;
    }

    const templateList = templates.map(t => `**${t.name}**: ${t.content}`).join('\n\n');
    await thread.postSystemMessage(`Templates available:\n\n${templateList}`);
  }, { allowSuspended: true });

  commands.addInboxThreadCommand("template", [{ name: "name", type: "string" }], async (msg, args, thread) => {
    const template = await knex('templates').where('name', args.name).first();
    if (!template) {
      await thread.postSystemMessage(`Template **${args.name}** not found.`);
      return;
    }

    const templateContent = template.content;

    const replied = await thread.replyToUser(msg.member, templateContent, [], config.forceAnon);
    if (replied) msg.delete();
  }, { allowSuspended: true });

  commands.addInboxThreadCommand("deltemplate", [{ name: "name", type: "string" }], async (msg, args, thread) => {
    const rowsDeleted = await knex('templates').where('name', args.name).delete();
    if (rowsDeleted === 0) {
      await thread.postSystemMessage(`Template **${args.name}** not found.`);
      return;
    }

    await thread.postSystemMessage(`Template **${args.name}** deleted.`);
  }, { allowSuspended: true });
};
