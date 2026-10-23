"use strict";

/**
 * assistant-bridge — the modmail-side half of the modmail assistant
 * (docs/decisions.md D11: pure plugin, observer, zero src/ modifications).
 *
 * Surfaces:
 *   OUT (events):  in-memory ring buffer → GET /assistant/events?after&wait
 *                  (long-poll; cursor; gap flag). Emits thread_open,
 *                  member_msg, mod_reply (with assistant_origin echo marker),
 *                  thread_close.
 *   IN  (send):    POST /assistant/send — bearer auth, envelope-id
 *                  idempotency, snippet/blocklist assertions, synthetic
 *                  member replyToUser (the bridge renders the persona
 *                  prefix; the assistant sends body text only — D4).
 *   IN  (lookups): GET /assistant/threads|notes|snippets|threads-search|
 *                  messages — confidential threads surface as stubs.
 *   Tags:          snippet_tags table + !tag/!untag/!tags commands.
 *
 * Config (env): ASSISTANT_BRIDGE_TOKEN (bearer; constant-time compare).
 */

const express = require("express");
const crypto = require("node:crypto");

const BLOCKLIST_TRIGGERS = new Set([
	"acceptap",
	"declineap",
	"declineaf",
	"discuss",
	"unmuted",
	"warn",
	"reason",
	"care",
]);

const CATEGORIES = new Set(["auto_faq", "intake", "conversational"]);
const RING_CAPACITY = 1000;
const IDEMPOTENCY_CAPACITY = 10000;
const SEEN_MESSAGE_CAPACITY = 5000;

function guid() {
	return crypto.randomUUID();
}

function nowIso() {
	return new Date().toISOString();
}

function timingSafeEqual(a, b) {
	const ba = Buffer.from(String(a));
	const bb = Buffer.from(String(b));
	if (ba.length !== bb.length) return false;
	return crypto.timingSafeEqual(ba, bb);
}

