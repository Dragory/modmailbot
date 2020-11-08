const {User, Member, Message} = require("eris");

const transliterate = require("transliteration");
const moment = require("moment");
const uuid = require("uuid");
const humanizeDuration = require("humanize-duration");
const crypto = require("crypto");

const bot = require("../bot");
const knex = require("../knex");
const config = require("../cfg");
const utils = require("../utils");
const updates = require("./updates");

const Thread = require("./Thread");
const {callBeforeNewThreadHooks} = require("../hooks/beforeNewThread");
const {THREAD_STATUS, DISOCRD_CHANNEL_TYPES} = require("./constants");

const MINUTES = 60 * 1000;
const HOURS = 60 * MINUTES;

let threadCreationQueue = Promise.resolve();

function _addToThreadCreationQueue(fn) {
  threadCreationQueue = threadCreationQueue
    .then(fn)
    .catch(err => {
      console.error(`Error while creating thread: ${err.message}`);
    });

  return threadCreationQueue;
}

/**
 * @param {String} id
 * @returns {Promise<Thread>}
 */
async function findById(id) {
  const thread = await knex("threads")
    .where("id", id)
    .first();

  return (thread ? new Thread(thread) : null);
}

/**
 * @param {number} threadNumber
 * @returns {Promise<Thread>}
 */
async function findByThreadNumber(threadNumber) {
  const thread = await knex("threads")
    .where("thread_number", threadNumber)
    .first();

  return (thread ? new Thread(thread) : null);
}

/**
 * @param {String} userId
 * @returns {Promise<Thread>}
 */
