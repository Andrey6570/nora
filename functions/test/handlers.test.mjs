import test from "node:test";
import assert from "node:assert/strict";
import { onLogCreated, onLogDeleted, onPairUpdated, onSignalCreated, onOrderCreated, onOrderUpdated, onAnswerCreated } from "../handlers.js";
import * as G from "../gamedata.js";
const { wishLevel } = G;
import { GAMES, gameName } from "../games.js";
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
      if (v && v.constructor && v.constructor.name === "DeleteTransform") delete o[last];
      else o[last] = v && typeof v === "object" && "operand" in v ? (Number(o[last]) || 0) + v.operand : v;
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
    runTransaction: async fn => fn({ get: r => r.get(), update: (r, p) => apply(r.path, p), set: (r, d) => { docs.set(r.path, structuredClone(d)); }, delete: r => docs.delete(r.path) }),
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

// ---- the shop ----
const shopPair = { ...sigPair, balances: { a: 20, b: 5 }, pot: 50, games: {} };
const rewards = { "pairs/p/rewards/sleep": { title: "Сплю до 10", cost: 10, scope: "personal" }, "pairs/p/rewards/dinner": { title: "Ужин вдвоём", cost: 40, scope: "joint" } };
const order = (kind, ref, uid = "a") => ({ uid, kind, ref, at: 1 });
const run = async (seed, id, data, messaging = fakeMessaging()) => {
  const db = fakeDb({ "pairs/p": shopPair, ...devs, ...rewards, ...seed, [`pairs/p/orders/${id}`]: data });
  return { db, messaging, res: await onOrderCreated({ db, messaging, now }, { pid: "p", id, data }) };
};

test("a personal reward is bought at once from one's own stars and the partner is told", async () => {
  const { db, messaging, res } = await run({}, "o1", order("reward", "sleep"));
  assert.equal(res, "bought");
  assert.deepEqual(db.docs.get("pairs/p/orders/o1"), { ...order("reward", "sleep"), status: "bought", cost: 10, title: "Сплю до 10", joint: false });
  assert.deepEqual([db.docs.get("pairs/p").balances.a, db.docs.get("pairs/p").pot], [10, 50]);
  assert.deepEqual(messaging.sent.map(m => [m.tokens[0], m.notification.body]), [["T1", "Ανταμοιβή: «Сплю до 10»"], ["T2", "Награда: «Сплю до 10»"]]);
});

test("not enough personal stars: the order is removed", async () => {
  const { db, res } = await run({ "pairs/p": { ...shopPair, balances: { a: 9 } } }, "o1", order("reward", "sleep"));
  assert.equal(res, "not-enough");
  assert.equal(db.docs.has("pairs/p/orders/o1"), false);
  assert.equal(db.docs.get("pairs/p").balances.a, 9);
});

test("a joint reward waits for the partner and spends nothing yet", async () => {
  const { db, messaging, res } = await run({}, "o1", order("reward", "dinner"));
  assert.equal(res, "proposed");
  assert.deepEqual([db.docs.get("pairs/p/orders/o1").status, db.docs.get("pairs/p").pot], ["proposed", 50]);
  assert.match(messaging.sent[0].notification.body, /Ужин вдвоём/);
});

test("the partner's approval spends the pot; the buyer cannot approve their own proposal", async () => {
  const { db, messaging } = await run({}, "o1", order("reward", "dinner"));
  const cur = () => db.docs.get("pairs/p/orders/o1");
  const mine = { ...cur(), approvedBy: "a" };
  db.docs.set("pairs/p/orders/o1", mine);
  assert.equal(await onOrderUpdated({ db, messaging }, { pid: "p", id: "o1", before: { ...mine, approvedBy: undefined }, after: mine }), "bad-approval");
  assert.equal(cur().approvedBy, undefined);
  const theirs = { ...cur(), approvedBy: "b" };
  db.docs.set("pairs/p/orders/o1", theirs);
  assert.equal(await onOrderUpdated({ db, messaging }, { pid: "p", id: "o1", before: { ...theirs, approvedBy: undefined }, after: theirs }), "bought");
  assert.deepEqual([cur().status, db.docs.get("pairs/p").pot], ["bought", 10]);
  assert.equal(await onOrderUpdated({ db, messaging }, { pid: "p", id: "o1", before: { ...theirs, approvedBy: undefined }, after: cur() }), "ignored");
  assert.equal(db.docs.get("pairs/p").pot, 10);
});

test("a game is unlocked for the pair after the partner agrees; free and owned games are refused", async () => {
  const { db, messaging, res } = await run({}, "o1", order("game", "wishes"));
  assert.equal(res, "proposed");
  assert.equal(db.docs.get("pairs/p/orders/o1").cost, GAMES.wishes.cost);
  const after = { ...db.docs.get("pairs/p/orders/o1"), approvedBy: "b" };
  db.docs.set("pairs/p/orders/o1", after);
  await onOrderUpdated({ db, messaging }, { pid: "p", id: "o1", before: { ...after, approvedBy: undefined }, after });
  assert.deepEqual([db.docs.get("pairs/p").games.wishes, db.docs.get("pairs/p").pot], [true, 50 - GAMES.wishes.cost]);
  assert.equal(gameName("wishes", "el"), "Χάρτης επιθυμιών");
  assert.equal((await run({}, "o2", order("game", "guess"))).res, "bad-game");
  assert.equal((await run({ "pairs/p": { ...shopPair, games: { wishes: true } } }, "o3", order("game", "wishes"))).res, "bad-game");
});

