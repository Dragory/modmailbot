# Plugin API
**NOTE:** This file is generated automatically.

Scroll down to [PluginAPI](#PluginAPI) for a list of properties available to plugins.

## Typedefs

<dl>
<dt><a href="#PluginAPI">PluginAPI</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#PluginCommandsAPI">PluginCommandsAPI</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#PluginAttachmentsAPI">PluginAttachmentsAPI</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#PluginLogsAPI">PluginLogsAPI</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#PluginHooksAPI">PluginHooksAPI</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#PluginDisplayRolesAPI">PluginDisplayRolesAPI</a> : <code>displayRoles</code></dt>
<dd></dd>
<dt><a href="#PluginThreadsAPI">PluginThreadsAPI</a> : <code>threads</code></dt>
<dd></dd>
<dt><a href="#PluginWebServerAPI">PluginWebServerAPI</a> : <code>express.Application</code></dt>
<dd></dd>
<dt><a href="#PluginFormattersAPI">PluginFormattersAPI</a> : <code>FormattersExport</code></dt>
<dd></dd>
</dl>

<a name="PluginAPI"></a>

## PluginAPI : <code>object</code>
**Kind**: global typedef  
**Properties**

| Name | Type |
| --- | --- |
| bot | <code>Client</code> | 
| knex | <code>Knex</code> | 
| config | <code>ModmailConfig</code> | 
| commands | [<code>PluginCommandsAPI</code>](#PluginCommandsAPI) | 
| attachments | [<code>PluginAttachmentsAPI</code>](#PluginAttachmentsAPI) | 
| logs | [<code>PluginLogsAPI</code>](#PluginLogsAPI) | 
| hooks | [<code>PluginHooksAPI</code>](#PluginHooksAPI) | 
| formats | [<code>PluginFormattersAPI</code>](#PluginFormattersAPI) | 
| webserver | [<code>PluginWebServerAPI</code>](#PluginWebServerAPI) | 
| threads | [<code>PluginThreadsAPI</code>](#PluginThreadsAPI) | 
| displayRoles | [<code>PluginDisplayRolesAPI</code>](#PluginDisplayRolesAPI) | 

<a name="PluginCommandsAPI"></a>

## PluginCommandsAPI : <code>object</code>
**Kind**: global typedef  
**Properties**

| Name | Type |
| --- | --- |
| manager | <code>CommandManager</code> | 
| addGlobalCommand | <code>AddGlobalCommandFn</code> | 
| addInboxServerCommand | <code>AddInboxServerCommandFn</code> | 
| addInboxThreadCommand | <code>AddInboxThreadCommandFn</code> | 
| addAlias | <code>AddAliasFn</code> | 

<a name="PluginAttachmentsAPI"></a>

## PluginAttachmentsAPI : <code>object</code>
**Kind**: global typedef  
**Properties**

| Name | Type |
| --- | --- |
| addStorageType | <code>AddAttachmentStorageTypeFn</code> | 
| downloadAttachment | <code>DownloadAttachmentFn</code> | 
| saveAttachment | <code>SaveAttachmentFn</code> | 

<a name="PluginLogsAPI"></a>

## PluginLogsAPI : <code>object</code>
**Kind**: global typedef  
**Properties**

| Name | Type |
| --- | --- |
| addStorageType | <code>AddLogStorageTypeFn</code> | 
| saveLogToStorage | <code>SaveLogToStorageFn</code> | 
| getLogUrl | <code>GetLogUrlFn</code> | 
| getLogFile | <code>GetLogFileFn</code> | 
| getLogCustomResponse | <code>GetLogCustomResponseFn</code> | 

<a name="PluginHooksAPI"></a>

## PluginHooksAPI : <code>object</code>
**Kind**: global typedef  
**Properties**

| Name | Type |
| --- | --- |
| beforeNewThread | <code>AddBeforeNewThreadHookFn</code> | 
| afterThreadClose | <code>AddAfterThreadCloseHookFn</code> | 

<a name="PluginDisplayRolesAPI"></a>

## PluginDisplayRolesAPI : <code>displayRoles</code>
**Kind**: global typedef  
**See**: https://github.com/Dragory/modmailbot/blob/master/src/data/displayRoles.js  
<a name="PluginThreadsAPI"></a>

## PluginThreadsAPI : <code>threads</code>
**Kind**: global typedef  
**See**: https://github.com/Dragory/modmailbot/blob/master/src/data/threads.js  
<a name="PluginWebServerAPI"></a>

## PluginWebServerAPI : <code>express.Application</code>
**Kind**: global typedef  
**See**: https://expressjs.com/en/api.html#app  
<a name="PluginFormattersAPI"></a>

## PluginFormattersAPI : <code>FormattersExport</code>
**Kind**: global typedef  
**See**: https://github.com/Dragory/modmailbot/blob/master/src/formatters.js  
