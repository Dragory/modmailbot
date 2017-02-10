const Eris = require('eris');
const utils = require('./utils');
const jsonDb = require('./jsonDb');

/**
 * @typedef {Object} ModMailThread
 * @property {String} channelId
 * @property {String} userId
 * @property {String} username
 * @property {Boolean} _wasCreated
 */

/**
 * Returns information about the modmail thread channel for the given user. We can't return channel objects
 * directly since they're not always available immediately after creation.
 * @param {Eris.Client} bot
 * @param {Eris.User} user
 * @param {Boolean} allowCreate
 * @returns {Promise<ThreadInfo>}
 */
function getForUser(bot, user, allowCreate = true) {
  return jsonDb.get('threads').then(threads => {
    const thread = threads.find(t => t.userId === user.id);
    if (thread) return thread;

    // If we didn't find an existing modmail thread, attempt creating one
    if (! allowCreate) return null;

    // Channel names are particularly picky about what characters they allow...
    let cleanName = user.username.replace(/[^a-zA-Z0-9]/ig, '').toLowerCase().trim();
    if (cleanName === '') cleanName = 'unknown';

    const channelName = `${cleanName}-${user.discriminator}`;
    console.log(`[NOTE] Creating new thread channel ${channelName}`);

    return utils.getModmailGuild(bot).createChannel(`${channelName}`)
      .then(channel => {
        const thread = {
          channelId: channel.id,
          userId: user.id,
          username: `${user.username}#${user.discriminator}`,
        };

        const threads = jsonDb.get('threads');
        threads.push(thread);
        jsonDb.save('threads', threads);

        thread._wasCreated = true;
        return thread;
      }, err => {
        console.error(`Error creating modmail channel for ${user.username}#${user.discriminator}!`);
      });
  });
}

/**
 * @param {String} channelId
 * @returns {Promise<ThreadInfo>}
 */
function getByChannelId(channelId) {
  return jsonDb.get('threads').then(threads => {
    return threads.find(t => t.userId === user.id);
  });
}

function close(channelId) {
  return jsonDb.get('threads').then(threads => {
    const thread = threads.find(t => t.userId === user.id);
    if (! thread) return;

    threads.splice(threads.indexOf(thread), 1);
    return jsonDb.save('threads', threads);
  });
}

module.exports = {
  getForUser,
  getByChannelId,
  close,
};