test("bad orders are removed: outsider, unknown reward, empty pot, no partner", async () => {
  assert.equal((await run({}, "o1", order("reward", "sleep", "x"))).res, "bad-order");
  assert.equal((await run({}, "o2", order("reward", "nope"))).res, "no-reward");
  assert.equal((await run({ "pairs/p": { ...shopPair, pot: 5 } }, "o3", order("reward", "dinner"))).res, "not-enough");
  assert.equal((await run({ "pairs/p": { ...shopPair, members: ["a"] } }, "o4", order("reward", "dinner"))).res, "no-partner");
  const { db } = await run({}, "o5", order("reward", "nope"));
  assert.equal(db.docs.has("pairs/p/orders/o5"), false);
});

// ---- games for two ----
test("game content: every text has three languages and the sizes are sane", () => {
  const triple = t => Array.isArray(t) && t.length === 3 && t.every(x => typeof x === "string" && x.length > 2 && x.length < 220);
  const all = [...G.WHEEL, ...Object.values(G.DECKS).flat(), ...G.WISHES, ...G.COUPONS, ...G.DAYS30,
    ...G.GUESS.flatMap(g => [g.q, ...g.o]), ...G.SCRIPTS.flatMap(s => [s.title, ...s.steps])];
  assert.deepEqual(all.filter(t => !triple(t)), []);
  assert.equal(G.DAYS30.length, 30);
  assert.equal(G.DECKS.questions36.length, 36);
  assert.ok(G.GUESS.every(g => g.o.length >= 3 && g.o.length <= 4));
  assert.ok(G.WISHES.length < 100 && G.GUESS.length < 100);
  assert.deepEqual(Object.keys(GAMES).sort(), ["coupons", "dreams", "flirt", "guess", "homeDate", "intimacy30", "memories", "questions36", "truth", "wheel", "wishes"]);
});

const gp = { ...sigPair, games: { wishes: true } };
const ans = (game, item, uid, rest) => ({ uid, game, item: String(item), at: 1, ...rest });
const idOf = a => `${a.game}_${a.item}_${a.uid}`;
async function answer(seed, a) {
  const db = fakeDb({ "pairs/p": gp, ...seed, [`pairs/p/answers/${idOf(a)}`]: a });
  return { db, res: await onAnswerCreated({ db, now }, { pid: "p", id: idOf(a), data: a }) };
}

test("guess: the first answer waits, the second reveals both answers and guesses", async () => {
  const a = ans("guess", 2, "a", { v: 1, g: 3 }), b = ans("guess", 2, "b", { v: 3, g: 1 });
  assert.equal((await answer({}, a)).res, "waiting");
  const { db, res } = await answer({ [`pairs/p/answers/${idOf(a)}`]: a }, b);
  assert.equal(res, "revealed");
  assert.deepEqual(db.docs.get("pairs/p/results/guess_2").answers, { b: { v: 3, g: 1 }, a: { v: 1, g: 3 } });
});

test("wishes: only matches are revealed and a no is never shown", async () => {
  assert.deepEqual([["yes", "yes"], ["yes", "maybe"], ["maybe", "maybe"], ["yes", "no"], ["no", "maybe"], ["no", "no"]].map(([x, y]) => wishLevel(x, y)), ["yes", "maybe", "maybe", null, null, null]);
  const a = ans("wishes", 4, "a", { v: "yes" });
  const hit = await answer({ [`pairs/p/answers/${idOf(a)}`]: a }, ans("wishes", 4, "b", { v: "maybe" }));
  assert.equal(hit.res, "match");
  assert.deepEqual(hit.db.docs.get("pairs/p/results/wishes_4"), { game: "wishes", item: "4", level: "maybe", at: now().getTime() });
  const miss = await answer({ [`pairs/p/answers/${idOf(a)}`]: a }, ans("wishes", 4, "b", { v: "no" }));
  assert.equal(miss.res, "no-match");
  assert.equal(miss.db.docs.has("pairs/p/results/wishes_4"), false);
});

test("bad answers are removed: unknown game, out of range, locked game, wrong id, outsider, odd shape", async () => {
  const cases = [["unknown game", ans("chess", 1, "a", { v: 1 }), gp], ["item out of range", ans("guess", 99, "a", { v: 1, g: 1 }), gp],
    ["option out of range", ans("guess", 0, "a", { v: 9, g: 1 }), gp], ["wish locked", ans("wishes", 1, "a", { v: "yes" }), sigPair],
    ["bad wish value", ans("wishes", 1, "a", { v: "love" }), gp], ["outsider", ans("guess", 1, "x", { v: 1, g: 1 }), gp],
    ["guess without guess", ans("guess", 1, "a", { v: 1 }), gp]];
  for (const [name, a, pair] of cases) {
    const db = fakeDb({ "pairs/p": pair, [`pairs/p/answers/${idOf(a)}`]: a });
    const res = await onAnswerCreated({ db, now }, { pid: "p", id: idOf(a), data: a });
    assert.equal(res, "bad-answer", name);
    assert.equal(db.docs.has(`pairs/p/answers/${idOf(a)}`), false, name);
  }
  const a = ans("guess", 1, "a", { v: 1, g: 1 }), db = fakeDb({ "pairs/p": gp, "pairs/p/answers/wrong": a });
  assert.equal(await onAnswerCreated({ db, now }, { pid: "p", id: "wrong", data: a }), "bad-answer");
});
