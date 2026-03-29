const attachments = require("./data/attachments");
const logs = require("./data/logs");
const { beforeNewThread } = require("./hooks/beforeNewThread");
const {
  beforeNewMessageReceived,
} = require("./hooks/beforeNewMessageReceived");
const { afterNewMessageReceived } = require("./hooks/afterNewMessageReceived");
const { afterThreadClose } = require("./hooks/afterThreadClose");
const {
  afterThreadCloseScheduled,
} = require("./hooks/afterThreadCloseScheduled");
const {
  afterThreadCloseScheduleCanceled,
} = require("./hooks/afterThreadCloseScheduleCanceled");
const formats = require("./formatters");
const webserver = require("./modules/webserver");
const childProcess = require("child_process");
const pacote = require("pacote");
const path = require("path");
const threads = require("./data/threads");
const displayRoles = require("./data/displayRoles");
const { PluginInstallationError } = require("./PluginInstallationError");
const config = require("./cfg");

const PLUGIN_INSTALL_MAX_RETRIES = Number(
  process.env.MM_PLUGIN_INSTALL_MAX_RETRIES || 5,
);
const PLUGIN_INSTALL_RETRY_BASE_DELAY_MS = Number(
  process.env.MM_PLUGIN_INSTALL_RETRY_BASE_DELAY_MS || 10000,
);
const PLUGIN_INSTALL_RETRY_MAX_DELAY_MS = Number(
  process.env.MM_PLUGIN_INSTALL_RETRY_MAX_DELAY_MS || 120000,
);

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryablePluginInstallError(err) {
  const combined = `${err && err.message ? err.message : ""}\n${err && err.stderr ? err.stderr : ""}`;
  return /(?:^|\D)403(?:\D|$)|\bE403\b/i.test(combined);
}

function runNpmInstall(npmProcessName, pluginsToInstall) {
  return new Promise((resolve, reject) => {
    let stderr = "";
    const npmProcess = childProcess.spawn(
      npmProcessName,
      ["install", "--verbose", "--no-save", ...pluginsToInstall],
      { cwd: process.cwd(), shell: true },
    );

    npmProcess.stderr.on("data", (data) => {
      stderr += String(data);
    });
    npmProcess.on("close", (code) => {
      if (code !== 0) {
        const err = new PluginInstallationError(stderr);
        err.stderr = stderr;
        err.code = code;
        return reject(err);
      }
      return resolve();
    });
  });
}

const pluginSources = {
  npm: {
    install(plugins) {
      return new Promise(async (resolve, reject) => {
        try {
          console.log(`Checking ${plugins.length} npm plugin(s)...`);

          const npmGitHubPattern =
            /^([a-z0-9_.-]+)\/([a-z0-9_.-]+)(?:#([a-z0-9_.-]+))?$/i;
          const missingPlugins = [];

          if (config.reinstallPlugins) {
            console.log(
              "reinstallPlugins is set, skipping installation cache...",
            );
            missingPlugins.push(...plugins);
          } else {
            for (const pluginName of plugins) {
              const gitHubPackageParts = pluginName.match(npmGitHubPattern);
              try {
                if (gitHubPackageParts) {
                  const tarballUrl = `https://api.github.com/repos/${gitHubPackageParts[1]}/${gitHubPackageParts[2]}/tarball${gitHubPackageParts[3] ? "/" + gitHubPackageParts[3] : ""}`;
                  const manifest = await pacote.manifest(tarballUrl);
                  require.resolve(manifest.name);
                } else {
                  require.resolve(pluginName);
                }
                console.log(
                  `Plugin '${pluginName}' already installed, skipping.`,
                );
              } catch (e) {
                console.log(
                  `Plugin '${pluginName}' not installed, queuing for install.`,
                );
                missingPlugins.push(pluginName);
              }
            }
          }

          if (missingPlugins.length === 0) {
            console.log("All npm plugins already installed.");
            return resolve();
          }

          console.log(`Installing ${missingPlugins.length} npm plugin(s)...`);

          let finalPluginNames = missingPlugins;
          if (!config.useGitForGitHubPlugins) {
            finalPluginNames = missingPlugins.map((pluginName) => {
              const gitHubPackageParts = pluginName.match(npmGitHubPattern);
              if (!gitHubPackageParts) {
                return pluginName;
              }
              return `https://api.github.com/repos/${gitHubPackageParts[1]}/${gitHubPackageParts[2]}/tarball${gitHubPackageParts[3] ? "/" + gitHubPackageParts[3] : ""}`;
            });
          }

          const npmProcessName = /^win/.test(process.platform)
            ? "npm.cmd"
            : "npm";
          const totalAttempts = Math.max(1, PLUGIN_INSTALL_MAX_RETRIES + 1);

          for (let attempt = 1; attempt <= totalAttempts; attempt++) {
            try {
              if (attempt > 1) {
                console.log(
                  `Retrying npm plugin install (attempt ${attempt}/${totalAttempts})...`,
                );
              }

              await runNpmInstall(npmProcessName, finalPluginNames);
              return resolve();
            } catch (err) {
              const shouldRetry =
                isRetryablePluginInstallError(err) && attempt < totalAttempts;
              if (!shouldRetry) {
                return reject(err);
              }

              const delay = Math.min(
                PLUGIN_INSTALL_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1),
                PLUGIN_INSTALL_RETRY_MAX_DELAY_MS,
              );
              console.log(
                `Plugin install hit HTTP 403/rate limit. Retrying in ${Math.round(delay / 1000)}s...`,
              );
              await wait(delay);
            }
          }
        } catch (err) {
          return reject(err);
        }
      });
    },

    async load(plugin, pluginApi) {
      const manifest = await pacote.manifest(plugin);
      const packageName = manifest.name;
      const pluginFn = require(packageName);
      if (typeof pluginFn !== "function") {
        throw new PluginInstallationError(
          `Plugin '${plugin}' is not a valid plugin`,
        );
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
        throw new PluginInstallationError(
          `Plugin '${plugin}' is not a valid plugin`,
        );
      }
      return pluginFn(pluginApi);
    },
  },
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
        addAlias: commands.addAlias,
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
