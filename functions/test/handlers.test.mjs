import test from "node:test";
import assert from "node:assert/strict";
import { onLogCreated, onLogDeleted, onPairUpdated, onSignalCreated } from "../handlers.js";
import { MESSAGES, REACTIONS, pushText } from "../signals.js";
import { baseStars, stageStars, weekKey, periodKey, logId, parseLogId } from "../economy.js";

// In-memory stand-in for the Admin Firestore surface the handlers use.
function fakeDb(seed) {
  const docs = new Map(Object.entries(seed));
  const apply = (path, patch) => {
    const cur = structuredClone(docs.get(path) || {});
    for (const [k, v] of Object.entries(patch)) {
      const keys = k.split("."), last = keys.pop();
      let o = cur; for (const key of keys) o = o[key] = o[key] || {};
      o[last] = v && typeof v === "object" && "operand" in v ? (Number(o[last]) || 0) + v.operand : v;
    }
    docs.set(path, cur);
  };
  const ref = path => ({
    path,
    get: async () => ({ exists: docs.has(path), data: () => structuredClone(docs.get(path)) }),
    update: async patch => apply(path, patch),
    delete: async () => { docs.delete(path); }
  });
  // collection(path).where(field, "==", value).get(): direct children only
  const collection = path => ({
    where: (f, op, v) => ({
      get: async () => ({
        docs: [...docs.keys()].filter(k => k.startsWith(path + "/") && !k.slice(path.length + 1).includes("/") && docs.get(k)[f] === v)
          .map(k => ({ ref: ref(k), data: () => structuredClone(docs.get(k)) }))
      })
    })
  });
  return {
    docs,
    doc: ref,
    collection,
    runTransaction: async fn => fn({ get: r => r.get(), update: (r, p) => apply(r.path, p), delete: r => docs.delete(r.path) }),
    recursiveDelete: async r => { for (const k of [...docs.keys()]) if (k === r.path || k.startsWith(r.path + "/")) docs.delete(k); }
  };
}

const now = () => new Date("2026-10-28T12:00:00Z");
const pair = { members: ["a", "b"], scale: 10, balances: {}, pot: 0, xp: 0 };

test("economy: stars follow time and difficulty", () => {
  assert.equal(baseStars({ minutes: 30, difficulty: 1 }), 3);
  assert.equal(baseStars({ minutes: 30, difficulty: 3 }), 6);
  assert.equal(baseStars({ minutes: 2, difficulty: 1 }), 1);
  assert.equal(stageStars({ minutes: 60, difficulty: 1, full: true }, "notice"), 1);
  assert.equal(stageStars({ minutes: 60, difficulty: 1, full: true }, "plan"), 3);
  assert.equal(stageStars({ minutes: 60, difficulty: 1, full: false }, "plan"), 0);
  assert.equal(stageStars({ minutes: 60, difficulty: 1 }, "do"), 6);
});

test("economy: periods and log ids", () => {
  assert.equal(weekKey("2026-10-28"), "2026-W44");
  assert.equal(weekKey("2027-01-01"), "2026-W53");
  assert.equal(periodKey({ repeat: "daily" }, "2026-10-28"), "2026-10-28");
  assert.equal(periodKey({ repeat: "weekly" }, "2026-10-28"), "2026-W44");
  assert.equal(periodKey({ repeat: "once" }, "2026-10-28"), "once");
  assert.deepEqual(parseLogId(logId("t_1", "do", "2026-W44")), { taskId: "t_1", stage: "do", period: "2026-W44" });
  assert.equal(parseLogId("junk"), null);
});

test("a valid mark awards stars to the partner and the pot", async () => {
  const id = "t1_do_2026-10-28";
  const db = fakeDb({ "pairs/p": pair, "pairs/p/tasks/t1": { minutes: 30, difficulty: 2, repeat: "daily" }, [`pairs/p/log/${id}`]: { uid: "a", day: "2026-10-28" } });
  assert.equal(await onLogCreated({ db, now }, { pid: "p", logId: id, data: { uid: "a", day: "2026-10-28" } }), 5);
  assert.equal(db.docs.get(`pairs/p/log/${id}`).stars, 5);
  assert.deepEqual([db.docs.get("pairs/p").balances.a, db.docs.get("pairs/p").pot, db.docs.get("pairs/p").xp], [5, 5, 5]);
});

