// Verify NodeJS version
const nodeMajorVersion = parseInt(process.versions.node.split(".")[0], 10);
if (nodeMajorVersion < 12) {
  console.error("Unsupported NodeJS version! Please install Node.js 12, 13, or 14.");
  process.exit(1);
}

// Print out bot and Node.js version
const { getPrettyVersion } = require("./botVersion");
console.log(`Starting Modmail ${getPrettyVersion()} on Node.js ${process.versions.node} (${process.arch})`);

// Verify node modules have been installed
const fs = require("fs");
const path = require("path");

try {
  fs.accessSync(path.join(__dirname, "..", "node_modules"));
} catch (e) {
  console.error("Please run \"npm ci\" before starting the bot");
  process.exit(1);
}

const { BotError } = require("./BotError");
const { PluginInstallationError } = require("./PluginInstallationError");

// Error handling
// Force crash on unhandled rejections and uncaught exceptions.
// Use something like forever/pm2 to restart.
const MAX_STACK_TRACE_LINES = 8;

function errorHandler(err) {
  // Unknown message types (nitro boosting messages at the time) should be safe to ignore
  if (err && err.message && err.message.startsWith("Unhandled MESSAGE_CREATE type")) {
    return;
  }

  if (err) {
    if (typeof err === "string") {
      console.error(`Error: ${err}`);
    } else if (err instanceof BotError) {
      // Leave out stack traces for BotErrors (the message has enough info)
      console.error(`Error: ${err.message}`);
    } else if (err.message === "Disallowed intents specified") {
      let fullMessage = "Error: Disallowed intents specified";
      fullMessage += "\n\n";
      fullMessage += "To run the bot, you must enable 'Server Members Intent' on your bot's page in the Discord Developer Portal:";
      fullMessage += "\n\n";
      fullMessage += "1. Go to https://discord.com/developers/applications"
      fullMessage += "2. Click on your bot"
      fullMessage += "3. Click 'Bot' on the sidebar"
      fullMessage += "4. Turn on 'Server Members Intent'"

      console.error(fullMessage);
    } else if (err instanceof PluginInstallationError) {
      // Don't truncate PluginInstallationErrors as they can get lengthy
      console.error(err);
    } else {
      // Truncate long stack traces for other errors
      const stack = err.stack || "";
      let stackLines = stack.split("\n");
      if (stackLines.length > (MAX_STACK_TRACE_LINES + 2)) {
        stackLines = stackLines.slice(0, MAX_STACK_TRACE_LINES);
        stackLines.push(`    ...stack trace truncated to ${MAX_STACK_TRACE_LINES} lines`);
      }
      const finalStack = stackLines.join("\n");

      if (err.code) {
        console.error(`Error ${err.code}: ${finalStack}`);
      } else {
        console.error(`Error: ${finalStack}`);
      }
    }
  } else {
    console.error("Unknown error occurred");
  }

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

(async function() {
  require("./cfg");
  const main = require("./main");
  const knex = require("./knex");

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
