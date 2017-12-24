const Eris = require('eris');
const transliterate = require('transliteration');
const moment = require('moment');
const uuid = require('uuid');

const bot = require('../bot');
const knex = require('../knex');
const config = require('../config');

const getUtils = () => require('../utils');

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

const THREAD_STATUS = {
  OPEN: 1,
  CLOSED: 2
};

const THREAD_MESSAGE_TYPE = {
  SYSTEM: 1,
  CHAT: 2,
  FROM_USER: 3,
  TO_USER: 4,
  LEGACY: 5
};

/**
 * @property {Number} id
 * @property {Number} status
 * @property {String} user_id
 * @property {String} user_name
 * @property {String} channel_id
 * @property {String} created_at
 * @property {Boolean} _wasCreated
 */
class Thread {
  constructor(props) {
    Object.assign(this, {_wasCreated: false}, props);
  }
}

/**
 * Returns information about the modmail thread channel for the given user. We can't return channel objects
 * directly since they're not always available immediately after creation.
 * @param {Eris.User} user
 * @param {Boolean} allowCreate
 * @returns {Promise<Thread>}
 */
async function getOpenThreadForUser(user, allowCreate = true, originalMessage = null) {
  // Attempt to find an open thread for this user
  const thread = await knex('threads')
    .where('user_id', user.id)
    .where('status', THREAD_STATUS.OPEN)
    .select();

  if (thread) {
    return new Thread(thread);
  }

  // If no open thread was found, and we're not allowed to create one, just return null
  if (! allowCreate) {
    return null;
  }

  // No open thread was found, and we *are* allowed to create a new one, so let's do that

  // If the message's content matches any of the values in accidentalThreadMessages,
  // and config.ignoreAccidentalThreads is enabled, ignore this thread
  if (config.ignoreAccidentalThreads && originalMessage && originalMessage.cleanContent) {
    const cleaned = originalMessage.cleanContent.replace(/[^a-z\s]/gi, '').toLowerCase().trim();
    if (accidentalThreadMessages.includes(cleaned)) {
      console.log('[NOTE] Skipping thread creation for message:', originalMessage.cleanContent);
      return null;
    }
  }

  // Use the user's name+discrim for the thread channel's name
  // Channel names are particularly picky about what characters they allow, so we gotta do some clean-up
  let cleanName = transliterate.slugify(user.username);
  if (cleanName === '') cleanName = 'unknown';
  cleanName = cleanName.slice(0, 95); // Make sure the discrim fits

  const channelName = `${cleanName}-${user.discriminator}`;

  console.log(`[NOTE] Creating new thread channel ${channelName}`);

  // Attempt to create the inbox channel for this thread
  let createdChannel;
  try {
    createdChannel = await getUtils().getInboxGuild().createChannel(channelName);
    if (config.newThreadCategoryId) {
      // If a category id for new threads is specified, move the newly created channel there
      bot.editChannel(createdChannel.id, {parentID: config.newThreadCategoryId});
    }
  } catch (err) {
    console.error(`Error creating modmail channel for ${user.username}#${user.discriminator}!`);
    throw err;
  }

  // Save the new thread in the database
  const newThreadId = await create({
    status: THREAD_STATUS.OPEN,
    user_id: user.id,
    user_name: `${user.username}#${user.discriminator}`,
    channel_id: createdChannel.id,
    created_at: moment.utc().format('YYYY-MM-DD HH:mm:ss')
  });

  const newThreadObj = new Thread(newThread);
  newThreadObj._wasCreated = true;

  return newThreadObj;
}

/**
 * Creates a new thread row in the database
 * @param {Object} data
 * @returns {Promise<String>} The ID of the created thread
 */
async function create(data) {
  const threadId = uuid.v4();
  const now = moment.utc().format('YYYY-MM-DD HH:mm:ss');
  const finalData = Object.assign({created_at: now, is_legacy: 0}, data, {id: threadId});

  await knex('threads').insert(newThread);

  return threadId;
}

async function addThreadMessage(threadId, messageType, user, body) {
  return knex('thread_messages').insert({
    thread_id: threadId,
    message_type: messageType,
    user_id: (user ? user.id : 0),
    user_name: (user ? `${user.username}#${user.discriminator}` : ''),
    body,
    created_at: moment.utc().format('YYYY-MM-DD HH:mm:ss')
  });
}

/**
 * @param {String} channelId
 * @returns {Promise<Thread>}
 */
async function getByChannelId(channelId) {
  const thread = await knex('threads')
    .where('channel_id', channelId)
    .first();

  return (thread ? new Thread(thread) : null);
}

/**
 * Deletes the modmail thread for the given channel id
 * @param {String} channelId
 * @returns {Promise<void>}
 */
async function closeByChannelId(channelId) {
  await knex('threads')
    .where('channel_id', channelId)
    .update({
      status: THREAD_STATUS.CLOSED
    });
}

module.exports = {
  getOpenThreadForUser,
  getByChannelId,
  closeByChannelId,
  create,

  THREAD_STATUS,
  THREAD_MESSAGE_TYPE,
};