test("invalid marks are removed and award nothing", async () => {
  const cases = [
    ["outsider", "t1_do_once", { uid: "x", day: "2026-10-28" }],
    ["old day", "t1_do_once", { uid: "a", day: "2026-10-20" }],
    ["wrong period", "t1_do_2026-10-28", { uid: "a", day: "2026-10-28" }],
    ["stage the task lacks", "t1_plan_once", { uid: "a", day: "2026-10-28" }],
    ["no task", "zz_do_once", { uid: "a", day: "2026-10-28" }]
  ];
  for (const [name, id, data] of cases) {
    const db = fakeDb({ "pairs/p": pair, "pairs/p/tasks/t1": { minutes: 30, difficulty: 1, repeat: "once" }, [`pairs/p/log/${id}`]: data });
    const r = await onLogCreated({ db, now }, { pid: "p", logId: id, data });
    assert.equal(typeof r, "string", name);
    assert.equal(db.docs.has(`pairs/p/log/${id}`), false, name);
    assert.equal(db.docs.get("pairs/p").pot, 0, name);
  }
});

test("a chore done together brings double stars, all into the pot", async () => {
  const id = "t1_do_2026-10-28", data = { uid: "a", day: "2026-10-28", together: true };
  const db = fakeDb({ "pairs/p": pair, "pairs/p/tasks/t1": { minutes: 30, difficulty: 1, repeat: "daily" }, [`pairs/p/log/${id}`]: data });
  assert.equal(await onLogCreated({ db, now }, { pid: "p", logId: id, data }), 6);
  assert.deepEqual([db.docs.get("pairs/p").balances.a, db.docs.get("pairs/p").pot], [undefined, 6]);
  assert.equal(await onLogDeleted({ db }, { pid: "p", data: { ...data, stars: 6 } }), -6);
  assert.deepEqual([db.docs.get("pairs/p").balances.a, db.docs.get("pairs/p").pot], [undefined, 0]);
});

test("together is only for the doing stage of a complete pair", async () => {
  for (const [id, p] of [["t1_plan_once", pair], ["t1_do_once", { ...pair, members: ["a"] }]]) {
    const data = { uid: "a", day: "2026-10-28", together: true };
    const db = fakeDb({ "pairs/p": p, "pairs/p/tasks/t1": { minutes: 30, difficulty: 1, repeat: "once", full: true }, [`pairs/p/log/${id}`]: data });
    assert.equal(await onLogCreated({ db, now }, { pid: "p", logId: id, data }), "bad-together");
    assert.equal(db.docs.has(`pairs/p/log/${id}`), false);
  }
});

test("taking a mark back returns its stars", async () => {
  const db = fakeDb({ "pairs/p": { ...pair, balances: { a: 5 }, pot: 7, xp: 7 } });
  assert.equal(await onLogDeleted({ db }, { pid: "p", data: { uid: "a", stars: 5 } }), -5);
  assert.deepEqual([db.docs.get("pairs/p").balances.a, db.docs.get("pairs/p").pot], [0, 2]);
  assert.equal(await onLogDeleted({ db }, { pid: "p", data: { uid: "a" } }), 0);
});

test("an empty pair is deleted with its contents and invite", async () => {
  const db = fakeDb({ "pairs/p": { members: [], inviteCode: "ABC" }, "pairs/p/tasks/t": {}, "invites/ABC": { pid: "p" }, "pairs/q": { members: ["c"] } });
  assert.equal(await onPairUpdated({ db }, { pid: "q", after: { members: ["c"] } }), false);
  assert.equal(await onPairUpdated({ db }, { pid: "p", after: { members: [], inviteCode: "ABC" } }), true);
  assert.deepEqual([...db.docs.keys()], ["pairs/q"]);
});

// ---- reactions and warm signals ----
function fakeMessaging(deadTokens = []) {
  const sent = [];
  return { sent, sendEachForMulticast: async m => { sent.push(m); return { responses: m.tokens.map(t => deadTokens.includes(t) ? { success: false, error: { code: "messaging/registration-token-not-registered" } } : { success: true }) }; } };
}
const sigPair = { members: ["a", "b"], names: { a: "Андрей", b: "Мария" }, scale: 10 };
const devs = { "pairs/p/devices/d1": { uid: "b", token: "T1", lang: "el" }, "pairs/p/devices/d2": { uid: "b", token: "T2", lang: "ru" }, "pairs/p/devices/d3": { uid: "a", token: "T3", lang: "en" } };
const sig = { from: "a", kind: "message", key: "love", day: "2026-10-28" };

