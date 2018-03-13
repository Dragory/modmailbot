const utils = require("../utils");

/**
 * @property {String} trigger
 * @property {String} body
 * @property {Number} is_anonymous
 * @property {String} created_by
 * @property {String} created_at
 */
class Snippet {
  constructor(props) {
    utils.setDataModelProps(this, props);
  }
}

module.exports = Snippet;
