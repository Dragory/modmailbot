# Architecture overview

# Monorepo
Since v4.0.0, modmail is split into modules within a monorepo. The general structure is:

```
/apps
  /bot # The core bot itself
/packages
  /database # Package for managing database connections
  /threads # Package for managing threads
  /... # Etc.
```

The idea here being that the bot's internal modules use the same plugin API as any third party plugins would.
This makes the bot very modular from the start, and lets us dogfood the plugin API properly.

## Development

`npm run watch-all` in the root directory

## npm workspaces

The project uses [npm workspaces](https://docs.npmjs.com/cli/v9/using-npm/workspaces). TL;DR:

* To install a dependency: `npm i <package> -w <workspace>` e.g. `npm i discord.js -w apps/bot`
