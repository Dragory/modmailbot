"use strict";

/**
 * Test harness for plugins/assistant-bridge.js (D12: fully mocked boundary).
 * Fabricates the modmail plugin-API surface: in-memory SQLite fixture DB
 * carrying the modmail schema subset, fake Thread/threads modules injected
 * via require.cache, a real express app as the webserver handle, and
 * capturing registries for hooks and commands. The plugin loads against
 * this exactly as modmail would load it.
 */

const knex = require("knex");
const express = require("express");
const path = require("node:path");
const crypto = require("node:crypto");

const REPO_ROOT = path.join(__dirname, "..", "..");
const PLUGIN_PATH = path.join(REPO_ROOT, "plugins", "assistant-bridge.js");
const THREAD_SRC = path.join(REPO_ROOT, "src", "data", "Thread.js");
const THREADS_SRC = path.join(REPO_ROOT, "src", "data", "threads.js");

let guidCounter = 0;
function guid() {
	guidCounter += 1;
	return crypto.randomUUID();
}

function modmailTime(offsetSeconds = 0) {
	return new Date(Date.now() + offsetSeconds * 1000).toISOString().slice(0, 19).replace("T", " ");
}

async function createFixtureDb() {
	const db = knex({
		client: "sqlite3",
		connection: { filename: ":memory:" },
		pool: { min: 1, max: 1 },
		useNullAsDefault: true,
	});

	await db.schema.createTable("threads", (t) => {
		t.string("id", 36).primary();
		t.integer("status").defaultTo(1);
		t.string("user_id", 20).index();
		t.string("user_name", 128);
		t.string("channel_id", 20).unique();
		t.datetime("created_at");
		t.integer("thread_number");
		t.string("scheduled_close_at");
		t.string("scheduled_close_id");
		t.string("scheduled_close_name");
		t.boolean("scheduled_close_silent");
		t.text("metadata");
		t.boolean("is_legacy").defaultTo(0);
	});

	await db.schema.createTable("thread_messages", (t) => {
		t.increements = undefined;
		t.bigIncrements("id").primary();
		t.string("thread_id", 36).index();
		t.integer("message_type");
		t.integer("message_number").nullable();
		t.string("user_id", 20).nullable();
		t.string("user_name", 128).nullable();
		t.text("body");
		t.boolean("is_anonymous").defaultTo(0);
		t.text("attachments");
		t.text("small_attachments");
		t.string("dm_channel_id");
		t.string("dm_message_id").nullable();
		t.string("inbox_message_id").nullable();
		t.datetime("created_at").index();
		t.text("metadata");
	});

	await db.schema.createTable("snippets", (t) => {
		t.string("trigger", 32).primary();
		t.text("body");
		t.string("created_by", 20);
		t.datetime("created_at");
	});

	await db.schema.createTable("notes", (t) => {
		t.increments("id").primary();
		t.string("user_id", 20).index();
		t.string("author_id", 20).index();
		t.mediumtext("body");
		t.datetime("created_at");
	});

	return db;
}

/** Fake Thread class: records replyToUser calls; metadata from the row. */
class FakeThread {
	constructor(row) {
		this.id = row.id;
		this.thread_number = row.thread_number;
		this.status = row.status;
		this.user_id = row.user_id;
		this.user_name = row.user_name;
		this.channel_id = row.channel_id;
		this.metadata = row.metadata ? JSON.parse(row.metadata) : {};
		this.replyCalls = [];
		this._row = row;
	}

	async replyToUser(moderator, text, replyAttachments = [], isAnonymous = false, messageReference = null) {
		this.replyCalls.push({ moderator, text, replyAttachments, isAnonymous, messageReference });
		if (FakeThread.replyOutcome === "fail") return false;
		return true;
	}

	getMetadataValue(key) {
		return this.metadata[key];
	}

	async setMetadataValue(key, value) {
		this.metadata[key] = value;
	}
}
FakeThread.replyOutcome = "ok";
FakeThread.instances = [];

