const fs = require("fs");
const path = require("path");

const gitDir = path.resolve(__dirname, "..", ".git");

function getPackageVersion() {
  const packageJson = require("../package.json");
  return packageJson.version;
}

function getHeadCommitHash() {
  try {
    fs.accessSync(gitDir);
  } catch (e) {
    return null;
  }

  // Find HEAD ref and read the commit hash from that ref
  const headRefInfo = fs.readFileSync(path.resolve(gitDir, "HEAD"), { encoding: "utf8" });
  if (headRefInfo.startsWith("ref:")) {
    const refPath = headRefInfo.slice(5).trim(); // ref: refs/heads/... to refs/heads/...
    return fs.readFileSync(path.resolve(gitDir, refPath), { encoding: "utf8" }).trim();
  } else {
    // Detached head, just the commit hash
    return headRefInfo.trim();
  }
}

function getPrettyVersion() {
  const packageVersion = getPackageVersion();
  const headCommitHash = getHeadCommitHash();

  return headCommitHash
    ? `v${packageVersion} (${headCommitHash.slice(0, 7)})`
    : packageVersion;
}

module.exports = {
  getPrettyVersion,
};
