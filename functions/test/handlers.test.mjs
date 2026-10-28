import test from "node:test";
import assert from "node:assert/strict";
import { onLogCreated, onLogDeleted, onPairUpdated } from "../handlers.js";
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
  return {
    docs,
    doc: ref,
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
