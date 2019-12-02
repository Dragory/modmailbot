# 🧩 Plugins
The bot supports loading external plugins.

## Specifying plugins to load
For each plugin file you'd like to load, add the file path to the [`plugins` option](configuration.md#plugins).
The path is relative to the bot's folder.
Plugins are automatically loaded on bot startup.

## Creating a plugin
Create a `.js` file that exports a function.
This function will be called when the plugin is loaded, with 1 argument: an object that has the following properties:
* `bot` - the [Eris Client object](https://abal.moe/Eris/docs/Client)
* `knex` - the [Knex database object](https://knexjs.org/#Builder)
* `config` - the loaded config
* `commands` - an object with functions to add and manage commands
* `attachments` - an object with functions to save attachments and manage attachment storage types

See [src/plugins.js#L4](../src/plugins.js#L4) for more details

### Example plugin file
This example adds a command `!mycommand` that replies with `"Reply from my custom plugin!"` when the command is used inside a modmail inbox thread channel.
```js
module.exports = function({ bot, knex, config, commands }) {
  commands.addInboxThreadCommand('mycommand', [], (msg, args, thread) => {
    thread.replyToUser(msg.author, 'Reply from my custom plugin!');
  });
}
```

(Note the use of [object destructuring](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment#Unpacking_fields_from_objects_passed_as_function_parameter) in the function parameters)

### Example of a custom attachment storage type
This example adds a custom type for the `attachmentStorage` option called `"original"` that simply returns the original attachment URL without rehosting it in any way.
```js
module.exports = function({ attachments }) {
  attachments.addStorageType('original', attachment => {
    return { url: attachment.url };
  });
};
```
To use this custom attachment storage type, you would set the `attachmentStorage` config option to `"original"`.

## Work in progress
The current plugin API is fairly rudimentary and will be expanded on in the future.
The API can change in non-major releases during this early stage. Keep an eye on [CHANGELOG.md](../CHANGELOG.md) for any changes.

Please send any feature suggestions to the [issue tracker](https://github.com/Dragory/modmailbot/issues)!
