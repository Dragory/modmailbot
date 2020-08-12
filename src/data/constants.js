module.exports = {
  THREAD_STATUS: {
    OPEN: 1,
    CLOSED: 2,
    SUSPENDED: 3
  },

  THREAD_MESSAGE_TYPE: {
    SYSTEM: 1,
    CHAT: 2,
    FROM_USER: 3,
    TO_USER: 4,
    LEGACY: 5,
    COMMAND: 6,
    SYSTEM_TO_USER: 7
  },

  // https://discord.com/developers/docs/resources/channel#channel-object-channel-types
  DISOCRD_CHANNEL_TYPES: {
    GUILD_TEXT: 0,
    DM: 1,
    GUILD_VOICE: 2,
    GROUP_DM: 3,
    GUILD_CATEGORY: 4,
    GUILD_NEWS: 5,
    GUILD_STORE: 6,
  },

  ACCIDENTAL_THREAD_MESSAGES: [
    'ok',
    'okay',
    'thanks',
    'ty',
    'k',
    'kk',
    'thank you',
    'thanx',
    'thnx',
    'thx',
    'tnx',
    'ok thank you',
    'ok thanks',
    'ok ty',
    'ok thanx',
    'ok thnx',
    'ok thx',
    'ok no problem',
    'ok np',
    'okay thank you',
    'okay thanks',
    'okay ty',
    'okay thanx',
    'okay thnx',
    'okay thx',
    'okay no problem',
    'okay np',
    'okey thank you',
    'okey thanks',
    'okey ty',
    'okey thanx',
    'okey thnx',
    'okey thx',
    'okey no problem',
    'okey np',
    'cheers'
  ],
};
