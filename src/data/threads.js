const Eris = require('eris');
const transliterate = require('transliteration');
const moment = require('moment');
const uuid = require('uuid');
const humanizeDuration = require('humanize-duration');

const knex = require('../knex');
const config = require('../config');
const utils = require('../utils');

const Thread = require('./Thread');
const {THREAD_STATUS} = require('./constants');

/**
 * @param {String} id
 * @returns {Promise<Thread>}
 */
async function findById(id) {
  const thread = await knex('threads')
    .where('id', id)
    .first();

  return (thread ? new Thread(thread) : null);
}

/**
 * @param {String} userId
 * @returns {Promise<Thread>}
 */
async function findOpenThreadByUserId(userId) {
  const thread = await knex('threads')
    .where('user_id', userId)
    .where('status', THREAD_STATUS.OPEN)
    .first();

  return (thread ? new Thread(thread) : null);
}

function getHeaderGuildInfo(member) {
  return {
    nickname: member.nick || member.user.username,
    joinDate: humanizeDuration(Date.now() - member.joinedAt, {largest: 2, round: true})
  };
}

/**
 * Creates a new modmail thread for the specified user
 * @param {Eris.User} user
 * @param {Boolean} quiet If true, doesn't ping mentionRole or reply with responseMessage
 * @returns {Promise<Thread>}
 * @throws {Error}
 */
async function createNewThreadForUser(user, quiet = false) {
  const existingThread = await findOpenThreadByUserId(user.id);
  if (existingThread) {
    throw new Error('Attempted to create a new thread for a user with an existing open thread!');
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
    createdChannel = await utils.getInboxGuild().createChannel(channelName, null, 'New ModMail thread', config.newThreadCategoryId);
  } catch (err) {
    console.error(`Error creating modmail channel for ${user.username}#${user.discriminator}!`);
    throw err;
  }

  // Save the new thread in the database
  const newThreadId = await createThreadInDB({
    status: THREAD_STATUS.OPEN,
    user_id: user.id,
    user_name: `${user.username}#${user.discriminator}`,
    channel_id: createdChannel.id,
    created_at: moment.utc().format('YYYY-MM-DD HH:mm:ss')
  });

  const newThread = await findById(newThreadId);
  let responseMessageError = null;

  if (! quiet) {
    // Ping moderators of the new thread
    if (config.mentionRole) {
      await newThread.postNonLogMessage({
        content: `${utils.getInboxMention()}New modmail thread (${newThread.user_name})`,
        disableEveryone: false
      });
    }

    // Send auto-reply to the user
    if (config.responseMessage) {
      try {
        await newThread.postToUser(config.responseMessage);
      } catch (err) {
        responseMessageError = err;
      }
    }
  }

  // Post some info to the beginning of the new thread
  const infoHeaderItems = [];

  // Account age
  const accountAge = humanizeDuration(Date.now() - user.createdAt, {largest: 2, round: true});
  infoHeaderItems.push(`ACCOUNT AGE **${accountAge}**`);

  // User id
  infoHeaderItems.push(`ID **${user.id}**`);

  let infoHeader = infoHeaderItems.join(', ');

  // Guild info
  const guildInfoHeaderItems = new Map();
  const mainGuilds = utils.getMainGuilds();
  
  mainGuilds.forEach(guild => {
    const member = guild.members.get(user.id);
    if (! member) return;

    const {nickname, joinDate} = getHeaderGuildInfo(member);
    guildInfoHeaderItems.set(guild.name, [
      `NICKNAME **${nickname}**`,
      `JOINED **${joinDate}** ago`
    ]);
  });

  guildInfoHeaderItems.forEach((items, guildName) => {
    if (mainGuilds.length === 1) {
      infoHeader += `\n${items.join(', ')}`;
    } else {
      infoHeader += `\n**[${guildName}]** ${items.join(', ')}`;
    }
  });

  const userLogCount = await getClosedThreadCountByUserId(user.id);
  if (userLogCount > 0) {
    infoHeader += `\n\nThis user has **${userLogCount}** previous modmail threads. Use \`${config.prefix}logs\` to see them.`;
  }

  infoHeader += '\n────────────────';

  await newThread.postSystemMessage(infoHeader);

  // If there were errors sending a response to the user, note that
  if (responseMessageError) {
    await newThread.postSystemMessage(`**NOTE:** Could not send auto-response to the user. The error given was: \`${responseMessageError.message}\``);
  }

  // Return the thread
  return newThread;
}

/**
 * Creates a new thread row in the database
 * @param {Object} data
 * @returns {Promise<String>} The ID of the created thread
 */
async function createThreadInDB(data) {
  const threadId = uuid.v4();
  const now = moment.utc().format('YYYY-MM-DD HH:mm:ss');
  const finalData = Object.assign({created_at: now, is_legacy: 0}, data, {id: threadId});

  await knex('threads').insert(finalData);

  return threadId;
}

/**
 * @param {String} channelId
 * @returns {Promise<Thread>}
 */
async function findByChannelId(channelId) {
  const thread = await knex('threads')
    .where('channel_id', channelId)
    .first();

  return (thread ? new Thread(thread) : null);
}

/**
 * @param {String} channelId
 * @returns {Promise<Thread>}
 */
async function findOpenThreadByChannelId(channelId) {
  const thread = await knex('threads')
    .where('channel_id', channelId)
    .where('status', THREAD_STATUS.OPEN)
    .first();

  return (thread ? new Thread(thread) : null);
}

/**
 * @param {String} channelId
 * @returns {Promise<Thread>}
 */
async function findSuspendedThreadByChannelId(channelId) {
  const thread = await knex('threads')
    .where('channel_id', channelId)
    .where('status', THREAD_STATUS.SUSPENDED)
    .first();

  return (thread ? new Thread(thread) : null);
}

/**
 * @param {String} userId
 * @returns {Promise<Thread[]>}
 */
async function getClosedThreadsByUserId(userId) {
  const threads = await knex('threads')
    .where('status', THREAD_STATUS.CLOSED)
    .where('user_id', userId)
    .select();

  return threads.map(thread => new Thread(thread));
}

/**
 * @param {String} userId
 * @returns {Promise<number>}
 */
async function getClosedThreadCountByUserId(userId) {
  const row = await knex('threads')
    .where('status', THREAD_STATUS.CLOSED)
    .where('user_id', userId)
    .first(knex.raw('COUNT(id) AS thread_count'));

  return parseInt(row.thread_count, 10);
}

async function findOrCreateThreadForUser(user) {
  const existingThread = await findOpenThreadByUserId(user.id);
  if (existingThread) return existingThread;

  return createNewThreadForUser(user);
}

async function getThreadsThatShouldBeClosed() {
  const now = moment.utc().format('YYYY-MM-DD HH:mm:ss');
  const threads = await knex('threads')
    .where('status', THREAD_STATUS.OPEN)
    .whereNotNull('scheduled_close_at')
    .where('scheduled_close_at', '<=', now)
    .whereNotNull('scheduled_close_at')
    .select();

  return threads.map(thread => new Thread(thread));
}

module.exports = {
  findById,
  findOpenThreadByUserId,
  findByChannelId,
  findOpenThreadByChannelId,
  findSuspendedThreadByChannelId,
  createNewThreadForUser,
  getClosedThreadsByUserId,
  findOrCreateThreadForUser,
  getThreadsThatShouldBeClosed,
  createThreadInDB
};