async function findOpenThreadByUserId(userId) {
  const thread = await knex("threads")
    .where("user_id", userId)
    .where("status", THREAD_STATUS.OPEN)
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
 * @typedef CreateNewThreadForUserOpts
 * @property {boolean} [quiet] If true, doesn't ping mentionRole
 * @property {boolean} [ignoreRequirements] If true, creates a new thread even if the account doesn't meet requiredAccountAge
 * @property {boolean} [ignoreHooks] If true, doesn't call beforeNewThread hooks
 * @property {Message} [message] Original DM message that is trying to start the thread, if there is one
 * @property {string} [categoryId] Category where to open the thread
 * @property {string} [source] A string identifying the source of the new thread
 * @property {string} [mentionRole] Override the mentionRole option for this thread
 */

/**
 * Creates a new modmail thread for the specified user
 * @param {User} user
 * @param {CreateNewThreadForUserOpts} opts
 * @returns {Promise<Thread|undefined>}
 * @throws {Error}
 */
async function createNewThreadForUser(user, opts = {}) {
  return _addToThreadCreationQueue(async () => {
    const quiet = opts.quiet != null ? opts.quiet : false;
    const ignoreRequirements = opts.ignoreRequirements != null ? opts.ignoreRequirements : false;
    const ignoreHooks = opts.ignoreHooks != null ? opts.ignoreHooks : false;

    const existingThread = await findOpenThreadByUserId(user.id);
    if (existingThread) {
      throw new Error("Attempted to create a new thread for a user with an existing open thread!");
    }

    // If set in config, check that the user's account is old enough (time since they registered on Discord)
    // If the account is too new, don't start a new thread and optionally reply to them with a message
    if (config.requiredAccountAge && ! ignoreRequirements) {
      if (user.createdAt > moment() - config.requiredAccountAge * HOURS){
        if (config.accountAgeDeniedMessage) {
          const accountAgeDeniedMessage = utils.readMultilineConfigValue(config.accountAgeDeniedMessage);
          const privateChannel = await user.getDMChannel();
          await privateChannel.createMessage(accountAgeDeniedMessage);
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
          const timeOnServerDeniedMessage = utils.readMultilineConfigValue(config.timeOnServerDeniedMessage);
          const privateChannel = await user.getDMChannel();
          await privateChannel.createMessage(timeOnServerDeniedMessage);
        }
        return;
      }
    }

    let hookResult;
    if (! ignoreHooks) {
      // Call any registered beforeNewThreadHooks
      hookResult = await callBeforeNewThreadHooks({
        user,
        opts,
        message: opts.message
      });
      if (hookResult.cancelled) return;
    }

    // Use the user's name+discrim for the thread channel's name
    // Channel names are particularly picky about what characters they allow, so we gotta do some clean-up
    let cleanName = transliterate.slugify(user.username);
    if (cleanName === "") cleanName = "unknown";
    cleanName = cleanName.slice(0, 95); // Make sure the discrim fits

    let channelName = `${cleanName}-${user.discriminator}`;

    if (config.anonymizeChannelName) {
      channelName = crypto.createHash("md5").update(channelName + Date.now()).digest("hex").slice(0, 12);
    }

    console.log(`[NOTE] Creating new thread channel ${channelName}`);

    // Figure out which category we should place the thread channel in
    let newThreadCategoryId = (hookResult && hookResult.categoryId) || opts.categoryId || null;

    if (! newThreadCategoryId && config.categoryAutomation.newThreadFromServer) {
      // Categories for specific source guilds (in case of multiple main guilds)
      for (const [guildId, categoryId] of Object.entries(config.categoryAutomation.newThreadFromServer)) {
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
      createdChannel = await utils.getInboxGuild().createChannel(channelName, DISOCRD_CHANNEL_TYPES.GUILD_TEXT, {
        reason: "New Modmail thread",
        parentID: newThreadCategoryId,
      });
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
      created_at: moment.utc().format("YYYY-MM-DD HH:mm:ss")
    });

    const newThread = await findById(newThreadId);

    if (! quiet) {
      // Ping moderators of the new thread
      const staffMention = opts.mentionRole
        ? utils.mentionRolesToMention(utils.getValidMentionRoles(opts.mentionRole))
        : utils.getInboxMention();

      if (staffMention.trim() !== "") {
        const allowedMentions = opts.mentionRole
          ? utils.mentionRolesToAllowedMentions(utils.getValidMentionRoles(opts.mentionRole))
          : utils.getInboxMentionAllowedMentions();

        await newThread.postNonLogMessage({
          content: `${staffMention}New modmail thread (${newThread.user_name})`,
          allowedMentions,
        });
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

    let infoHeader = infoHeaderItems.join(", ");

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
        headerItems.push(`ROLES **${roles.map(r => r.name).join(", ")}**`);
      }

      const headerStr = headerItems.join(", ");

      if (mainGuilds.length === 1) {
        infoHeader += `\n${headerStr}`;
      } else {
        infoHeader += `\n**[${utils.escapeMarkdown(guildData.guild.name)}]** ${headerStr}`;
      }
    }

    // Modmail history / previous logs
    const userLogCount = await getClosedThreadCountByUserId(user.id);
    if (userLogCount > 0) {
      infoHeader += `\n\nThis user has **${userLogCount}** previous modmail threads. Use \`${config.prefix}logs\` to see them.`;
    }

    infoHeader += "\n────────────────";

    const { message: threadHeaderMessage } = await newThread.postSystemMessage(infoHeader, {
      allowedMentions: config.mentionUserInThreadHeader ? { users: [user.id] } : undefined,
    });

    if (config.pinThreadHeader) {
      await threadHeaderMessage.pin();
    }

    if (config.updateNotifications) {
      const availableUpdate = await updates.getAvailableUpdate();
      if (availableUpdate) {
        await newThread.postNonLogMessage(`📣 New bot version available (${availableUpdate})`);
      }
    }

    // Return the thread
    return newThread;
  });
}

/**
 * Creates a new thread row in the database
 * @param {Object} data
 * @returns {Promise<String>} The ID of the created thread
 */
async function createThreadInDB(data) {
  const threadId = uuid.v4();
  const now = moment.utc().format("YYYY-MM-DD HH:mm:ss");
  const latestThreadNumberRow = await knex("threads")
    .orderBy("thread_number", "DESC")
    .first();
  const latestThreadNumber = latestThreadNumberRow ? latestThreadNumberRow.thread_number : 0;
  const finalData = Object.assign(
    {created_at: now, is_legacy: 0},
    data,
    {id: threadId, thread_number: latestThreadNumber + 1}
  );

  await knex("threads").insert(finalData);

  return threadId;
}

/**
 * @param {String} channelId
 * @returns {Promise<Thread>}
 */
async function findByChannelId(channelId) {
  const thread = await knex("threads")
    .where("channel_id", channelId)
    .first();

  return (thread ? new Thread(thread) : null);
}

/**
 * @param {String} channelId
 * @returns {Promise<Thread>}
 */
async function findOpenThreadByChannelId(channelId) {
  const thread = await knex("threads")
    .where("channel_id", channelId)
    .where("status", THREAD_STATUS.OPEN)
    .first();

  return (thread ? new Thread(thread) : null);
}

/**
 * @param {String} channelId
 * @returns {Promise<Thread>}
 */
async function findSuspendedThreadByChannelId(channelId) {
  const thread = await knex("threads")
    .where("channel_id", channelId)
    .where("status", THREAD_STATUS.SUSPENDED)
    .first();

  return (thread ? new Thread(thread) : null);
}

/**
 * @param {String} userId
 * @returns {Promise<Thread[]>}
 */
async function getClosedThreadsByUserId(userId) {
  const threads = await knex("threads")
    .where("status", THREAD_STATUS.CLOSED)
    .where("user_id", userId)
    .select();

  return threads.map(thread => new Thread(thread));
}

/**
 * @param {String} userId
 * @returns {Promise<number>}
 */
async function getClosedThreadCountByUserId(userId) {
  const row = await knex("threads")
    .where("status", THREAD_STATUS.CLOSED)
    .where("user_id", userId)
    .first(knex.raw("COUNT(id) AS thread_count"));

  return parseInt(row.thread_count, 10);
}

/**
 * @param {User} user
 * @param {CreateNewThreadForUserOpts} opts
 * @returns {Promise<Thread|undefined>}
 */
async function findOrCreateThreadForUser(user, opts = {}) {
  const existingThread = await findOpenThreadByUserId(user.id);
  if (existingThread) return existingThread;

  return createNewThreadForUser(user, opts);
}

async function getThreadsThatShouldBeClosed() {
  const now = moment.utc().format("YYYY-MM-DD HH:mm:ss");
  const threads = await knex("threads")
    .where("status", THREAD_STATUS.OPEN)
    .whereNotNull("scheduled_close_at")
    .where("scheduled_close_at", "<=", now)
    .whereNotNull("scheduled_close_at")
    .select();

  return threads.map(thread => new Thread(thread));
}

async function getThreadsThatShouldBeSuspended() {
  const now = moment.utc().format("YYYY-MM-DD HH:mm:ss");
  const threads = await knex("threads")
    .where("status", THREAD_STATUS.OPEN)
    .whereNotNull("scheduled_suspend_at")
    .where("scheduled_suspend_at", "<=", now)
    .whereNotNull("scheduled_suspend_at")
    .select();

  return threads.map(thread => new Thread(thread));
}

module.exports = {
  findById,
  findByThreadNumber,
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
