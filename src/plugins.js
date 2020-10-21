const attachments = require("./data/attachments");
const logs = require("./data/logs");
const { beforeNewThread } = require("./hooks/beforeNewThread");
const { afterThreadClose } = require("./hooks/afterThreadClose");
const formats = require("./formatters");
const { server: webserver } = require("./modules/webserver");
const childProcess = require("child_process");
const pacote = require("pacote");
const path = require("path");
const threads = require("./data/threads");
const displayRoles = require("./data/displayRoles");

const pluginSources = {
  npm: {
    install(plugins) {
      return new Promise((resolve, reject) => {
        console.log(`Installing ${plugins.length} plugins from NPM...`);

        let stderr = "";
        const npmProcess = childProcess.spawn("npm", ["install", "--no-save", ...plugins], { cwd: process.cwd() });
        npmProcess.stderr.on("data", data => { stderr += String(data) });
        npmProcess.on("close", code => {
          if (code !== 0) {
            return reject(new Error(stderr));
          }

          return resolve();
        });
      });
    },

    async load(plugin, pluginApi) {
      const manifest = await pacote.manifest(plugin);
      const packageName = manifest.name;
      const pluginFn = require(packageName);
      if (typeof pluginFn !== "function") {
        throw new Error(`Plugin '${plugin}' is not a valid plugin`);
      }

      return pluginFn(pluginApi);
    },
  },

  file: {
    install(plugins) {},
    load(plugin, pluginApi) {
      const requirePath = path.join(__dirname, "..", plugin);
      const pluginFn = require(requirePath);
      if (typeof pluginFn !== "function") {
        throw new Error(`Plugin '${plugin}' is not a valid plugin`);
      }
      return pluginFn(pluginApi);
    },
  }
};

const defaultPluginSource = "file";

function splitPluginSource(pluginName) {
  for (const pluginSource of Object.keys(pluginSources)) {
    if (pluginName.startsWith(`${pluginSource}:`)) {
      return {
        source: pluginSource,
        plugin: pluginName.slice(pluginSource.length + 1),
      };
    }
  }

  return {
    source: defaultPluginSource,
    plugin: pluginName,
  };
}

module.exports = {
  async installPlugins(plugins) {
    const pluginsBySource = {};

    for (const pluginName of plugins) {
      const { source, plugin } = splitPluginSource(pluginName);
      pluginsBySource[source] = pluginsBySource[source] || [];
      pluginsBySource[source].push(plugin);
    }

    for (const [source, sourcePlugins] of Object.entries(pluginsBySource)) {
      await pluginSources[source].install(sourcePlugins);
    }
  },

  async loadPlugins(plugins, pluginApi) {
    for (const pluginName of plugins) {
      const { source, plugin } = splitPluginSource(pluginName);
      await pluginSources[source].load(plugin, pluginApi);
    }
  },

  /**
   * @param bot
   * @param knex
   * @param config
   * @param commands
   * @returns {PluginAPI}
   */
  getPluginAPI({ bot, knex, config, commands }) {
    return {
      bot,
      knex,
      config,
      commands: {
        manager: commands.manager,
        addGlobalCommand: commands.addGlobalCommand,
        addInboxServerCommand: commands.addInboxServerCommand,
        addInboxThreadCommand: commands.addInboxThreadCommand,
        addAlias: commands.addAlias
      },
      attachments: {
        addStorageType: attachments.addStorageType,
        downloadAttachment: attachments.downloadAttachment
      },
      logs: {
        addStorageType: logs.addStorageType,
        saveLogToStorage: logs.saveLogToStorage,
        getLogUrl: logs.getLogUrl,
        getLogFile: logs.getLogFile,
        getLogCustomResponse: logs.getLogCustomResponse,
      },
      hooks: {
        beforeNewThread,
        afterThreadClose,
      },
      formats,
      webserver,
      threads,
      displayRoles,
    };
  },
};
