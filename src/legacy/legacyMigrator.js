const fs = require('fs');
const path = require('path');
const promisify = require('util').promisify;
const moment = require('moment');
const Eris = require('eris');

const knex = require('../knex');
const config = require('../config');
const jsonDb = require('./jsonDb');
const threads = require('../data/threads');

const {THREAD_STATUS, THREAD_MESSAGE_TYPE} = require('../data/constants');

const readDir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const access = promisify(fs.access);
const writeFile = promisify(fs.writeFile);

async function migrate() {
  console.log('Migrating open threads...');
  await migrateOpenThreads();

  console.log('Migrating logs...');
  await migrateLogs();

  console.log('Migrating blocked users...');
  await migrateBlockedUsers();

  console.log('Migrating snippets...');
  await migrateSnippets();

  await writeFile(path.join(config.dbDir, '.migrated_legacy'), '');
}

async function shouldMigrate() {
  // If there is a file marking a finished migration, assume we don't need to migrate
  const migrationFile = path.join(config.dbDir, '.migrated_legacy');
  try {
    await access(migrationFile);
    return false;
  } catch (e) {}

  // If there are any old threads, we need to migrate
  const oldThreads = await jsonDb.get('threads', []);
  if (oldThreads.length) {
    return true;
  }

  // If there are any old blocked users, we need to migrate
  const blockedUsers = await jsonDb.get('blocked', []);
  if (blockedUsers.length) {
    return true;
  }

  // If there are any old snippets, we need to migrate
  const snippets = await jsonDb.get('snippets', {});
  if (Object.keys(snippets).length) {
    return true;
  }

  // If the log file dir exists and has logs in it, we need to migrate
  try {
    const files = await readDir(config.logDir);
    if (files.length > 1) return true; // > 1, since .gitignore is one of them
  } catch(e) {}

  return false;
}

async function migrateOpenThreads() {
  const bot = new Eris.Client(config.token);

  const toReturn = new Promise(resolve => {
    bot.on('ready', async () => {
      const oldThreads = await jsonDb.get('threads', []);

      const promises = oldThreads.map(async oldThread => {
        const existingOpenThread = await knex('threads')
          .where('channel_id', oldThread.channelId)
          .first();

        if (existingOpenThread) return;

        const oldChannel = bot.getChannel(oldThread.channelId);
        if (! oldChannel) return;

        const threadMessages = await oldChannel.getMessages(1000);
        const log = threadMessages.reverse().map(msg => {
          const date = moment.utc(msg.timestamp, 'x').format('YYYY-MM-DD HH:mm:ss');
          return `[${date}] ${msg.author.username}#${msg.author.discriminator}: ${msg.content}`;
        }).join('\n') + '\n';

        const newThread = {
          status: THREAD_STATUS.OPEN,
          user_id: oldThread.userId,
          user_name: oldThread.username,
          channel_id: oldThread.channelId,
          is_legacy: 1
        };

        const threadId = await threads.createThreadInDB(newThread);

        await knex('thread_messages').insert({
          thread_id: threadId,
          message_type: THREAD_MESSAGE_TYPE.LEGACY,
          user_id: oldThread.userId,
          user_name: '',
          body: log,
          is_anonymous: 0,
          created_at: moment.utc().format('YYYY-MM-DD HH:mm:ss')
        });
      });

      resolve(Promise.all(promises));
    });

    bot.connect();
  });

  await toReturn;

  bot.disconnect();
}

async function migrateLogs() {
  const logDir = config.logDir || `${__dirname}/../../logs`;
  const logFiles = await readDir(logDir);

  for (let i = 0; i < logFiles.length; i++) {
    const logFile = logFiles[i];
    if (! logFile.endsWith('.txt')) continue;

    const [rawDate, userId, threadId] = logFile.slice(0, -4).split('__');
    const date = `${rawDate.slice(0, 10)} ${rawDate.slice(11).replace('-', ':')}`;

    const fullPath = path.join(logDir, logFile);
    const contents = await readFile(fullPath, {encoding: 'utf8'});

    const newThread = {
      id: threadId,
      status: THREAD_STATUS.CLOSED,
      user_id: userId,
      user_name: '',
      channel_id: null,
      is_legacy: 1,
      created_at: date
    };

    await knex.transaction(async trx => {
      const existingThread = await trx('threads')
        .where('id', newThread.id)
        .first();

      if (existingThread) return;

      await trx('threads').insert(newThread);

      await trx('thread_messages').insert({
        thread_id: newThread.id,
        message_type: THREAD_MESSAGE_TYPE.LEGACY,
        user_id: userId,
        user_name: '',
        body: contents,
        is_anonymous: 0,
        created_at: date
      });
    });

    // Progress indicator for servers with tons of logs
    if ((i + 1) % 500 === 0) {
      console.log(`  ${i + 1}...`);
    }
  }
}

async function migrateBlockedUsers() {
  const now = moment.utc().format('YYYY-MM-DD HH:mm:ss');
  const blockedUsers = await jsonDb.get('blocked', []);

  for (const userId of blockedUsers) {
    const existingBlockedUser = await knex('blocked_users')
      .where('user_id', userId)
      .first();

    if (existingBlockedUser) return;

    await knex('blocked_users').insert({
      user_id: userId,
      user_name: '',
      blocked_by: null,
      blocked_at: now
    });
  }
}

async function migrateSnippets() {
  const now = moment.utc().format('YYYY-MM-DD HH:mm:ss');
  const snippets = await jsonDb.get('snippets', {});

  const promises = Object.entries(snippets).map(async ([trigger, data]) => {
    const existingSnippet = await knex('snippets')
      .where('trigger', trigger)
      .first();

    if (existingSnippet) return;

    return knex('snippets').insert({
      trigger,
      body: data.text,
      is_anonymous: data.isAnonymous ? 1 : 0,
      created_by: null,
      created_at: now
    });
  });

  return Promise.all(promises);
}

module.exports = {
  migrate,
  shouldMigrate,
};
