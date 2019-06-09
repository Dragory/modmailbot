const {User, Member} = require('eris');

const transliterate = require('transliteration');
const moment = require('moment');
const uuid = require('uuid');
const humanizeDuration = require('humanize-duration');

const bot = require('../bot');
const knex = require('../knex');
const config = require('../config');
const utils = require('../utils');
const updates = require('./updates');

const Thread = require('./Thread');
const {THREAD_STATUS} = require('./constants');

const MINUTES = 60 * 1000;
const HOURS = 60 * MINUTES;

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
 * @param {User} user
 * @param {Member} member
 * @param {Boolean} quiet If true, doesn't ping mentionRole or reply with responseMessage
 * @returns {Promise<Thread|undefined>}
 * @throws {Error}
 */
async function createNewThreadForUser(user, quiet = false, ignoreRequirements = false) {
  const existingThread = await findOpenThreadByUserId(user.id);
  if (existingThread) {
    throw new Error('Attempted to create a new thread for a user with an existing open thread!');
  }

  // If set in config, check that the user's account is old enough (time since they registered on Discord)
  // If the account is too new, don't start a new thread and optionally reply to them with a message
  if (config.requiredAccountAge && ! ignoreRequirements) {
    if (user.createdAt > moment() - config.requiredAccountAge * HOURS){
      if (config.accountAgeDeniedMessage) {
        const privateChannel = await user.getDMChannel();
        await privateChannel.createMessage(config.accountAgeDeniedMessage);
      }
      return;
    }
  }

  // Find which main guilds this user is part of
  const mainGuilds = utils.getMainGuilds();
  const userGuildData = new Map();

  for (const guild of mainGuilds) {
    let member = guild.members.get(user.id);

    if (! member) {
      try {
        member = await bot.getRESTGuildMember(guild.id, user.id);
      } catch (e) {
        continue;
      }
    }

    if (member) {
      userGuildData.set(guild.id, { guild, member });
    }
  }

  // If set in config, check that the user has been a member of one of the main guilds long enough
  // If they haven't, don't start a new thread and optionally reply to them with a message
  if (config.requiredTimeOnServer && ! ignoreRequirements) {
    // Check if the user joined any of the main servers a long enough time ago
    // If we don't see this user on any of the main guilds (the size check below), assume we're just missing some data and give the user the benefit of the doubt
    const isAllowed = userGuildData.size === 0 || Array.from(userGuildData.values()).some(({guild, member}) => {
      return member.joinedAt < moment() - config.requiredTimeOnServer * MINUTES;
    });

    if (! isAllowed) {
      if (config.timeOnServerDeniedMessage) {
        const privateChannel = await user.getDMChannel();
        await privateChannel.createMessage(config.timeOnServerDeniedMessage);
      }
      return;
    }
  }

  // Use the user's name+discrim for the thread channel's name
  // Channel names are particularly picky about what characters they allow, so we gotta do some clean-up
  let cleanName = transliterate.slugify(user.username);
  if (cleanName === '') cleanName = 'unknown';
  cleanName = cleanName.slice(0, 95); // Make sure the discrim fits

  const channelName = `${cleanName}-${user.discriminator}`;

  console.log(`[NOTE] Creating new thread channel ${channelName}`);

  // Figure out which category we should place the thread channel in
  let newThreadCategoryId;

  if (config.categoryAutomation.newThreadFromGuild) {
    // Categories for specific source guilds (in case of multiple main guilds)
    for (const [guildId, categoryId] of Object.entries(config.categoryAutomation.newThreadFromGuild)) {
      if (userGuildData.has(guildId)) {
        newThreadCategoryId = categoryId;
        break;
      }
    }
  }

  if (! newThreadCategoryId && config.categoryAutomation.newThread) {
    // Blanket category id for all new threads (also functions as a fallback for the above)
    newThreadCategoryId = config.categoryAutomation.newThread;
  }

  // Attempt to create the inbox channel for this thread
  let createdChannel;
  try {
    createdChannel = await utils.getInboxGuild().createChannel(channelName, null, 'New ModMail thread', newThreadCategoryId);
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

  // User id (and mention, if enabled)
  if (config.mentionUserInThreadHeader) {
    infoHeaderItems.push(`ID **${user.id}** (<@!${user.id}>)`);
  } else {
    infoHeaderItems.push(`ID **${user.id}**`);
  }

  let infoHeader = infoHeaderItems.join(', ');

  // Guild member info
  for (const [guildId, guildData] of userGuildData.entries()) {
    const {nickname, joinDate} = getHeaderGuildInfo(guildData.member);
    const headerItems = [
      `NICKNAME **${utils.escapeMarkdown(nickname)}**`,
      `JOINED **${joinDate}** ago`
    ];

    if (guildData.member.voiceState.channelID) {
      const voiceChannel = guildData.guild.channels.get(guildData.member.voiceState.channelID);
      if (voiceChannel) {
        headerItems.push(`VOICE CHANNEL **${utils.escapeMarkdown(voiceChannel.name)}**`);
      }
    }

    if (config.rolesInThreadHeader && guildData.member.roles.length) {
      const roles = guildData.member.roles.map(roleId => guildData.guild.roles.get(roleId)).filter(Boolean);
      headerItems.push(`ROLES **${roles.map(r => r.name).join(', ')}**`);
    }

    const headerStr = headerItems.join(', ');

    if (mainGuilds.length === 1) {
      infoHeader += `\n${headerStr}`;
    } else {
      infoHeader += `\n**[${utils.escapeMarkdown(guildData.guild.name)}]** ${headerStr}`;
    }
  }

  // ModMail history / previous logs
  const userLogCount = await getClosedThreadCountByUserId(user.id);
  if (userLogCount > 0) {
    infoHeader += `\n\nThis user has **${userLogCount}** previous modmail threads. Use \`${config.prefix}logs\` to see them.`;
  }

  infoHeader += '\n────────────────';

  await newThread.postSystemMessage(infoHeader);

  if (config.updateNotifications) {
    const availableUpdate = await updates.getAvailableUpdate();
    if (availableUpdate) {
      await newThread.postNonLogMessage(`📣 New bot version available (${availableUpdate})`);
    }
  }

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

async function getThreadsThatShouldBeSuspended() {
  const now = moment.utc().format('YYYY-MM-DD HH:mm:ss');
  const threads = await knex('threads')
    .where('status', THREAD_STATUS.OPEN)
    .whereNotNull('scheduled_suspend_at')
    .where('scheduled_suspend_at', '<=', now)
    .whereNotNull('scheduled_suspend_at')
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
  getThreadsThatShouldBeSuspended,
  createThreadInDB
};
