const Eris = require('eris');
const bot = require('./bot');
const transliterate = require('transliteration');
const jsonDb = require('./jsonDb');
const config = require('./config');

const getUtils = () => require('./utils');

// If the following messages would be used to start a thread, ignore it instead
// This is to prevent accidental threads from e.g. irrelevant replies after the thread was already closed
// or replies to the greeting message
const accidentalThreadMessages = [
  'ok',
  'okay',
  'thanks',
  'ty',
  'k',
  'thank you',
  'thanx',
  'thnx',
  'thx',
  'tnx',
  'ok thank you',
  'ok thanks',
  'ok ty',
  'ok thanx',
  'ok thnx',
  'ok thx',
  'ok no problem',
  'ok np',
  'okay thank you',
  'okay thanks',
  'okay ty',
  'okay thanx',
  'okay thnx',
  'okay thx',
  'okay no problem',
  'okay np',
  'okey thank you',
  'okey thanks',
  'okey ty',
  'okey thanx',
  'okey thnx',
  'okey thx',
  'okey no problem',
  'okey np',
  'cheers'
];

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
 * @param {Eris.User} user
 * @param {Boolean} allowCreate
 * @returns {Promise<ModMailThread>}
 */
function getForUser(user, allowCreate = true, originalMessage = null) {
  return jsonDb.get('threads', []).then(threads => {
    const thread = threads.find(t => t.userId === user.id);
    if (thread) return thread;

    // If we didn't find an existing modmail thread, attempt creating one
    if (! allowCreate) return null;

    // Channel names are particularly picky about what characters they allow...
    let cleanName = transliterate.slugify(user.username);
    if (cleanName === '') cleanName = 'unknown';
    cleanName = cleanName.slice(0, 95); // Make sure the discrim fits

    const channelName = `${cleanName}-${user.discriminator}`;

    if (originalMessage && originalMessage.cleanContent && config.ignoreAccidentalThreads) {
      const cleaned = originalMessage.cleanContent.replace(/[^a-z\s]/gi, '').toLowerCase().trim();
      if (accidentalThreadMessages.includes(cleaned)) {
        console.log('[NOTE] Skipping thread creation for message:', originalMessage.cleanContent);
        return null;
      }
    }

    console.log(`[NOTE] Creating new thread channel ${channelName}`);
    return getUtils().getInboxGuild().createChannel(`${channelName}`)
      .then(channel => {
        const thread = {
          channelId: channel.id,
          userId: user.id,
          username: `${user.username}#${user.discriminator}`,
        };

        if (config.newThreadCategoryId) {
          // If a category id is specified, move the newly created channel there
          bot.editChannel(channel.id, {parentID: config.newThreadCategoryId});
        }

        return jsonDb.get('threads', []).then(threads => {
          threads.push(thread);
          jsonDb.save('threads', threads);

          return Object.assign({}, thread, {_wasCreated: true});
        });
      }, err => {
        console.error(`Error creating modmail channel for ${user.username}#${user.discriminator}!`);
        throw err;
      });
  });
}

/**
 * @param {String} channelId
 * @returns {Promise<ModMailThread>}
 */
function getByChannelId(channelId) {
  return jsonDb.get('threads', []).then(threads => {
    return threads.find(t => t.channelId === channelId);
  });
}

/**
 * Deletes the modmail thread for the given channel id
 * @param {String} channelId
 * @returns {Promise}
 */
function close(channelId) {
  return jsonDb.get('threads', []).then(threads => {
    const thread = threads.find(t => t.channelId === channelId);
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
