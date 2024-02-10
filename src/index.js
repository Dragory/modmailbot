//Init translations
const i18next = require("./i18next");

// Verify NodeJS version
const nodeMajorVersion = parseInt(process.versions.node.split(".")[0], 10);
if (nodeMajorVersion < 12) {
  console.error(i18next.t("errors.unsupported_nodejs_version"));
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
  console.error(i18next.t("messages.please_run_npm_ci"));
  process.exit(1);
}

const { BotError } = require("./BotError");
const { PluginInstallationError } = require("./PluginInstallationError");

// Error handling
// Force crash on unhandled rejections and uncaught exceptions.
// Use something like forever/pm2 to restart.
const MAX_STACK_TRACE_LINES = process.env.NODE_ENV === "development" ? Infinity : 8;

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
      let fullMessage = i18next.t("messages.error_disallowed_intents");
      fullMessage += "\n\n";
      fullMessage += i18next.t("messages.to_run_the_bot");
      fullMessage += "\n\n";
      fullMessage += i18next.t("messages.go_to_discord_developers");
      fullMessage += i18next.t("messages.click_on_your_bot");
      fullMessage += i18next.t("messages.click_bot_sidebar");
      fullMessage += i18next.t("messages.turn_on_server_members_intent");

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
  console.error(i18next.t("messages.please_run_npm_ci_again", { testedPackage }));
  process.exit(1);
}

(async function() {
  require("./cfg");
  const main = require("./main");
  const knex = require("./knex");

  // Make sure the database is up to date
  const [completed, newMigrations] = await knex.migrate.list();
  if (newMigrations.length > 0) {
    console.log(i18next.t("messages.updating_database"));
    await knex.migrate.latest();
    console.log(i18next.t("messages.done"));
  }

  // Start the bot
  main.start();
})();
