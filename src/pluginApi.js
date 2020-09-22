const { CommandManager } = require("knub-command-manager");
const { Client } = require("eris");
const Knex = require("knex");

/**
 * @typedef {object} PluginAPI
 * @property {Client} bot
 * @property {Knex} knex
 * @property {ModmailConfig} config
 * @property {PluginCommandsAPI} commands
 * @property {PluginAttachmentsAPI} attachments
 * @property {PluginHooksAPI} hooks
 * @property {FormattersExport} formats
 */

/**
 * @typedef {object} PluginCommandsAPI
 * @property {CommandManager} manager
 * @property {AddGlobalCommandFn} addGlobalCommand
 * @property {AddInboxServerCommandFn} addInboxServerCommand
 * @property {AddInboxThreadCommandFn} addInboxThreadCommand
 * @property {AddAliasFn} addAlias
 */

/**
 * @typedef {object} PluginAttachmentsAPI
 * @property {AddAttachmentStorageTypeFn} addStorageType
 * @property {DownloadAttachmentFn} downloadAttachment
 */

/**
 * @typedef {object} PluginHooksAPI
 * @property {AddBeforeNewThreadHookFn} beforeNewThread
 * @property {AddAfterThreadCloseHookFn} afterThreadClose
 */
