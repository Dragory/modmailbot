// gist: https://gist.github.com/promise/951880b7ee092aedaa5d6f281f181046#file-webserverplugin-js

const server = require("./webserver");
const express = require("express");
const mime = require("mime");
const fs = require("fs");
const config = require("../cfg");
const threads = require("../data/threads");
const attachments = require("../data/attachments");
const { formatters } = require("../formatters");
const crypto = require("crypto");
const bot = require("../bot");
const https = require("https");
const utils = require("../utils");

// CONFIG

// CONFIGURE OAUTH HERE
const botClientSecret = "qtU-8Z7IAAjaK0tYTG2ew9f8QpNHI8Sb";
const oauthPath = "/auth";
const oauthRedirectUri = config.url + oauthPath;
const tokenExpirationInSeconds = 3600; // 1 hour (recommended) - they'll be redirected to the oauth page if it has expired
const encryptionKey = crypto.randomBytes(64).toString("base64");
const attachmentsRequireOauth = true;
const usersNotRequiredToBeInInboxServer = [];

// CONFIGURE CONFIDENTIALITY HERE
const allowMarkingThreadAsConfidential = true; // enable this if you want this module to work
const rolesWithConfidentialAccess = [1346216350376398980];
const usersWithConfidentialAccess = [];
const confidentialAccessToAllAdminsInInboxServer = true;
const markThreadAsConfidentialCommands = ["promote", "elevate", "raise"];
const markThreadAsConfidentialMessage =
  "✅ **This thread is now marked as confidential.** Log access has been restricted to those with confidential access.";
const threadAlreadyConfidentialMessage =
  "⚠️ This thread is already marked as confidential.";
const unmarkThreadAsConfidentialCommands = ["demote", "downgrade", "lower"];
const unmarkThreadAsConfidentialMessage =
  "✅ **This thread is no longer marked as confidential.**";
const threadNotConfidentialMessage = "⚠️ This thread is not confidential.";

// END CONFIG

module.exports = ({ config, commands }) => {
  server.get(
    "/logs/:threadId",
    ...[
      testTokenCookie,
      testUserGeneralAccess,
      testUserConfidentialAccess,
      serveLogs,
    ]
  );
  server.get(
    "/attachments/:attachmentId/:filename",
    ...[
      ...(attachmentsRequireOauth
        ? [testTokenCookie, testUserGeneralAccess]
        : []),
      serveAttachments,
    ]
  );
  server.get(oauthPath, processAuth);
  server.listen(config.port);

  if (allowMarkingThreadAsConfidential) {
    commands.addInboxServerCommand(
      markThreadAsConfidentialCommands.shift(),
      "[threadId:string]",
      async (msg, args, _thread) => {
        const threadId = args.threadId || (_thread && _thread.id);
        if (!threadId) return;

        const thread =
          (await threads.findById(threadId)) ||
          (await threads.findByThreadNumber(threadId));
        if (!thread) return;

        const confidential = thread.getMetadataValue("confidential");
        if (confidential)
          return utils.postSystemMessageWithFallback(
            msg.channel,
            _thread,
            threadAlreadyConfidentialMessage
          );

        thread.setMetadataValue("confidential", true);
        utils.postSystemMessageWithFallback(
          msg.channel,
          _thread,
          markThreadAsConfidentialMessage
        );
      },
      { aliases: markThreadAsConfidentialCommands }
    );

    commands.addInboxServerCommand(
      unmarkThreadAsConfidentialCommands.shift(),
      "[threadId:string]",
      async (msg, args, _thread) => {
        const threadId = args.threadId || (_thread && _thread.id);
        if (!threadId) return;

        const thread =
          (await threads.findById(threadId)) ||
          (await threads.findByThreadNumber(threadId));
        if (!thread) return;

        const confidential = thread.getMetadataValue("confidential");
        if (!confidential)
          return utils.postSystemMessageWithFallback(
            msg.channel,
            _thread,
            threadNotConfidentialMessage
          );

        thread.setMetadataValue("confidential", false);
        utils.postSystemMessageWithFallback(
          msg.channel,
          _thread,
          unmarkThreadAsConfidentialMessage
        );
      },
      { aliases: unmarkThreadAsConfidentialCommands }
    );
  }
};

function badRequest(res) {
  res.sendStatus(400);
}

function forbidden(res, reason) {
  res.status(403).send("Forbidden" + (reason ? ": " + reason : ""));
}

function notFound(res) {
  res.sendStatus(404);
}

function goToOauth(res, path) {
  const url = new URL("https://discord.com/api/oauth2/authorize");
  url.searchParams.set("client_id", bot.user.id);
  url.searchParams.set("redirect_uri", oauthRedirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "identify");
  url.searchParams.set("state", path);
  res.redirect(url.toString());
}

/**
 * @param {express.Request} req
 * @param {express.Response} res
 */
async function serveLogs(req, res) {
  const thread = await threads.findById(req.params.threadId);
  if (!thread) return notFound(res);

  let threadMessages = await thread.getThreadMessages();

  const formatLogResult = await formatters.formatLog(thread, threadMessages, {
    simple: Boolean(req.query.simple),
    verbose: Boolean(req.query.verbose),
  });

  const contentType =
    (formatLogResult.extra && formatLogResult.extra.contentType) ||
    "text/plain; charset=UTF-8";

  res.set("Content-Type", contentType);
  res.send(formatLogResult.content);
}

/**
 * @param {express.Request} req
 * @param {express.Response} res
 */
