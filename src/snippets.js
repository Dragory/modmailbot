const jsonDb = require('./jsonDb');

/**
 * @typedef {Object} Snippet
 * @property {String} text
 * @property {Boolean} isAnonymous
 */

/**
 * Returns the expanded text for the given snippet shortcut
 * @param {String} shortcut
 * @returns {Promise<Snippet|null>}
 */
function getSnippet(shortcut) {
  return jsonDb.get('snippets', {}).then(snippets => {
    return snippets[shortcut] || null;
  });
}

/**
 * Adds a snippet
 * @param {String} shortcut
 * @param {String} text
 * @param {Boolean} isAnonymous
 * @returns {Promise}
 */
function addSnippet(shortcut, text, isAnonymous = false) {
  return jsonDb.get('snippets', {}).then(snippets => {
    snippets[shortcut] = {
      text,
      isAnonymous,
    };

    jsonDb.save('snippets', snippets);
  });
}

/**
 * Deletes a snippet
 * @param {String} shortcut
 * @returns {Promise}
 */
function deleteSnippet(shortcut) {
  return jsonDb.get('snippets', {}).then(snippets => {
    delete snippets[shortcut];
    jsonDb.save('snippets', snippets);
  });
}

function getAllSnippets() {
  return jsonDb.get('snippets', {});
}

module.exports = {
  get: getSnippet,
  add: addSnippet,
  del: deleteSnippet,
  all: getAllSnippets,
};
