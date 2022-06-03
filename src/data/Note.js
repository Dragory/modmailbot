const utils = require("../utils");

/**
 * @property {number} id
 * @property {string} user_id
 * @property {string} author_id
 * @property {string} body
 * @property {string} created_at
 */
class Note {
  constructor(props) {
    utils.setDataModelProps(this, props);
  }
}

module.exports = Note;