function serveAttachments(req, res) {
  if (req.params.attachmentId.match(/^[0-9]+$/) === null) return notFound(res);
  if (req.params.filename.match(/^[0-9a-z._-]+$/i) === null)
    return notFound(res);

  const attachmentPath = attachments.getLocalAttachmentPath(
    req.params.attachmentId
  );
  fs.access(attachmentPath, (err) => {
    if (err) return notFound(res);

    const filenameParts = req.params.filename.split(".");
    const ext =
      filenameParts.length > 1
        ? filenameParts[filenameParts.length - 1]
        : "bin";
    const fileMime = mime.getType(ext);

    res.set("Content-Type", fileMime);

    const read = fs.createReadStream(attachmentPath);
    read.pipe(res);
  });
}

/**
 * @param {express.Request} req
 * @param {express.Response} res
 */
async function processAuth(req, res) {
  const path = req.query.state;
  if (!path) return badRequest(res);

  const code = req.query.code;
  if (!code) return goToOauth(res, path);

  const accessToken = await getAccessToken(code);
  if (!accessToken) return goToOauth(res, path);

  const userId = await getUserIdFromAccessToken(accessToken);
  if (!userId) return goToOauth(res, path);

  const jwt = createToken({ userId });
  res.cookie("token", jwt);

  res.redirect(path);
}

// middlewares

/**
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {express.NextFunction} next
 */
function testTokenCookie(req, res, next) {
  // get token from raw cookies
  const cookiePair = (req.headers.cookie || "")
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith("token="));
  const token = cookiePair && cookiePair.split("=")[1];
  if (!token) return goToOauth(res, req.path);

  // validate token
  const decoded = decodeToken(token);
  if (!decoded) return goToOauth(res, req.path);

  // if expired, reauthorize
  if (decoded.expireAt < Date.now()) return goToOauth(res, req.path);

  // if not expired, set userId and go next
  req.userId = decoded.userId;
  next();
}

/**
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {express.NextFunction} next
 */
function testUserGeneralAccess(req, res, next) {
  const { userId } = req;
  if (usersNotRequiredToBeInInboxServer.includes(userId)) return next();

  bot
    .getRESTGuildMember(config.inboxServerId, userId)
    .then((member) => {
      req.inboxMember = member;
      next();
    })
    .catch(() => forbidden(res, "Not in inbox server"));
}

/**
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {express.NextFunction} next
 */
async function testUserConfidentialAccess(req, res, next) {
  if (!allowMarkingThreadAsConfidential) return next();

  const thread = await threads.findById(req.path.split("/").pop());
  if (!thread) return badRequest(res);

  const confidential = thread.getMetadataValue("confidential");

  const { inboxMember, userId } = req;
  if (
    !confidential ||
    (inboxMember &&
      confidentialAccessToAllAdminsInInboxServer &&
      (inboxMember.permissions.allow & 8n) === 8n) ||
    inboxMember.roles.some((r) => rolesWithConfidentialAccess.includes(r)) ||
    usersWithConfidentialAccess.includes(userId)
  )
    return next();

  forbidden(
    res,
    "User has no confidential access (thread marked as confidential)"
  );
}

// discord oauth functions

function getAccessToken(code) {
  return new Promise((resolve) => {
    const params = new URLSearchParams();
    params.set("client_id", bot.user.id);
    params.set("client_secret", botClientSecret);
    params.set("grant_type", "authorization_code");
    params.set("code", code);
    params.set("redirect_uri", oauthRedirectUri);

    https
      .request(
        {
          method: "POST",
          host: "discord.com",
          path: "/api/oauth2/token",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
        (response) => {
          let body = "";
          response.on("data", (chunk) => (body += chunk));
          response.on("end", () => resolve(JSON.parse(body).access_token));
        }
      )
      .end(params.toString());
  });
}

function getUserIdFromAccessToken(accessToken) {
  return new Promise((resolve) => {
    https
      .request(
        {
          method: "GET",
          host: "discord.com",
          path: "/api/oauth2/@me",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
        (response) => {
          let body = "";
          response.on("data", (chunk) => (body += chunk));
          response.on("end", () => resolve((JSON.parse(body).user || {}).id));
        }
      )
      .end();
  });
}

// JWT functions ~~that I stole~~ from https://github.com/hokaccha/node-jwt-simple/blob/master/lib/jwt.js

function createToken(payload) {
  payload.expireAt = Date.now() + tokenExpirationInSeconds * 1000;
  const segments = [];
  segments.push(base64urlEncode(JSON.stringify({ typ: "JWT", alg: "HS256" })));
  segments.push(base64urlEncode(JSON.stringify(payload)));
  segments.push(sign(segments.join(".")));
  return segments.join(".");
}

function decodeToken(token) {
  const segments = token.split(".");
  if (segments.length !== 3) return null;

  const [headerSeg, payloadSeg, signatureSeg] = segments;
  if (signatureSeg !== sign(`${headerSeg}.${payloadSeg}`)) return null;

  return JSON.parse(base64urlDecode(payloadSeg));
}

function sign(input) {
  return base64urlEscape(
    crypto.createHmac("sha256", encryptionKey).update(input).digest("base64")
  );
}

function base64urlDecode(str) {
  return Buffer.from(base64urlUnescape(str), "base64").toString();
}

function base64urlUnescape(str) {
  return (str + "=".repeat(4 - (str.length % 4)))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
}

function base64urlEncode(str) {
  return base64urlEscape(Buffer.from(str).toString("base64"));
}

function base64urlEscape(str) {
  return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
