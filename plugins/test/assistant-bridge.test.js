"use strict";

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHarness, guid } from "./harness.js";

let h;

beforeAll(async () => {
	h = await createHarness();
});

afterAll(async () => {
	await h.close();
});

const sendEnvelope = (overrides = {}) => ({
	id: `send-${guid()}`,
	source: "assistant",
	type: "assistant.send.v1",
	time: new Date().toISOString(),
	data: {
		thread_id: "will-be-set",
		text: "Thanks for flagging this — could you send the user IDs involved?",
		snippet_trigger: undefined,
		responder: "FRIDAY",
		via: "mod_send",
		decision_id: `dec-${guid()}`,
		...overrides,
	},
});

describe("auth + health", () => {
	it("health returns 200 with the bearer token", async () => {
		const res = await h.request("GET", "/assistant/health");
		expect(res.status).toBe(200);
		expect(res.json).toEqual({ status: "ok" });
	});

	it("returns 401 without a token", async () => {
		const res = await fetch(`${h.baseUrl}/assistant/health`);
		expect(res.status).toBe(401);
	});
});

describe("events feed + member_msg", () => {
	it("emits member_msg with durable attachments from the DB row", async () => {
		const { threadRow } = await h.emitMemberMsg(
			{ content: "Haiiii :))" },
			{ thread_number: 4812 },
		);
		await h.seedMessage(threadRow.id, {
			message_type: 3,
			dm_message_id: guid(),
			attachments: JSON.stringify(["https://modmail.example/attachments/991/screen.png"]),
		});
		const res = await h.request("GET", "/assistant/events?after=0&wait=0");
		expect(res.status).toBe(200);
		const memberMsg = res.json.events.find((e) => e.type === "modmail.member_msg.v1");
		expect(memberMsg).toBeTruthy();
		expect(memberMsg.data.thread_id).toBe(threadRow.id);
		expect(memberMsg.data.text).toBe("Haiiii :))");
		expect(memberMsg.data.confidential).toBe(false);
	});

	it("carries reply_to_message_id when the member replied to a bot message", async () => {
		const replyTarget = guid();
		const { threadRow } = await h.emitMemberMsg(
			{ content: "here you go", referencedMessage: { id: replyTarget } },
		);
		const res = await h.request("GET", "/assistant/events?after=0&wait=0");
		const env = res.json.events.filter((e) => e.type === "modmail.member_msg.v1").pop();
		expect(env.data.reply_to_message_id).toBe(replyTarget);
	});

	it("flags confidential threads on member_msg", async () => {
		await h.emitMemberMsg({}, { metadata: JSON.stringify({ confidential: true }) });
		const res = await h.request("GET", "/assistant/events?after=0&wait=0");
		const env = res.json.events.filter((e) => e.type === "modmail.member_msg.v1").pop();
		expect(env.data.confidential).toBe(true);
	});

	it("dedupes replayed hooks (same message id)", async () => {
		const before = await h.request("GET", "/assistant/events?after=0&wait=0");
		const count1 = before.json.events.filter((e) => e.type === "modmail.member_msg.v1").length;
		const { } = await h.emitMemberMsg({ id: "fixed-replay-id-0000000001" });
		await h.emitMemberMsg({ id: "fixed-replay-id-0000000001" });
		const after = await h.request("GET", "/assistant/events?after=0&wait=0");
		const count2 = after.json.events.filter((e) => e.type === "modmail.member_msg.v1").length;
		expect(count2 - count1).toBe(1);
	});

	it("cursor advances; after=cursor returns nothing new", async () => {
		const first = await h.request("GET", "/assistant/events?after=0&wait=0");
		const cursor = first.json.cursor;
		const second = await h.request("GET", `/assistant/events?after=${cursor}&wait=0`);
		expect(second.json.events).toHaveLength(0);
		expect(second.json.cursor).toBe(cursor);
	});

	it("long-poll resolves when an event arrives", async () => {
		const start = await h.request("GET", "/assistant/events?after=0&wait=0");
		const cursor = start.json.cursor;
		const pending = h.request("GET", `/assistant/events?after=${cursor}&wait=5`);
		await new Promise((r) => setTimeout(r, 150));
		await h.emitMemberMsg({ content: "wake up" });
		const res = await pending;
		expect(res.status).toBe(200);
		expect(res.json.events.length).toBeGreaterThan(0);
	});
});

