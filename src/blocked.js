const jsonDb = require('./jsonDb');

function isBlocked(userId) {
  return jsonDb.get('blocked').then(blocked => {
    return blocked.indexOf(userId) !== -1;
  });
}

function block(userId) {
  return jsonDb.get('blocked').then(blocked => {
    blocked.push(userId);
    return jsonDb.save('blocked', blocked);
  });
}

function unblock(userId) {
  return jsonDb.get('blocked').then(blocked => {
    blocked.splice(blocked.indexOf(userId), 1);
    return jsonDb.save('blocked', blocked);
  });
}

module.exports = {
  isBlocked,
  block,
  unblock,
};
