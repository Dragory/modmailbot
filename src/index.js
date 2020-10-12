// Verify NodeJS version
const nodeMajorVersion = parseInt(process.versions.node.split(".")[0], 10);
if (nodeMajorVersion < 12) {
  console.error("Unsupported NodeJS version! Please install Node.js 12, 13, or 14.");
  process.exit(1);
}

// Verify node modules have been installed
const fs = require("fs");
const path = require("path");

try {
  fs.accessSync(path.join(__dirname, "..", "node_modules"));
} catch (e) {
  console.error("Please run \"npm ci\" before starting the bot");
  process.exit(1);
}

// Error handling
function errorHandler(err) {
  // Unknown message types (nitro boosting messages at the time) should be safe to ignore
  if (err && err.message && err.message.startsWith("Unhandled MESSAGE_CREATE type")) {
    return;
  }

  // For everything else, crash with the error
  console.error(err);
  process.exit(1);
}
process.on("uncaughtException", errorHandler);
process.on("unhandledRejection", errorHandler);

let testedPackage = "";
try {
  const packageJson = require("../package.json");
  const modules = Object.keys(packageJson.dependencies);
  modules.forEach(mod => {
    testedPackage = mod;
    fs.accessSync(path.join(__dirname, "..", "node_modules", mod))
  });
} catch (e) {
  console.error(`Please run "npm ci" again! Package "${testedPackage}" is missing.`);
  process.exit(1);
}

const config = require("./cfg");
const utils = require("./utils");
const main = require("./main");
const knex = require("./knex");

// Force crash on unhandled rejections (use something like forever/pm2 to restart)
process.on("unhandledRejection", err => {
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
  const [completed, newMigrations] = await knex.migrate.list();
  if (newMigrations.length > 0) {
    console.log("Updating database. This can take a while. Don't close the bot!");
    await knex.migrate.latest();
    console.log("Done!");
  }

  // Start the bot
  main.start();
})();
