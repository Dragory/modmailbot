const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const schema = require('./data/cfg.schema.json');

/** @type {ModmailConfig} */
let config = {};

// Config files to search for, in priority order
const configFiles = [
  'config.ini',
  'config.json',
  'config.json5',
  'config.js',

  // Possible config files when file extensions are hidden
  'config.ini.ini',
  'config.ini.txt',
  'config.json.json',
  'config.json.txt',
];

let foundConfigFile;
for (const configFile of configFiles) {
  try {
    fs.accessSync(__dirname + '/../' + configFile);
    foundConfigFile = configFile;
    break;
  } catch (e) {}
}

// Load config values from a config file (if any)
if (foundConfigFile) {
  console.log(`Loading configuration from ${foundConfigFile}...`);
  try {
    if (foundConfigFile.endsWith('.js')) {
      config = require(`../${foundConfigFile}`);
    } else {
      const raw = fs.readFileSync(__dirname + '/../' + foundConfigFile, {encoding: "utf8"});
      if (foundConfigFile.endsWith('.ini') || foundConfigFile.endsWith('.ini.txt')) {
        config = require('ini').decode(raw);
      } else {
        config = require('json5').parse(raw);
      }
    }
  } catch (e) {
    throw new Error(`Error reading config file! The error given was: ${e.message}`);
  }
}

// Set dynamic default values which can't be set in the schema directly
config.dbDir = path.join(__dirname, '..', 'db');
config.logDir = path.join(__dirname, '..', 'logs'); // Only used for migrating data from older Modmail versions

// Load config values from environment variables
const envKeyPrefix = 'MM_';
let loadedEnvValues = 0;

for (const [key, value] of Object.entries(process.env)) {
  if (! key.startsWith(envKeyPrefix)) continue;

  // MM_CLOSE_MESSAGE -> closeMessage
  // MM_COMMAND_ALIASES__MV => commandAliases.mv
  const configKey = key.slice(envKeyPrefix.length)
    .toLowerCase()
    .replace(/([a-z])_([a-z])/g, (m, m1, m2) => `${m1}${m2.toUpperCase()}`)
    .replace('__', '.');

  config[configKey] = value.includes('||')
    ? value.split('||')
    : value;

  loadedEnvValues++;
}

if (process.env.PORT && ! process.env.MM_PORT) {
  // Special case: allow common "PORT" environment variable without prefix
  config.port = process.env.PORT;
  loadedEnvValues++;
}

if (loadedEnvValues > 0) {
  console.log(`Loaded ${loadedEnvValues} ${loadedEnvValues === 1 ? 'value' : 'values'} from environment variables`);
}

// Convert config keys with periods to objects
// E.g. commandAliases.mv -> commandAliases: { mv: ... }
for (const [key, value] of Object.entries(config)) {
  if (! key.includes('.')) continue;

  const keys = key.split('.');
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

// Cast boolean options (on, true, 1) (off, false, 0)
for (const [key, value] of Object.entries(config)) {
  if (typeof value !== "string") continue;
  if (["on", "true", "1"].includes(value)) {
    config[key] = true;
  } else if (["off", "false", "0"].includes(value)) {
    config[key] = false;
  }
}

if (! config['knex']) {
  config.knex = {
    client: 'sqlite',
    connection: {
      filename: path.join(config.dbDir, 'data.sqlite')
    },
    useNullAsDefault: true
  };
}

// Make sure migration settings are always present in knex config
Object.assign(config['knex'], {
  migrations: {
    directory: path.join(config.dbDir, 'migrations')
  }
});

// Make sure mainGuildId is internally always an array
if (! Array.isArray(config['mainGuildId'])) {
  config['mainGuildId'] = [config['mainGuildId']];
}

// Make sure inboxServerPermission is always an array
if (! Array.isArray(config['inboxServerPermission'])) {
  if (config['inboxServerPermission'] == null) {
    config['inboxServerPermission'] = [];
  } else {
    config['inboxServerPermission'] = [config['inboxServerPermission']];
  }
}

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

// Turn empty string options to null (i.e. "option=" without a value in config.ini)
for (const [key, value] of Object.entries(config)) {
  if (value === '') {
    config[key] = null;
  }
}

// Validate config and assign defaults (if missing)
const ajv = new Ajv({ useDefaults: true });
const validate = ajv.compile(schema);
const configIsValid = validate(config);

if (! configIsValid) {
  console.error('Issues with configuration options:');
  for (const error of validate.errors) {
    console.error(`The "${error.dataPath.slice(1)}" option ${error.message}`);
  }
  console.error('');
  console.error('Please restart the bot after fixing the issues mentioned above.');
  process.exit(1);
}

console.log("Configuration ok!");

module.exports = config;
