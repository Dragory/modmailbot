# Marvel Modmail — Fork Changes

This repository is a fork of [Dragory/modmailbot](https://github.com/Dragory/modmailbot) (upstream remote `upstream`, default comparison `git diff upstream/master...master`). This document lists every intentional deviation so upstream merges stay mechanical. Last verified against upstream `536317c` (v3.11.0 + 7 commits, contained in fork master via PR #5).

| # | Change | Files | Config keys |
|---|--------|-------|-------------|
| 1 | OAuth2 log/attachment protection + confidential threads | `src/modules/webserver.js`, `src/modules/webserverPlugin.js` | `oauthClientSecret`, `confidentialAccessRoleIds`, `confidentialAccessUserIds` |
| 2 | Suppress Discord embeds on posted links | `src/modules/close.js`, `src/main.js` | — |
| 3 | Plugin install resilience (rate-limit retries + install skip) | `src/plugins.js` | `reinstallPlugins`; env `MM_PLUGIN_INSTALL_MAX_RETRIES`, `MM_PLUGIN_INSTALL_RETRY_BASE_DELAY_MS`, `MM_PLUGIN_INSTALL_RETRY_MAX_DELAY_MS` |
| 4 | Error resilience | `src/bot.js`, `src/index.js` | — |
| 5 | SQLite connection pool | `src/knexConfig.js` | — |
| 6 | Docker/infra | `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `packages/*` (pinned plugin gitlinks) | — |
| 7 | Privacy policy | `PRIVACY_POLICY.md` | — |

## 1. OAuth2 log/attachment protection + confidential threads

Based on https://gist.github.com/promise/951880b7ee092aedaa5d6f281f181046 (adapted).

**What:** The `/logs` and `/attachments` routes were moved from webserver.js into webserverPlugin.js behind Discord OAuth2 (identify scope, JWT cookie, 1h expiry, random per-boot HMAC key — NOTE: OAuth sessions are invalidated on every bot restart). Inbox-server membership is required; attachments also require OAuth. Confidential threads: `!promote`/`!elevate`/`!raise` marks a thread confidential, `!demote`/`!downgrade`/`!lower` unmarks it; confidential logs are restricted to inbox-server admins, configured roles, and configured users.

Config keys (config.ini, gitignored):
- `oauthClientSecret` — required; the bot fails to start without it (Discord Developer Portal → app → Bot → Client Secret). The previously committed value is in git history and must be treated as compromised — rotate it.
- `confidentialAccessRoleIds` — comma-separated role IDs.
- `confidentialAccessUserIds` — comma-separated user IDs.

**Merge notes:** Upstream changes to webserver.js routes/log formatting must be manually mirrored into webserverPlugin.js's `serveLogs`/`serveAttachments` (this happened for the embed-summarisation feature in upstream v3.11.0-era code). webserver.js is upstream minus the two route registrations.

## 2. Suppress Discord embeds on posted links

**What:** Close notifications post `Logs: <url>`; bot-mention notifications inline the message link wrapped as `<link>`.

**Why:** Unwrapped URLs render embeds in Discord.

**Merge notes:** One-line strings in close.js (`sendCloseNotification`) and main.js (bot-mention handler).

## 3. Plugin install resilience

**What:** Before installing, each npm plugin is probed with `require.resolve` and each GitHub `owner/repo#branch` spec with `pacote.manifest` + `require.resolve(manifest.name)`; `npm install` is skipped entirely when everything is already present (image-baked node_modules). Installs are retried on HTTP 403 with exponential backoff (10s base, 120s cap, `MM_PLUGIN_INSTALL_MAX_RETRIES` extra attempts, default 5; prod sets 10). The `reinstallPlugins` config key forces a full reinstall.

**Why:** Restart loops were rate-limiting api.github.com (429/403) and wedging the bot.

**Known limitation (follow-up):** The `pacote.manifest` probe itself hits api.github.com on every boot for GitHub-hosted plugins; the real fix is caching resolved manifests to persistent disk. `GITHUB_TOKEN` in the deployment environment (see docker-compose.yml / Komodo stack) authenticates api.github.com requests and raises rate limits.

**Merge notes:** Install logic lives entirely in the `pluginSources.npm.install` body + helpers above it; upstream changes elsewhere in plugins.js merge cleanly.

## 4. Error resilience

**What:** `EAI_AGAIN` (transient DNS failure) is added to Eris's safe-to-ignore error codes; "Invalid channel ID:" Eris cache-race errors are ignored; ignored errors log a `[Eris warning]` line; uncaught/unhandled errors additionally print a one-line `[Error summary]` to stdout (type/code/message) so root causes survive truncated stack traces in noisy logs.

**Why:** transient DNS failures (EAI_AGAIN) and a known Eris cache-race error crashed the bot during network blips; the one-line summaries keep root causes visible in truncated production logs.

**Merge notes:** bot.js additions cluster around `SAFE_TO_IGNORE_ERROR_CODES`; index.js adds `getStdoutErrorSummary()` + one console.log in `errorHandler`.

## 5. SQLite connection pool

**What:** The sqlite connection is pinned to a single pooled connection (min 1 / max 1, 60s acquire timeout, 30s idle timeout).

**Why:** Serialized queries avoided SQLITE_BUSY errors under the bot's load.

**Merge notes:** Block append inside the `sqlite` branch of knexConfig.js.

## 6. Docker/infra

**What:** `Dockerfile` (node:24-alpine + git), `docker-compose.yml` (reference local setup: config.ini bind-mount, db + node_modules volumes, `GITHUB_TOKEN` → `~/.npmrc` auth for api.github.com), `.dockerignore`. `packages/` contains pinned gitlinks (commit-pinned clones, no .gitmodules) of third-party plugins: CloseAddons, LogSearch, MMEmergencyLink, Ping, modmailbot-formatter.

Production does NOT use docker-compose.yml — it runs the `marvel-modmail` Komodo stack with the locally built encrypted image `marvel-modmail-enc` (config at `/home/nimrod/code/Marvel-Modmail/config.ini`, encrypted DB volume `db-encrypted`, env `GITHUB_TOKEN` / `MM_PLUGIN_INSTALL_MAX_RETRIES=10` / `DB_PASSPHRASE`).

**Merge notes:** These files are fork-only; upstream has no docker files. Gitlink pins update via `git add packages/<name>` after entering the dir and checking out the desired commit.

## 7. Privacy policy

**What:** Our privacy policy served by upstream's built-in privacy-policy feature from `PRIVACY_POLICY.md` (repo root; contact marvel@rocked03.dev).

**Merge notes:** File content only; upstream's webserver.js serves it verbatim.

## Merging upstream

```
git fetch upstream
git switch -c merge-upstream-<version>
git merge upstream/master
# resolve conflicts file-by-file using the sections above as the divergence map
# after resolving: git diff upstream/master...HEAD should again match this document's inventory
npm run lint && node src/index.js (with local config)
# PR into master; keep this document updated with anything new
```

## Deploying

Rebuild the `marvel-modmail-enc` image from `master` on the host, then redeploy the Komodo stack `marvel-modmail`. The host config.ini must contain `oauthClientSecret` (and optionally `confidentialAccessRoleIds`, `confidentialAccessUserIds`). Verify the startup log shows `Starting Modmail v<version> (<sha>)` and `Loaded N plugins`. The Discord application must have `https://<config.url>/auth` registered as an OAuth2 redirect URI (Discord Developer Portal → the app → OAuth2 → Redirects); the production bot already has this registered.
