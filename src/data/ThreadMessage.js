const utils = require("../utils");

/**
 * @property {Number} id
 * @property {String} thread_id
 * @property {Number} message_type
 * @property {Number} message_number
 * @property {String} user_id
 * @property {String} user_name
 * @property {String} body
 * @property {Number} is_anonymous
 * @property {String} dm_channel_id
 * @property {String} dm_message_id
 * @property {String} inbox_message_id
 * @property {String} created_at
 */
class ThreadMessage {
  constructor(props) {
    utils.setDataModelProps(this, props);
  }
}

module.exports = ThreadMessage;
