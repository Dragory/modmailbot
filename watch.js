import { watch } from "chokidar";
import { spawn } from "child_process";

const log = (message) => {
  console.log(`[${(new Date()).toISOString()}] ${message}`);
};

const fwd = (message) => {
  process.stdout.write(`[${(new Date()).toISOString()}] ${message}`);
};

// 1. Compile each package once and wait for them to finish
function initialCompilation() {
  log("Running initial compilation");
  const buildProcess = spawn("npm", ["run", "build", "--workspace=packages"]);
  buildProcess.stdout.on("data", data => fwd(String(data)));
  buildProcess.stderr.on("data", data => fwd(String(data)));
  return new Promise((resolve, reject) => {
    buildProcess.on("close", code => {
      if (code !== 0) {
        reject(`Initial compilation process exited with code ${code}`);
        return;
      }
      resolve();
    });
  });
}

// 2. Start TSC in watch mode for each package
function watchPackages() {
  log("Watching packages");
  const onWatchOutput = (data) => {
    if (data.includes("Starting compilation in watch mode")) {
      return;
    }
    if (data.includes("Watching for file changes")) {
      return;
    }
    fwd(data);
  };
  const watchProcess = spawn("npm", ["run", "watch", "--workspace=packages"]);
  watchProcess.stdout.on("data", data => onWatchOutput(String(data)));
  watchProcess.stderr.on("data", data => onWatchOutput(String(data)));
}

// 3. Watch the /dist folders of each package for changes and restart the bot
async function watchForBot() {
  log("Monitoring changes for bot restart");

  const closeListener = (code) => {
    log(`Bot process exited with code ${code}, restarting on file change`);
  };

  let botProcess = null;
  const restartBot = (message) => {
    if (message) {
      log(message);
    }

    if (botProcess) {
      botProcess.removeListener("close", closeListener);
      botProcess.kill();
    }

    botProcess = spawn("npm", ["run", "start-dev", "--workspace=apps/bot"]);
    botProcess.stdout.on("data", data => fwd(`[BOT] [OUT] ${String(data)}`));
    botProcess.stderr.on("data", data => fwd(`[BOT] [ERR] ${String(data)}`));
    botProcess.on("close", closeListener);
  };

  // Since package compilation can change multiple files at once, we have a small debounce on the restart
  // so we don't end up restarting the bot process 20 times in a second
  let debounceTimer = null;
  const restartBotDebounced = (...args) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => restartBot(...args), 300);
  };

  const isDistRegex = /\/dist\//;
  const onPackageFileChange = (path) => {
    if (! isDistRegex.test(path)) {
      return;
    }
    restartBotDebounced("Package changes detected, restarting bot");
  };

  const packageWatcher = watch("./packages", {
    ignored: /node_modules/,
    persistent: true,
    ignoreInitial: true,
  });
  packageWatcher.on("add", onPackageFileChange);
  packageWatcher.on("change", onPackageFileChange);
  packageWatcher.on("unlink", onPackageFileChange);

  const onBotSourceFileChange = () => {
    restartBotDebounced("Bot source files changed, restarting bot");
  };

  const botSourceWatcher = watch("./apps/bot/src", {
    ignored: /node_modules/,
    persistent: true,
    ignoreInitial: true,
  });
  botSourceWatcher.on("add", () => onBotSourceFileChange());
  botSourceWatcher.on("change", () => onBotSourceFileChange());
  botSourceWatcher.on("unlink", () => onBotSourceFileChange());

  restartBot("Starting bot");
}

await initialCompilation();
watchPackages();
watchForBot();
