const path = require('path');
const config = require('./config');
const utils = require('./utils');
const main = require('./main');
const knex = require('./knex');
const legacyMigrator = require('./legacy/legacyMigrator');

// Force crash on unhandled rejections (use something like forever/pm2 to restart)
process.on('unhandledRejection', err => {
  if (err instanceof utils.BotError || (err && err.code)) {
    // We ignore stack traces for BotErrors (the message has enough info) and network errors from Eris (their stack traces are unreadably long)
    console.error(`Error: ${err.message}`);
  } else {
    console.error(err);
  }

  process.exit(1);
});

(async function() {
  // Make sure the database is up to date
  await knex.migrate.latest();

  // Migrate legacy data if we need to
  if (await legacyMigrator.shouldMigrate()) {
    console.log('=== MIGRATING LEGACY DATA ===');
    console.log('Do not close the bot!');
    console.log('');

    await legacyMigrator.migrate();

    const relativeDbDir = (path.isAbsolute(config.dbDir) ? config.dbDir : path.resolve(process.cwd(), config.dbDir));
    const relativeLogDir = (path.isAbsolute(config.logDir) ? config.logDir : path.resolve(process.cwd(), config.logDir));

    console.log('');
    console.log('=== LEGACY DATA MIGRATION FINISHED ===');
    console.log('');
    console.log('IMPORTANT: After the bot starts, please verify that all logs, threads, blocked users, and snippets are still working correctly.');
    console.log('Once you\'ve done that, feel free to delete the following legacy files/directories:');
    console.log('');
    console.log('FILE: ' + path.resolve(relativeDbDir, 'threads.json'));
    console.log('FILE: ' + path.resolve(relativeDbDir, 'blocked.json'));
    console.log('FILE: ' + path.resolve(relativeDbDir, 'snippets.json'));
    console.log('DIRECTORY: ' + relativeLogDir);
    console.log('');
    console.log('Starting the bot...');
  }

  // Start the bot
  main.start();
})();
