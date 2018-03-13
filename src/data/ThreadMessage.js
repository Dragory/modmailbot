const utils = require("../utils");

/**
 * @property {Number} id
 * @property {String} thread_id
 * @property {Number} message_type
 * @property {String} user_id
 * @property {String} user_name
 * @property {String} body
 * @property {Number} is_anonymous
 * @property {Number} dm_message_id
 * @property {String} created_at
 */
class ThreadMessage {
  constructor(props) {
    utils.setDataModelProps(this, props);
  }
}

module.exports = ThreadMessage;
