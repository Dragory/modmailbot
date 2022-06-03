const moment = require("moment");
const utils = require("../utils");
const {findNotesByUserId, createUserNote, findNote, deleteNote} = require("../data/notes");
const {START_CODEBLOCK, escapeMarkdown, END_CODEBLOCK, chunkMessageLines,
  postError
} = require("../utils");

module.exports = ({ bot, knex, config, commands }) => {
  if (! config.allowNotes) return;

  async function userNotesCmd(msg, userId) {
    const userNotes = await findNotesByUserId(userId);
    if (! userNotes.length) {
      msg.channel.createMessage({
        content: `There are no notes for <@!${userId}>`,
        allowedMentions: {},
      });
      return;
    }

    for (const userNote of userNotes) {
      const timestamp = moment.utc(userNote.created_at).format("X");
      const content = [
        `Set by <@!${userNote.author_id}> at <t:${timestamp}:f>:`,
        `${START_CODEBLOCK}${escapeMarkdown(userNote.body)}${END_CODEBLOCK}`,
        `*Delete with \`${config.prefix}delete_note ${userNote.id}\`*\n`,
      ].join("\n");
      const chunks = chunkMessageLines(content);
      for (const chunk of chunks) {
        await msg.channel.createMessage({
          content: chunk,
          // Make sure we don't ping every note author
          allowedMentions: {},
        });
      }
    }
  }

  commands.addInboxServerCommand("notes", "<userId:userId>", (msg, args) => {
    return userNotesCmd(msg, args.userId);
  });
  commands.addInboxThreadCommand("notes", "", (msg, args, thread) => {
    return userNotesCmd(msg, thread.user_id);
  });

  async function addUserNoteCmd(msg, userId, body) {
    const authorId = msg.author.id;

    await createUserNote(userId, authorId, body);

    await msg.channel.createMessage({
      content: `Note added for <@!${userId}>`,
      allowedMentions: {},
    });
  }

  commands.addInboxServerCommand("note", "<userId:userId> <body:string$>", (msg, args) => {
    return addUserNoteCmd(msg, args.userId, args.body);
  });
  commands.addInboxThreadCommand("note", "<body:string$>", (msg, args, thread) => {
    return addUserNoteCmd(msg, thread.user_id, args.body);
  });

  async function deleteUserNoteCmd(msg, noteId) {
    const note = await findNote(noteId);
    if (! note) {
      postError(msg.channel, "Note not found!");
      return;
    }

    await deleteNote(noteId);
    await msg.channel.createMessage(`Deleted note on <@!${note.user_id}>:\n${START_CODEBLOCK}${escapeMarkdown(note.body)}${END_CODEBLOCK}`);
  }

  commands.addInboxServerCommand("delete_note", "<noteId:number>", (msg, args) => {
    return deleteUserNoteCmd(msg, args.noteId);
  }, {
    aliases: ["deletenote", "delnote"],
  });
};
