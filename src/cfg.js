const fs = require("fs");
const path = require("path");
const Ajv = require("ajv");
const schema = require("./data/cfg.schema.json");

/** @type {ModmailConfig} */
let config = {};

// Config files to search for, in priority order
const configFiles = [
  "config.ini",
  "config.json",
  "config.json5",
  "config.js",

  // Possible config files when file extensions are hidden
  "config.ini.ini",
  "config.ini.txt",
  "config.json.json",
  "config.json.txt",
];

let foundConfigFile;
for (const configFile of configFiles) {
  try {
    fs.accessSync(__dirname + "/../" + configFile);
    foundConfigFile = configFile;
    break;
  } catch (e) {}
}

// Load config values from a config file (if any)
if (foundConfigFile) {
  console.log(`Loading configuration from ${foundConfigFile}...`);
  try {
    if (foundConfigFile.endsWith(".js")) {
      config = require(`../${foundConfigFile}`);
    } else {
      const raw = fs.readFileSync(__dirname + "/../" + foundConfigFile, {encoding: "utf8"});
      if (foundConfigFile.endsWith(".ini") || foundConfigFile.endsWith(".ini.txt")) {
        config = require("ini").decode(raw);
      } else {
        config = require("json5").parse(raw);
      }
    }
  } catch (e) {
    throw new Error(`Error reading config file! The error given was: ${e.message}`);
  }
}

// Set dynamic default values which can't be set in the schema directly
config.dbDir = path.join(__dirname, "..", "db");
config.logDir = path.join(__dirname, "..", "logs"); // Only used for migrating data from older Modmail versions

// Load config values from environment variables
const envKeyPrefix = "MM_";
let loadedEnvValues = 0;

for (const [key, value] of Object.entries(process.env)) {
  if (! key.startsWith(envKeyPrefix)) continue;

  // MM_CLOSE_MESSAGE -> closeMessage
  // MM_COMMAND_ALIASES__MV => commandAliases.mv
  const configKey = key.slice(envKeyPrefix.length)
    .toLowerCase()
    .replace(/([a-z])_([a-z])/g, (m, m1, m2) => `${m1}${m2.toUpperCase()}`)
    .replace("__", ".");

  config[configKey] = value.includes("||")
    ? value.split("||")
    : value;

  loadedEnvValues++;
}

if (process.env.PORT && ! process.env.MM_PORT) {
  // Special case: allow common "PORT" environment variable without prefix
  config.port = process.env.PORT;
  loadedEnvValues++;
}

if (loadedEnvValues > 0) {
  console.log(`Loaded ${loadedEnvValues} ${loadedEnvValues === 1 ? "value" : "values"} from environment variables`);
}

// Convert config keys with periods to objects
// E.g. commandAliases.mv -> commandAliases: { mv: ... }
for (const [key, value] of Object.entries(config)) {
  if (! key.includes(".")) continue;

  const keys = key.split(".");
  let cursor = config;
  for (let i = 0; i < keys.length; i++) {
    if (i === keys.length - 1) {
      cursor[keys[i]] = value;
    } else {
      cursor[keys[i]] = cursor[keys[i]] || {};
      cursor = cursor[keys[i]];
    }
  }

  delete config[key];
}

if (! config["knex"]) {
  config.knex = {
    client: "sqlite",
    connection: {
      filename: path.join(config.dbDir, "data.sqlite")
    },
    useNullAsDefault: true
  };
}

// Make sure migration settings are always present in knex config
Object.assign(config["knex"], {
  migrations: {
    directory: path.join(config.dbDir, "migrations")
  }
});

// Move greetingMessage/greetingAttachment to the guildGreetings object internally
// Or, in other words, if greetingMessage and/or greetingAttachment is set, it is applied for all servers that don't
// already have something set up in guildGreetings. This retains backwards compatibility while allowing you to override
// greetings for specific servers in guildGreetings.
if (config.greetingMessage || config.greetingAttachment) {
  for (const guildId of config.mainGuildId) {
    if (config.guildGreetings[guildId]) continue;
    config.guildGreetings[guildId] = {
      message: config.greetingMessage,
      attachment: config.greetingAttachment
    };
  }
}

// newThreadCategoryId is syntactic sugar for categoryAutomation.newThread
if (config.newThreadCategoryId) {
  config.categoryAutomation.newThread = config.newThreadCategoryId;
  delete config.newThreadCategoryId;
}

// Delete empty string options (i.e. "option=" without a value in config.ini)
for (const [key, value] of Object.entries(config)) {
  if (value === "") {
    delete config[key];
  }
}

// Validate config and assign defaults (if missing)
const ajv = new Ajv({ useDefaults: true, coerceTypes: "array" });

// https://github.com/ajv-validator/ajv/issues/141#issuecomment-270692820
const truthyValues = ["1", "true", "on"];
const falsyValues = ["0", "false", "off"];
ajv.addKeyword("coerceBoolean", {
  compile(value) {
    return (data, dataPath, parentData, parentKey) => {
      if (! value) {
        // Disabled -> no coercion
        return true;
      }

      // https://github.com/ajv-validator/ajv/issues/141#issuecomment-270777250
      // The "data" argument doesn't update within the same set of schemas inside "allOf",
      // so we're referring to the original property instead.
      // This also means we can't use { "type": "boolean" }, as it would test the un-updated data value.
      const realData = parentData[parentKey];

      if (typeof realData === "boolean") {
        return true;
      }

      if (truthyValues.includes(realData)) {
        parentData[parentKey] = true;
      } else if (falsyValues.includes(realData)) {
        parentData[parentKey] = false;
      } else {
        return false;
      }

      return true;
    };
  },
});

ajv.addKeyword("multilineString", {
  compile(value) {
    return (data, dataPath, parentData, parentKey) => {
      if (! value) {
        // Disabled -> no coercion
        return true;
      }

      const realData = parentData[parentKey];

      if (typeof realData === "string") {
        return true;
      }

      parentData[parentKey] = realData.join("\n");

      return true;
    };
  },
});

const validate = ajv.compile(schema);
const configIsValid = validate(config);

if (! configIsValid) {
  console.error("Issues with configuration options:");
  for (const error of validate.errors) {
    console.error(`The "${error.dataPath.slice(1)}" option ${error.message}`);
  }
  console.error("");
  console.error("Please restart the bot after fixing the issues mentioned above.");
  process.exit(1);
}

console.log("Configuration ok!");
process.exit(0);

module.exports = config;
