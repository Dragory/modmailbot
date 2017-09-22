let userConfig;

try {
  userConfig = require('../config');
} catch (e) {
  throw new Error(`Config file could not be found or read! The error given was: ${e.message}`);
}

const defaultConfig = {
  "token": null,
  "mailGuildId": null,
  "mainGuildId": null,
  "logChannelId": null,

  "prefix": "!",
  "snippetPrefix": "!!",

  "status": "Message me for help!",
  "responseMessage": "Thank you for your message! Our mod team will reply to you here as soon as possible.",

  "newThreadCategoryId": null,

  "inboxServerPermission": null,
  "alwaysReply": false,
  "alwaysReplyAnon": false,
  "useNicknames": false,
  "ignoreAccidentalThreads": false,

  "enableGreeting": false,
  "greetingMessage": null,
  "greetingAttachment": null,

  "port": 8890,
  "url": null
};

const finalConfig = Object.assign({}, defaultConfig);

for (const [prop, value] of Object.entries(userConfig)) {
  if (! defaultConfig.hasOwnProperty(prop)) {
    throw new Error(`Invalid option: ${prop}`);
  }

  finalConfig[prop] = value;
}

if (! finalConfig.token) throw new Error('Missing token!');
if (! finalConfig.mailGuildId) throw new Error('Missing mailGuildId (inbox server id)!');
if (! finalConfig.mainGuildId) throw new Error('Missing mainGuildId!');

module.exports = finalConfig;
