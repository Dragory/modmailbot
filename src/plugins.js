const attachments = require("./data/attachments");
const logs = require("./data/logs");
const { beforeNewThread } = require("./hooks/beforeNewThread");
const { beforeNewMessageReceived } = require("./hooks/beforeNewMessageReceived");
const { afterNewMessageReceived } = require("./hooks/afterNewMessageReceived");
const { afterThreadClose } = require("./hooks/afterThreadClose");
const { afterThreadCloseScheduled } = require("./hooks/afterThreadCloseScheduled");
const { afterThreadCloseScheduleCanceled } = require("./hooks/afterThreadCloseScheduleCanceled");
const formats = require("./formatters");
const webserver = require("./modules/webserver");
const childProcess = require("child_process");
const pacote = require("pacote");
const path = require("path");
const threads = require("./data/threads");
const displayRoles = require("./data/displayRoles");
const { PluginInstallationError } = require("./PluginInstallationError");
const config = require("./cfg");

const pluginSources = {
  npm: {
    install(plugins) {
      return new Promise((resolve, reject) => {
        console.log(`Installing ${plugins.length} plugins from NPM...`);

        let finalPluginNames = plugins;
        if (! config.useGitForGitHubPlugins) {
          // Rewrite GitHub npm package names to full GitHub tarball links to avoid
          // needing to have Git installed to install these plugins.

          // $1 package author, $2 package name, $3 branch (optional)
          const npmGitHubPattern = /^([a-z0-9_.-]+)\/([a-z0-9_.-]+)(?:#([a-z0-9_.-]+))?$/i;
          finalPluginNames = plugins.map(pluginName => {
            const gitHubPackageParts = pluginName.match(npmGitHubPattern);
            if (! gitHubPackageParts) {
              return pluginName;
            }

            return `https://api.github.com/repos/${gitHubPackageParts[1]}/${gitHubPackageParts[2]}/tarball${gitHubPackageParts[3] ? "/" + gitHubPackageParts[3] : ""}`;
          });
        }

        let stderr = "";
        const npmProcessName = /^win/.test(process.platform) ? "npm.cmd" : "npm";
        const npmProcess = childProcess.spawn(
          npmProcessName,
          ["install", "--verbose", "--no-save", ...finalPluginNames],
          { cwd: process.cwd() }
        );
        npmProcess.stderr.on("data", data => { stderr += String(data) });
        npmProcess.on("close", code => {
          if (code !== 0) {
            return reject(new PluginInstallationError(stderr));
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
        throw new PluginInstallationError(`Plugin '${plugin}' is not a valid plugin`);
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
        throw new PluginInstallationError(`Plugin '${plugin}' is not a valid plugin`);
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
   * @returns {PluginAPI}
   */
  getPluginAPI({ bot, knex, commands }) {
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
        downloadAttachment: attachments.downloadAttachment,
        saveAttachment: attachments.saveAttachment,
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
        beforeNewMessageReceived,
        afterNewMessageReceived,
        afterThreadClose,
        afterThreadCloseScheduled,
        afterThreadCloseScheduleCanceled,
      },
      formats,
      webserver,
      threads,
      displayRoles,
    };
  },
};