/** Builds the fake src/data/threads module object backed by the fixture DB. */
function buildFakeThreadsModule(db) {
	const mod = {
		findById: async (id) => {
			const row = await db("threads").where("id", id).first();
			return row ? threadForRow(row) : null;
		},
		findByThreadNumber: async (n) => {
			const row = await db("threads").where("thread_number", n).first();
			return row ? threadForRow(row) : null;
		},
		findByChannelId: async (cid) => {
			const row = await db("threads").where("channel_id", cid).first();
			return row ? threadForRow(row) : null;
		},
		findOpenThreadByChannelId: async (cid) => {
			const row = await db("threads").where({ channel_id: cid, status: 1 }).first();
			return row ? threadForRow(row) : null;
		},
		getClosedThreadsByUserId: async (uid) => db("threads").where({ user_id: uid, status: 2 }),
		findThreadMessageByDMMessageId: async (dmMessageId) => {
			const row = await db("thread_messages").where("dm_message_id", dmMessageId).first();
			return row || null;
		},
		/** The "original" the plugin wraps; creates a thread row + FakeThread. */
		createNewThreadForUser: async (user, opts = {}) => {
			const [row] = await db("threads")
				.insert({
					id: guid(),
					status: 1,
					user_id: user.id,
					user_name: user.username,
					channel_id: `1000000000000${Math.floor(Math.random() * 100000)}`,
					created_at: modmailTime(),
					thread_number: Math.floor(Math.random() * 100000),
					metadata: "{}",
				})
				.returning("*");
			return threadForRow(row);
		},
	};
	function threadForRow(row) {
		const t = new FakeThread(row);
		FakeThread.instances.push(t);
		return t;
	}
	return mod;
}

/**
 * Creates the harness. Loads the plugin ONCE with fakes injected into
 * require.cache, exactly as modmail would load it via src/plugins.js.
 */
