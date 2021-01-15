const utils = require("../utils");

/**
 * @property {Number} id
 * @property {String} thread_id
 * @property {Number} message_type
 * @property {Number} message_number
 * @property {String} user_id
 * @property {String} user_name
 * @property {String} role_name
 * @property {String} body
 * @property {Number} is_anonymous
 * @property {String[]} attachments
 * @property {String[]} small_attachments The subset of attachments that were relayed when relaySmallAttachmentsAsAttachments is enabled
 * @property {String} dm_channel_id
 * @property {String} dm_message_id
 * @property {String} inbox_message_id
 * @property {String} created_at
 * @property {Number} use_legacy_format
 */
class ThreadMessage {
  constructor(props) {
    utils.setDataModelProps(this, props);

    if (props.attachments) {
      if (typeof props.attachments === "string") {
        this.attachments = JSON.parse(props.attachments);
      }
    } else {
      this.attachments = [];
    }

    if (props.small_attachments) {
      if (typeof props.small_attachments === "string") {
        this.small_attachments = JSON.parse(props.small_attachments);
      }
    } else {
      this.small_attachments = [];
    }

    if (props.metadata) {
      if (typeof props.metadata === "string") {
        this.metadata = JSON.parse(props.metadata);
      }
    }
  }

  getSQLProps() {
    return Object.entries(this).reduce((obj, [key, value]) => {
      if (typeof value === "function") return obj;
      if (typeof value === "object" && value != null) {
        obj[key] = JSON.stringify(value);
      } else {
        obj[key] = value;
      }
      return obj;
    }, {});
  }

  /**
   * @param {string} key
   * @param {*} value
   * @return {Promise<void>}
   */
  async setMetadataValue(key, value) {
    this.metadata = this.metadata || {};
    this.metadata[key] = value;

    if (this.id) {
      await knex("thread_messages")
        .where("id", this.id)
        .update({
          metadata: this.getSQLProps().metadata,
        });
    }
  }

  /**
   * @param {string} key
   * @returns {*}
   */
  getMetadataValue(key) {
    return this.metadata ? this.metadata[key] : null;
  }
}

module.exports = ThreadMessage;