test("the catalogue has all three languages for every message", () => {
  for (const [k, m] of Object.entries(MESSAGES)) for (const l of ["ru", "en", "el"]) assert.ok(m[l] && m[l].length < 60, k + " " + l);
  assert.equal(Object.keys(REACTIONS).length, 5);
});

test("a warm signal is pushed to the partner's devices in their language", async () => {
  const db = fakeDb({ "pairs/p": sigPair, ...devs, "pairs/p/signals/s": sig }), messaging = fakeMessaging();
  assert.equal(await onSignalCreated({ db, messaging, now }, { pid: "p", id: "s", data: sig }), "sent");
  assert.deepEqual(messaging.sent.map(m => [m.tokens[0], m.notification.title, m.notification.body]), [["T1", "Андрей", "Σ' αγαπώ"], ["T2", "Андрей", "Люблю тебя"]]);
  assert.deepEqual(db.docs.get("pairs/p").sigDay.a, { day: "2026-10-28", message: 1, reaction: 0 });
});

test("a reaction names the chore", async () => {
  const data = { from: "b", kind: "reaction", key: "heart", ref: "t1_do_2026-10-28", day: "2026-10-28" };
  const db = fakeDb({ "pairs/p": sigPair, ...devs, "pairs/p/tasks/t1": { title: "Помыть посуду" }, "pairs/p/signals/s": data }), messaging = fakeMessaging();
  assert.equal(await onSignalCreated({ db, messaging, now }, { pid: "p", id: "s", data }), "sent");
  assert.deepEqual(messaging.sent.map(m => [m.tokens[0], m.notification.body]), [["T3", "❤️ Reaction to “Помыть посуду”"]]);
  assert.equal(pushText("reaction", "fire", "ru", ""), "🔥 Реакция на ваше дело");
});

test("the daily limit stops the eleventh message and the next day starts afresh", async () => {
  const db = fakeDb({ "pairs/p": { ...sigPair, sigDay: { a: { day: "2026-10-28", message: 10, reaction: 0 } } }, ...devs, "pairs/p/signals/s": sig }), messaging = fakeMessaging();
  assert.equal(await onSignalCreated({ db, messaging, now }, { pid: "p", id: "s", data: sig }), "limit");
  assert.equal(db.docs.has("pairs/p/signals/s"), false);
  assert.equal(messaging.sent.length, 0);
  const d2 = fakeDb({ "pairs/p": { ...sigPair, sigDay: { a: { day: "2026-10-27", message: 10, reaction: 0 } } }, ...devs, "pairs/p/signals/s": sig });
  assert.equal(await onSignalCreated({ db: d2, messaging, now }, { pid: "p", id: "s", data: sig }), "sent");
});

test("bad signals are removed: unknown key, outsider, no partner, old day", async () => {
  const cases = [["unknown key", sigPair, { ...sig, key: "nope" }], ["outsider", sigPair, { ...sig, from: "x" }],
    ["no partner", { ...sigPair, members: ["a"] }, sig], ["old day", sigPair, { ...sig, day: "2026-10-01" }]];
  for (const [name, pair, data] of cases) {
    const db = fakeDb({ "pairs/p": pair, ...devs, "pairs/p/signals/s": data }), messaging = fakeMessaging();
    assert.notEqual(await onSignalCreated({ db, messaging, now }, { pid: "p", id: "s", data }), "sent", name);
    assert.equal(db.docs.has("pairs/p/signals/s"), false, name);
    assert.equal(messaging.sent.length, 0, name);
  }
});

test("a device whose token is dead is removed", async () => {
  const db = fakeDb({ "pairs/p": sigPair, ...devs, "pairs/p/signals/s": sig }), messaging = fakeMessaging(["T1"]);
  await onSignalCreated({ db, messaging, now }, { pid: "p", id: "s", data: sig });
  assert.deepEqual([db.docs.has("pairs/p/devices/d1"), db.docs.has("pairs/p/devices/d2")], [false, true]);
});
