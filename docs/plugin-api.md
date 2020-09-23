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
| formats | <code>FormattersExport</code> | 

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