describe("thread_open + thread_close", () => {
	it("createNewThreadForUser wrap calls through and emits thread_open", async () => {
		const user = { id: "111987654321098765", username: "newperson" };
		const thread = await h.fakeThreads.createNewThreadForUser(user, { source: "dm" });
		expect(thread.id).toBeTruthy();
		const res = await h.request("GET", "/assistant/events?after=0&wait=0");
		const open = res.json.events.find((e) => e.type === "modmail.thread_open.v1");
		expect(open).toBeTruthy();
		expect(open.data.user.id).toBe(user.id);
		expect(open.data.via).toBe("dm");
	});

	it("thread_close emits via=scheduled when a close schedule has elapsed", async () => {
		const row = await h.seedThread({
			scheduled_close_at: new Date(Date.now() - 60000).toISOString().slice(0, 19).replace("T", " "),
			scheduled_close_name: "Peter",
		});
		for (const fn of h.hooks.afterThreadClose__fns) {
			await fn({ threadId: row.id });
		}
		const res = await h.request("GET", "/assistant/events?after=0&wait=0");
		const close = res.json.events.find((e) => e.type === "modmail.thread_close.v1" && e.data.thread_id === row.id);
		expect(close.data.via).toBe("scheduled");
		expect(close.data.reason_hint).toBe("Peter");
	});

	it("thread_close without a schedule emits via=command", async () => {
		const row = await h.seedThread({});
		for (const fn of h.hooks.afterThreadClose__fns) {
			await fn({ threadId: row.id });
		}
		const res = await h.request("GET", "/assistant/events?after=0&wait=0");
		const close = res.json.events.find((e) => e.type === "modmail.thread_close.v1" && e.data.thread_id === row.id);
		expect(close.data.via).toBe("command");
		expect(close.data.reason_hint).toBeNull();
	});
});

describe("mod_reply wrap + echo suppression", () => {
	it("replyToUser emits mod_reply with moderator identity", async () => {
		const row = await h.seedThread({});
		const thread = await h.fakeThreads.findById(row.id);
		await thread.replyToUser(
			{ id: "555987654321098765", user: { username: "moderator1" } },
			"Looking into this now",
		);
		const res = await h.request("GET", "/assistant/events?after=0&wait=0");
		const reply = res.json.events.filter((e) => e.type === "modmail.mod_reply.v1").pop();
		expect(reply.data.moderator.name).toBe("moderator1");
		expect(reply.data.assistant_origin).toBe(false);
	});
});

describe("POST /assistant/send", () => {
	it("delivers via synthetic member and returns dm_message_id", async () => {
		const row = await h.seedThread({});
		const res = await h.request("POST", "/assistant/send", sendEnvelope({ thread_id: row.id }));
		expect(res.json.delivered).toBe(true);
		expect(res.json.duplicate).toBe(false);
		expect(res.json.reason).toBeNull();
		const thread = h.FakeThread.instances[h.FakeThread.instances.length - 1];
		const call = thread.replyCalls[0];
		expect(call.moderator.user.username).toBe("FRIDAY");
		expect(call.text).toBe("Thanks for flagging this — could you send the user IDs involved?");
	});

	it("duplicate envelope id: no second reply", async () => {
		const row = await h.seedThread({});
		const env = sendEnvelope({ thread_id: row.id });
		const first = await h.request("POST", "/assistant/send", env);
		const repliesBefore = h.FakeThread.instances.flatMap((t) => t.replyCalls).length;
		const second = await h.request("POST", "/assistant/send", env);
		expect(second.json.duplicate).toBe(true);
		const repliesAfter = h.FakeThread.instances.flatMap((t) => t.replyCalls).length;
		expect(repliesAfter).toBe(repliesBefore);
		expect(first.json.delivered).toBe(true);
	});

	it("blocklisted snippet_trigger → mod_only", async () => {
		const row = await h.seedThread({});
		const res = await h.request("POST", "/assistant/send", sendEnvelope({ thread_id: row.id, snippet_trigger: "warn" }));
		expect(res.json).toMatchObject({ delivered: false, reason: "mod_only" });
	});

	it("unknown snippet_trigger → stale_snippet", async () => {
		const row = await h.seedThread({});
		const res = await h.request("POST", "/assistant/send", sendEnvelope({ thread_id: row.id, snippet_trigger: "nonexistent" }));
		expect(res.json).toMatchObject({ delivered: false, reason: "stale_snippet" });
	});

	it("auto via on a non-auto_faq tag → stale_snippet", async () => {
		await h.seedSnippet("idpls", "Please send the user IDs");
		await h.db("snippet_tags").insert({ trigger: "idpls", category: "intake", category_source: "human" });
		const row = await h.seedThread({});
		const res = await h.request(
			"POST",
			"/assistant/send",
			sendEnvelope({ thread_id: row.id, snippet_trigger: "idpls", via: "auto" }),
		);
		expect(res.json).toMatchObject({ delivered: false, reason: "stale_snippet" });
	});

	it("invalid responder → validation_failed", async () => {
		const row = await h.seedThread({});
		const res = await h.request("POST", "/assistant/send", sendEnvelope({ thread_id: row.id, responder: "**bold**" }));
		expect(res.json).toMatchObject({ delivered: false, reason: "validation_failed" });
	});

	it("unknown thread → thread_not_found", async () => {
		const res = await h.request("POST", "/assistant/send", sendEnvelope({ thread_id: guid() }));
		expect(res.json).toMatchObject({ delivered: false, reason: "thread_not_found" });
	});
});

