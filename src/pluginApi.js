const express = require("express");
const { CommandManager } = require("knub-command-manager");
const { Client } = require("eris");
const Knex = require("knex");
const threads = require("./data/threads");
const displayRoles = require("./data/displayRoles");

/**
 * @typedef {object} PluginAPI
 * @property {Client} bot
 * @property {Knex} knex
 * @property {ModmailConfig} config
 * @property {PluginCommandsAPI} commands
 * @property {PluginAttachmentsAPI} attachments
 * @property {PluginLogsAPI} logs
 * @property {PluginHooksAPI} hooks
 * @property {FormattersExport} formats
 * @property {express.Application} webserver
 * @property {threads} threads
 * @property {displayRoles} displayRoles
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
 * @typedef {object} PluginLogsAPI
 * @property {AddLogStorageTypeFn} addStorageType
 * @property {SaveLogToStorageFn} saveLogToStorage
 * @property {GetLogUrlFn} getLogUrl
 * @property {GetLogFileFn} getLogFile
 * @property {GetLogCustomResponseFn} getLogCustomResponse
 */

/**
 * @typedef {object} PluginHooksAPI
 * @property {AddBeforeNewThreadHookFn} beforeNewThread
 * @property {AddAfterThreadCloseHookFn} afterThreadClose
 */