module.exports = function assistantBridge(pluginApi) {
	const { knex, webserver, hooks, commands, threads } = pluginApi;
	const Thread = require("../src/data/Thread");

	const state = {
		ring: [],
		nextSeq: 1,
		gapSeq: 0,
		parked: [],
		seenMessageIds: new Map(),
		executedSendIds: new Map(),
		inFlightAssistantThreadIds: new Set(),
	};

	function push(type, data, idHint) {
		const envelope = {
			id: idHint ?? `${type.split(".")[1].slice(0, 3)}-${guid()}`,
			source: "modmail-bridge",
			type,
			time: nowIso(),
			data,
		};
		const seq = state.nextSeq;
		state.nextSeq += 1;
		state.ring.push({ seq, envelope });
		if (state.ring.length > RING_CAPACITY) {
			state.ring.shift();
			state.gapSeq = state.ring[0].seq;
		}
		flushParked();
		return envelope;
	}

	function flushParked() {
		const remaining = [];
		for (const p of state.parked) {
			const events = state.ring.filter((e) => e.seq > p.after);
			if (events.length > 0 || p.deadline <= Date.now()) {
				clearTimeout(p.timer);
				respondFeed(p.res, p.after);
			} else {
				remaining.push(p);
			}
		}
		state.parked = remaining;
	}

	function respondFeed(res, after) {
		const eligible = state.ring.filter((e) => e.seq > after);
		const cursor = eligible.length > 0 ? eligible[eligible.length - 1].seq : after;
		const gap = state.gapSeq > after + 1 && state.gapSeq > 0;
		res.status(200).json({
			events: eligible.map((e) => e.envelope),
			cursor,
			gap,
		});
	}

	function seen(key, cache) {
		if (cache.has(key)) return true;
		cache.set(key, true);
		if (cache.size > (cache === state.seenMessageIds ? SEEN_MESSAGE_CAPACITY : IDEMPOTENCY_CAPACITY)) {
			const oldest = cache.keys().next().value;
			cache.delete(oldest);
		}
		return false;
	}

	// -- events: member_msg ---------------------------------------------------

	hooks.afterNewMessageReceived(async ({ message, opts }) => {
		if (!message || !opts?.thread) return;
		if (seen(message.id, state.seenMessageIds)) return;

		let attachments = [];
		let replyTo = null;
		try {
			const row = await threads.findThreadMessageByDMMessageId(message.id);
			if (row) {
				attachments = row.attachments ? JSON.parse(row.attachments) : [];
			}
			replyTo = message.referencedMessage?.id ?? null;
		} catch {
			attachments = [];
		}

		push("modmail.member_msg.v1", {
			thread_id: opts.thread.id,
			thread_number: opts.thread.thread_number,
			channel_id: opts.thread.channel_id,
			user: { id: message.author?.id ?? "", name: message.author?.username ?? "" },
			text: message.content ?? "",
			attachments: attachments.map((url) => {
				const u = typeof url === "string" ? url : url.url;
				const filename = u.split("/").pop() ?? "attachment";
				return {
					url: u,
					filename,
					content_type: "application/octet-stream",
					size: 0,
				};
			}),
			reply_to_message_id: replyTo,
			confidential: opts.thread.getMetadataValue?.("confidential") === true,
		});
	});

	// -- events: thread_open (wrap, call through) ------------------------------

	const originalCreateNewThread = threads.createNewThreadForUser;
	threads.createNewThreadForUser = async function wrappedCreateNewThread(user, opts = {}) {
		const thread = await originalCreateNewThread.call(threads, user, opts);
		try {
			const via = opts.source === "mention" ? "mention" : opts.source === "newthread" ? "new_thread" : "dm";
			push("modmail.thread_open.v1", {
				thread_id: thread.id,
				thread_number: thread.thread_number,
				channel_id: thread.channel_id,
				user: { id: user.id, name: user.username, account_age_days: -1 },
				via,
				confidential: thread.getMetadataValue?.("confidential") === true,
			});
		} catch {}
		return thread;
	};

	// -- events: thread_close ---------------------------------------------------

	hooks.afterThreadClose(async ({ threadId }) => {
		try {
			const row = await knex("threads").where("id", threadId).first();
			const scheduled = row?.scheduled_close_at ? new Date(row.scheduled_close_at) <= new Date() : false;
			push("modmail.thread_close.v1", {
				thread_id: threadId,
				thread_number: row?.thread_number ?? 0,
				via: scheduled ? "scheduled" : "command",
				reason_hint: scheduled ? row.scheduled_close_name ?? null : null,
			});
		} catch {}
	});

	// -- events: mod_reply (prototype wrap + echo marker) -----------------------

	const originalReplyToUser = Thread.prototype.replyToUser;
	Thread.prototype.replyToUser = async function wrappedReplyToUser(
		moderator,
		text,
		replyAttachments = [],
		isAnonymous = false,
		messageReference = null,
	) {
		const result = await originalReplyToUser.call(
			this,
			moderator,
			text,
			replyAttachments,
			isAnonymous,
			messageReference,
		);
		try {
			const assistantOrigin = state.inFlightAssistantThreadIds.has(this.id);
			push("modmail.mod_reply.v1", {
				thread_id: this.id,
				thread_number: this.thread_number,
				moderator: {
					id: moderator?.id ?? "",
					name: assistantOrigin
						? "assistant"
						: moderator?.user?.username ?? moderator?.username ?? "",
				},
				text: String(text ?? ""),
				anonymous: isAnonymous === true,
				assistant_origin: assistantOrigin,
			});
		} catch {}
		return result;
	};

	// -- http: auth + parsing -----------------------------------------------------

	const bearer = (req, res, next) => {
		const header = req.headers.authorization ?? "";
		const token = header.startsWith("Bearer ") ? header.slice(7) : "";
		if (!timingSafeEqual(token, process.env.ASSISTANT_BRIDGE_TOKEN ?? "")) {
			res.status(401).json({ error: "unauthorized" });
			return;
		}
		next();
	};

	webserver.use("/assistant", express.json({ limit: "256kb" }));
	webserver.use("/assistant", bearer);

	webserver.get("/assistant/health", (_req, res) => {
		res.status(200).json({ status: "ok" });
	});

	// -- http: events feed ---------------------------------------------------------

	webserver.get("/assistant/events", (req, res) => {
		const after = Number.parseInt(req.query.after ?? "0", 10) || 0;
		const wait = Math.min(Math.max(Number.parseInt(req.query.wait ?? "0", 10) || 0, 0), 30);

		const hasEvents = state.ring.some((e) => e.seq > after);
		if (hasEvents || wait === 0) {
			respondFeed(res, after);
			return;
		}
		const parked = {
			res,
			after,
			deadline: Date.now() + wait * 1000,
			timer: setTimeout(() => {
				const idx = state.parked.indexOf(parked);
				if (idx >= 0) state.parked.splice(idx, 1);
				respondFeed(res, after);
			}, wait * 1000),
		};
		state.parked.push(parked);
	});

	// -- http: send ------------------------------------------------------------------

	webserver.post("/assistant/send", async (req, res) => {
		const body = req.body ?? {};
		const data = body.data ?? body; // accept envelope-wrapped or flat
		const fail = (reason) => res.status(200).json({ delivered: false, dm_message_id: null, duplicate: false, reason });

		if (typeof body.id !== "string" || !/^[a-z]+-[0-9a-f-]{36}$/i.test(body.id)) return fail("validation_failed");
		if (seen(body.id, state.executedSendIds)) {
			return res.status(200).json({ delivered: true, dm_message_id: null, duplicate: true, reason: null });
		}

		const threadId = data.thread_id;
		const text = data.text;
		const responder = data.responder;
		const via = data.via;
		const snippetTrigger = data.snippet_trigger;

		if (typeof threadId !== "string" || typeof text !== "string" || text.length === 0 || text.length > 4000)
			return fail("validation_failed");
		if (typeof responder !== "string" || !/^[A-Za-z0-9 _-]{1,32}$/.test(responder)) return fail("validation_failed");
		if (!["auto", "mod_send", "mod_edit"].includes(via)) return fail("validation_failed");
		if (snippetTrigger !== undefined && !/^[a-z0-9_]+$/i.test(snippetTrigger)) return fail("validation_failed");

		if (snippetTrigger !== undefined) {
			if (BLOCKLIST_TRIGGERS.has(snippetTrigger)) return fail("mod_only");
			const snippet = await knex("snippets").where("trigger", snippetTrigger).first();
			if (!snippet) return fail("stale_snippet");
			const tag = await knex("snippet_tags").where("trigger", snippetTrigger).first();
			if (via === "auto" && tag?.category !== "auto_faq") return fail("stale_snippet");
		}

		const thread = await threads.findById(threadId);
		if (!thread) return fail("thread_not_found");

		const syntheticMember = {
			id: "assistant",
			user: { username: responder, globalName: null },
			nick: null,
			roles: [],
			guild: { roles: { get: () => null } },
		};

		state.inFlightAssistantThreadIds.add(thread.id);
		let delivered = false;
		try {
			delivered = await thread.replyToUser(syntheticMember, text, [], false);
		} finally {
			state.inFlightAssistantThreadIds.delete(thread.id);
		}
		if (!delivered) return fail("dm_failed");

		const newest = await knex("thread_messages")
			.where({ thread_id: thread.id, message_type: 4 })
			.orderBy("id", "desc")
			.first();

		res.status(200).json({
			delivered: true,
			dm_message_id: newest?.dm_message_id ?? null,
			duplicate: false,
			reason: null,
		});
	});

	// -- http: lookups -------------------------------------------------------------------

	webserver.get("/assistant/threads", async (req, res) => {
		const userId = String(req.query.user_id ?? "");
		if (!/^\d{17,20}$/.test(userId)) return res.status(400).json({ error: "bad user_id" });
		const rows = await knex("threads").where("user_id", userId).orderBy("created_at", "desc");
		const summaries = [];
		for (const row of rows) {
			const confidential = parseConfidential(row.metadata);
			if (confidential) {
				summaries.push({
					thread_id: row.id,
					thread_number: row.thread_number,
					status: statusName(row.status),
					created_at: row.created_at,
					message_count: null,
					snippet_triggers_used: [],
					confidential: true,
				});
				continue;
			}
			const [{ count }] = await knex("thread_messages").where("thread_id", row.id).count("id as count");
			const triggers = await snippetTriggersUsed(knex, row.id);
			summaries.push({
				thread_id: row.id,
				thread_number: row.thread_number,
				status: statusName(row.status),
				created_at: row.created_at,
				message_count: count,
				snippet_triggers_used: triggers,
				confidential: false,
			});
		}
		res.status(200).json(summaries);
	});

	webserver.get("/assistant/notes", async (req, res) => {
		const userId = String(req.query.user_id ?? "");
		if (!/^\d{17,20}$/.test(userId)) return res.status(400).json({ error: "bad user_id" });
		const rows = await knex("notes").where("user_id", userId).orderBy("created_at", "desc");
		res.status(200).json(rows);
	});

	webserver.get("/assistant/snippets", async (_req, res) => {
		const rows = await knex("snippets").orderBy("trigger");
		const tags = await knex("snippet_tags");
		const tagByTrigger = new Map(tags.map((t) => [t.trigger, t]));
		res.status(200).json(
			rows.map((s) => ({
				trigger: s.trigger,
				body: s.body,
				category: tagByTrigger.get(s.trigger)?.category ?? null,
				category_source: tagByTrigger.get(s.trigger)?.category_source ?? null,
				created_at: s.created_at,
			})),
		);
	});

	webserver.get("/assistant/threads-search", async (req, res) => {
		const q = String(req.query.q ?? "");
		if (q.length < 3) return res.status(400).json({ error: "q must be >= 3 chars" });
		const escaped = q.replace(/[\\%_]/g, (c) => `\\${c}`);
		const rows = await knex("thread_messages")
			.where("body", "like", `%${escaped}%`)
			.orderBy("id", "desc")
			.limit(500);
		const byThread = new Map();
		for (const row of rows) {
			if (byThread.has(row.thread_id)) continue;
			const idx = row.body.indexOf(q);
			const start = Math.max(0, idx - 40);
			const context = row.body.slice(start, idx + q.length + 40);
			byThread.set(row.thread_id, { row, context });
		}
		const hits = [];
		for (const [threadId, { row, context }] of byThread) {
			const thread = await knex("threads").where("id", threadId).first();
			if (!thread) continue;
			const confidential = parseConfidential(thread.metadata);
			hits.push({
				thread_id: threadId,
				thread_number: thread.thread_number,
				status: statusName(thread.status),
				created_at: thread.created_at,
				message_count: confidential ? null : await messageCount(knex, threadId),
				snippet_triggers_used: confidential ? [] : await snippetTriggersUsed(knex, threadId),
				confidential,
				appellant_user_id: thread.user_id,
				matched_context: context,
			});
		}
		res.status(200).json(hits);
	});

	webserver.get("/assistant/messages", async (req, res) => {
		const threadId = String(req.query.thread_id ?? "");
		const thread = await knex("threads").where("id", threadId).first();
		if (!thread) return res.status(404).json({ error: "thread not found" });
		if (parseConfidential(thread.metadata)) {
			return res.status(200).json({ confidential: true, messages: [] });
		}
		const rows = await knex("thread_messages").where("thread_id", threadId).orderBy("created_at");
		res.status(200).json({
			confidential: false,
			messages: rows.map((m) => ({
				message_type: m.message_type,
				user_name: m.user_name ?? "",
				body: m.body ?? "",
				created_at: m.created_at,
				anonymous: m.is_anonymous === 1 || m.is_anonymous === true,
			})),
		});
	});

	// -- tags table + commands ---------------------------------------------------------

	knex.schema.hasTable("snippet_tags").then((exists) => {
		if (exists) return;
		return knex.schema.createTable("snippet_tags", (t) => {
			t.string("trigger", 32).primary();
			t.string("category", 32).notNull();
			t.string("category_source", 8).notNull().defaultTo("human");
			t.string("tagged_by", 20);
			t.datetime("tagged_at");
		});
	});

	commands.addInboxServerCommand("tag", "<trigger:string> <category:string>", async (msg, args) => {
		const trigger = String(args.trigger ?? "").toLowerCase();
		const category = String(args.category ?? "").toLowerCase();
		if (!CATEGORIES.has(category)) {
			await msg.channel.createMessage(`Unknown category \`${category}\`. Valid: auto_faq, intake, conversational.`);
			return;
		}
		const snippet = await knex("snippets").where("trigger", trigger).first();
		if (!snippet) {
			await msg.channel.createMessage(`No snippet named \`${trigger}\`.`);
			return;
		}
		await knex("snippet_tags")
			.insert({ trigger, category, category_source: "human", tagged_by: msg.author.id, tagged_at: nowIso().slice(0, 19).replace("T", " ") })
			.onConflict("trigger")
			.merge({ category, category_source: "human", tagged_by: msg.author.id });
		await msg.channel.createMessage(`✅ \`${trigger}\` → **${category}**`);
	});

	commands.addInboxServerCommand("untag", "<trigger:string>", async (msg, args) => {
		const trigger = String(args.trigger ?? "").toLowerCase();
		const deleted = await knex("snippet_tags").where("trigger", trigger).del();
		await msg.channel.createMessage(deleted ? `🗑️ \`${trigger}\` untagged` : `No tag on \`${trigger}\`.`);
	});

	commands.addInboxServerCommand("tags", "", async (msg) => {
		const snippets = await knex("snippets").orderBy("trigger");
		const tags = await knex("snippet_tags");
		const tagged = new Map(tags.map((t) => [t.trigger, t]));
		const lines = [];
		for (const cat of ["auto_faq", "intake", "conversational"]) {
			const names = snippets.filter((s) => tagged.get(s.trigger)?.category === cat).map((s) => s.trigger);
			lines.push(`**${cat}** (${names.length}): ${names.join(", ") || "—"}`);
		}
		const llm = tags.filter((t) => t.category_source === "llm").map((t) => t.trigger);
		if (llm.length > 0) lines.push(`🤖 llm-adopted: ${llm.join(", ")}`);
		lines.push(`⚠️ blocklist (locked): ${[...BLOCKLIST_TRIGGERS].join(", ")}`);
		const untagged = snippets.filter((s) => !tagged.has(s.trigger)).map((s) => s.trigger);
		if (untagged.length > 0) lines.push(`❓ untagged: ${untagged.join(", ")}`);
		await msg.channel.createMessage(lines.join("\n").slice(0, 1900));
	});
};

// -- helpers ------------------------------------------------------------------

function parseConfidential(metadata) {
	if (!metadata) return false;
	try {
		return JSON.parse(metadata).confidential === true;
	} catch {
		return false;
	}
}

function statusName(status) {
	if (status === 2) return "closed";
	if (status === 3) return "suspended";
	return "open";
}

async function snippetTriggersUsed(knex, threadId) {
	const rows = await knex("thread_messages").where({ thread_id: threadId, message_type: 6 });
	const triggers = new Set();
	for (const row of rows) {
		const m = /^\s*!{2,3}([a-z0-9_]+)/i.exec(row.body ?? "");
		if (m) triggers.add(m[1].toLowerCase());
	}
	return [...triggers];
}

async function messageCount(knex, threadId) {
	const [{ count }] = await knex("thread_messages").where("thread_id", threadId).count("id as count");
	return count;
}