describe("lookups", () => {
	it("threads: summary + snippet_triggers_used from !! commands", async () => {
		const row = await h.seedThread({ user_id: "999987654321098765" });
		await h.seedMessage(row.id, { message_type: 6, body: "!!idpls the ones from my DMs" });
		await h.seedMessage(row.id, { message_type: 6, body: "!!!warn spam" });
		const res = await h.request("GET", "/assistant/threads?user_id=999987654321098765");
		expect(res.json).toHaveLength(1);
		expect(res.json[0].snippet_triggers_used).toEqual(["idpls", "warn"]);
		expect(res.json[0].confidential).toBe(false);
	});

	it("threads: confidential stub", async () => {
		await h.seedThread({ user_id: "888987654321098765", metadata: JSON.stringify({ confidential: true }) });
		const res = await h.request("GET", "/assistant/threads?user_id=888987654321098765");
		expect(res.json[0].confidential).toBe(true);
		expect(res.json[0].message_count).toBeNull();
		expect(res.json[0].snippet_triggers_used).toEqual([]);
	});

	it("notes: returns rows", async () => {
		await h.seedNote("777987654321098765", "repeat appeal, be firm");
		const res = await h.request("GET", "/assistant/notes?user_id=777987654321098765");
		expect(res.json).toHaveLength(1);
		expect(res.json[0].body).toBe("repeat appeal, be firm");
	});

	it("snippets: LEFT JOINs tags", async () => {
		await h.seedSnippet("appealinfo", "Here is how appeals work");
		await h.db("snippet_tags").insert({ trigger: "appealinfo", category: "auto_faq", category_source: "human" });
		const res = await h.request("GET", "/assistant/snippets");
		const hit = res.json.find((s) => s.trigger === "appealinfo");
		expect(hit).toMatchObject({ category: "auto_faq", category_source: "human" });
	});

	it("threads-search: literal match with context, escapes wildcards", async () => {
		const row = await h.seedThread({});
		await h.seedMessage(row.id, { body: "invite code qNvArmenia, our server is about Marvel" });
		const res = await h.request("GET", "/assistant/threads-search?q=qNvArmenia");
		expect(res.json).toHaveLength(1);
		expect(res.json[0].thread_id).toBe(row.id);
		expect(res.json[0].matched_context).toContain("qNvArmenia");
		const wild = await h.request("GET", "/assistant/threads-search?q=100%");
		expect(wild.status).toBe(200);
		const short = await h.request("GET", "/assistant/threads-search?q=ab");
		expect(short.status).toBe(400);
	});

	it("messages: rows; confidential thread → stub", async () => {
		const row = await h.seedThread({});
		await h.seedMessage(row.id, { body: "hello there", message_type: 3 });
		const res = await h.request("GET", `/assistant/messages?thread_id=${row.id}`);
		expect(res.json.confidential).toBe(false);
		expect(res.json.messages[0].body).toBe("hello there");

		const conf = await h.seedThread({ metadata: JSON.stringify({ confidential: true }) });
		const res2 = await h.request("GET", `/assistant/messages?thread_id=${conf.id}`);
		expect(res2.json).toEqual({ confidential: true, messages: [] });
	});
});

describe("tags commands", () => {
	const fakeMsg = () => ({
		author: { id: "555987654321098765" },
		channel: { createMessage: async (content) => h.sentMessages.push({ content }) },
	});

	it("!tag upserts with human provenance + confirms", async () => {
		await h.seedSnippet("idpls", "Please send the user IDs");
		await h.commandHandlers.tag(fakeMsg(), { trigger: "idpls", category: "intake" });
		const tag = await h.db("snippet_tags").where("trigger", "idpls").first();
		expect(tag).toMatchObject({ category: "intake", category_source: "human" });
		expect(h.sentMessages.at(-1).content).toContain("intake");
	});

	it("!tag rejects unknown categories", async () => {
		await h.seedSnippet("foo", "bar");
		await h.commandHandlers.tag(fakeMsg(), { trigger: "foo", category: "nope" });
		expect(h.sentMessages.at(-1).content).toContain("Unknown category");
	});

	it("!untag removes; !tags lists with locked blocklist", async () => {
		await h.commandHandlers.untag(fakeMsg(), { trigger: "idpls" });
		expect(await h.db("snippet_tags").where("trigger", "idpls")).toHaveLength(0);
		await h.commandHandlers.tags(fakeMsg(), {});
		const listing = h.sentMessages.at(-1).content;
		expect(listing).toContain("blocklist (locked)");
		expect(listing).toContain("acceptap");
	});
});