async function createHarness() {
	const db = await createFixtureDb();
	const fakeThreads = buildFakeThreadsModule(db);

	// Inject fakes into require.cache so the plugin's relative requires
	// resolve to them (mirrors same-process module caching in modmail).
	const prevThread = require.cache[THREAD_SRC];
	const prevThreads = require.cache[THREADS_SRC];
	const prevPlugin = require.cache[PLUGIN_PATH];
	require.cache[THREAD_SRC] = { id: THREAD_SRC, filename: THREAD_SRC, loaded: true, exports: FakeThread };
	require.cache[THREADS_SRC] = { id: THREADS_SRC, filename: THREADS_SRC, loaded: true, exports: fakeThreads };

	const app = express();
	const hooks = {};
	for (const name of [
		"beforeNewThread",
		"beforeNewMessageReceived",
		"afterNewMessageReceived",
		"afterThreadClose",
		"afterThreadCloseScheduled",
		"afterThreadCloseScheduleCanceled",
	]) {
		const fns = [];
		hooks[name] = (fn) => fns.push(fn);
		hooks[`${name}__fns`] = fns;
	}

	const commandHandlers = {};
	const commands = {
		manager: {},
		addGlobalCommand: () => {},
		addInboxServerCommand: (name, _schema, handler) => {
			commandHandlers[name] = handler;
		},
		addInboxThreadCommand: (name, _schema, handler) => {
			commandHandlers[name] = handler;
		},
		addAlias: () => {},
	};

	const sentMessages = [];
	const bot = {
		createMessage: async (channelId, content) => {
			sentMessages.push({ channelId, content });
			return { id: guid() };
		},
	};

	const config = { port: 0, plugins: [] };

	const pluginApi = {
		bot,
		knex: db,
		config,
		commands,
		attachments: {},
		logs: {},
		hooks,
		formats: {},
		webserver: app,
		threads: fakeThreads,
		displayRoles: {},
	};

	process.env.ASSISTANT_BRIDGE_TOKEN = "test-token-0123456789abcdef0123456789abcdef";

	let plugin;
	try {
		delete require.cache[PLUGIN_PATH];
		plugin = require(PLUGIN_PATH);
		plugin(pluginApi);
	} finally {
		if (prevThread) require.cache[THREAD_SRC] = prevThread;
		else delete require.cache[THREAD_SRC];
		if (prevThreads) require.cache[THREADS_SRC] = prevThreads;
		else delete require.cache[THREADS_SRC];
	}

	// Boot on an ephemeral port for real HTTP (long-poll needs it).
	const harness = {
		server: null,
		baseUrl: "",
		db,
		api: pluginApi,
		fakeThreads,
		FakeThread,
		hooks,
		commandHandlers,
		sentMessages,
		request: async (method, url, body, headers = {}) => {
			const res = await fetch(`${harness.baseUrl}${url}`, {
				method,
				headers: {
					authorization: `Bearer ${process.env.ASSISTANT_BRIDGE_TOKEN}`,
					...(body !== undefined ? { "content-type": "application/json" } : {}),
					...headers,
				},
				body: body === undefined ? undefined : JSON.stringify(body),
			});
			let json = null;
			try {
				json = await res.json();
			} catch {}
			return { status: res.status, json };
		},
		seedThread,
		seedMessage,
		seedSnippet,
		seedNote,
		emitMemberMsg,
		guid,
		modmailTime,
		close: async () => {
			await new Promise((resolve) => harness.server?.close(resolve));
			await db.destroy();
			if (prevPlugin) require.cache[PLUGIN_PATH] = prevPlugin;
		},
	};

	await new Promise((resolve) => {
		harness.server = app.listen(0, "127.0.0.1", resolve);
	});
	harness.baseUrl = `http://127.0.0.1:${harness.server.address().port}`;

	// -- fixture helpers (hoisted; used by the harness object above) ----------

	async function seedThread(overrides = {}) {
		const row = {
			id: guid(),
			status: 1,
			user_id: "321987654321098765",
			user_name: "example",
			channel_id: `1298765432109${Math.floor(Math.random() * 100000)}`,
			created_at: modmailTime(),
			thread_number: 4000 + Math.floor(Math.random() * 9000),
			metadata: "{}",
			...overrides,
		};
		await db("threads").insert(row);
		return row;
	}

	async function seedMessage(threadId, overrides = {}) {
		const row = {
			thread_id: threadId,
			message_type: 3,
			user_id: "321987654321098765",
			user_name: "example",
			body: "message text",
			attachments: "[]",
			dm_message_id: null,
			created_at: modmailTime(),
			...overrides,
		};
		if (row.attachments && Array.isArray(row.attachments)) {
			row.attachments = JSON.stringify(row.attachments);
		}
		const [inserted] = await db("thread_messages").insert(row).returning("*");
		return inserted;
	}

	async function seedSnippet(trigger, body, overrides = {}) {
		await db("snippets")
			.insert({
				trigger,
				body,
				created_by: "555987654321098765",
				created_at: modmailTime(),
				...overrides,
			})
			.onConflict("trigger")
			.merge({ body, created_at: modmailTime() });
	}

	async function seedNote(userId, body, overrides = {}) {
		const [row] = await db("notes")
			.insert({ user_id: userId, author_id: "555987654321098765", body, created_at: modmailTime(), ...overrides })
			.returning("*");
		return row;
	}

	/** Fires the afterNewMessageReceived hook like Thread.receiveUserReply. */
	async function emitMemberMsg(msgOverrides = {}, threadRowOverrides = {}) {
		const threadRow = await seedThread(threadRowOverrides);
		const dmId = msgOverrides.id ?? guid();
		await seedMessage(threadRow.id, { dm_message_id: dmId });
		const resolved = await fakeThreads.findById(threadRow.id);
		const message = {
			id: dmId,
			content: "hello",
			attachments: [],
			author: { id: threadRow.user_id, username: threadRow.user_name },
			referencedMessage: null,
			...msgOverrides,
		};
		for (const fn of hooks.afterNewMessageReceived__fns) {
			await fn({ user: message.author, message, opts: { thread: resolved, message } });
		}
		return { threadRow, dmId };
	}

	return harness;
}

module.exports = { createHarness, guid, modmailTime };
