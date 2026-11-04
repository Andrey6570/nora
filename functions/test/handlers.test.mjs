import test from "node:test";
import assert from "node:assert/strict";
import { onLogCreated, onLogDeleted, onPairUpdated, onSignalCreated, onOrderCreated, onOrderUpdated, onAnswerCreated, onDeviceUpdated } from "../handlers.js";
import * as G from "../gamedata.js";
import { stageOf, flamePatch, flameNow, prevDay, traitOf, MILESTONES, DECOR, DECOR_NAMES, STAGES } from "../pet.js";
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
  const all = [...G.WHEEL.map(w => w.slice(0, 3)), ...Object.values(G.DECKS).flat(), ...G.WISHES, ...G.COUPONS, ...G.DAYS30,
    ...G.GUESS.flatMap(g => [g.q, ...g.o]), ...G.SCRIPTS.flatMap(s => [s.title, ...s.steps])];
  assert.deepEqual(all.filter(t => !triple(t)), []);
  assert.equal(G.DAYS30.length, 30);
  assert.equal(G.DECKS.questions36.length, 100);
  // the classic 36 come first, in three parts of 12, and the extra 64 follow in four parts of 16
  assert.deepEqual(G.DECK_PARTS.questions36, [0, 12, 24, 36, 52, 68, 84]);
  assert.deepEqual([0, 11, 12, 35, 36, 51, 52, 99].map(i => G.partOf("questions36", i)), [1, 1, 2, 3, 4, 4, 5, 7]);
  assert.equal(G.partOf("truth", 5), 0);
  assert.ok(G.GUESS.every(g => g.o.length >= 3 && g.o.length <= 4));
  // each card game has 100 cards, and no card repeats inside a game
  assert.deepEqual([G.WHEEL.length, G.WISHES.length, G.GUESS.length, ...Object.keys(G.DECKS).map(k => G.DECKS[k].length)], [100, 100, 100, 100, 100, 100, 100, 100]);
  const dup = list => list.length - new Set(list).size;
  assert.deepEqual([G.WHEEL.map(w => w[0]), G.WISHES.map(w => w[0]), G.GUESS.map(g => g.q[0]), ...Object.values(G.DECKS).map(d => d.map(c => c[0]))].map(dup), [0, 0, 0, 0, 0, 0, 0, 0]);
  // no card text is shared between two different decks either
  const deckTexts = Object.values(G.DECKS).flat().map(c => c[0]);
  assert.equal(dup(deckTexts), 0);
  // answers are stored under two-digit item numbers
  assert.ok(G.GUESS.length <= 100 && G.WISHES.length <= 100 && G.GUESS_OPTIONS.length === G.GUESS.length);
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
  const cases = [["unknown game", ans("chess", 1, "a", { v: 1 }), gp], ["item out of range", ans("guess", 100, "a", { v: 1, g: 1 }), gp],
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

// ---- the pet ----
test("stages follow the pair's experience", () => {
  assert.deepEqual([0, 299, 300, 1499, 1500, 4999, 5000, 99999].map(x => stageOf(x).stage.id), ["baby", "baby", "teen", "teen", "adult", "adult", "wise", "wise"]);
  assert.equal(stageOf(150).progress, 0.5);
  assert.equal(stageOf(9000).next, null);
  assert.equal(stageOf(100).toNext, 200);
});

const two = { members: ["a", "b"], flame: undefined, active: {} };
test("the flame needs both partners on the same day and counts days in a row", () => {
  assert.equal(prevDay("2026-03-01"), "2026-02-28");
  assert.equal(prevDay("2027-01-01"), "2026-12-31");
  let p = { ...two };
  let patch = flamePatch(p, ["a"], "2026-10-27");
  assert.deepEqual(patch, { "active.a": "2026-10-27" });
  p = { ...p, active: { a: "2026-10-27" } };
  patch = flamePatch(p, ["b"], "2026-10-27");
  assert.deepEqual(patch.flame, { n: 1, last: "2026-10-27", freezes: 0 });
  p = { ...p, active: { a: "2026-10-27", b: "2026-10-27" }, flame: patch.flame };
  assert.equal(flamePatch(p, ["a"], "2026-10-27").flame, undefined);
  // the next day: both active -> 2
  patch = flamePatch({ ...p, active: { a: "2026-10-27", b: "2026-10-27" } }, ["a", "b"], "2026-10-28");
  assert.deepEqual(patch.flame, { n: 2, last: "2026-10-28", freezes: 0 });
  // a gap of two days starts over
  assert.equal(flamePatch({ ...p }, ["a", "b"], "2026-10-30").flame.n, 1);
  // a day in the past does not move it back
  assert.equal(flamePatch({ ...p, flame: { n: 5, last: "2026-10-28", freezes: 0 } }, ["a", "b"], "2026-10-27").flame, undefined);
  assert.equal(flamePatch({ members: ["a"], active: {} }, ["a"], "2026-10-27").flame, undefined);
});

test("a freeze covers exactly one missed day and is earned every seven days", () => {
  const p = { members: ["a", "b"], active: {}, flame: { n: 6, last: "2026-10-26", freezes: 1 } };
  const gap = flamePatch(p, ["a", "b"], "2026-10-28");
  assert.deepEqual(gap.flame, { n: 7, last: "2026-10-28", freezes: 1 });
  assert.equal(flamePatch({ ...p, flame: { n: 6, last: "2026-10-26", freezes: 0 } }, ["a", "b"], "2026-10-28").flame.n, 1);
  assert.equal(flamePatch({ ...p, flame: { n: 13, last: "2026-10-27", freezes: 2 } }, ["a", "b"], "2026-10-28").flame.freezes, 2);
  assert.equal(flamePatch({ ...p, flame: { n: 6, last: "2026-10-27", freezes: 0 } }, ["a", "b"], "2026-10-28").flame.freezes, 1);
});

test("the flame is shown as burning only while it can still be saved", () => {
  assert.deepEqual(flameNow(null, "2026-10-28"), { n: 0, alive: false, today: false, freezes: 0 });
  assert.equal(flameNow({ n: 4, last: "2026-10-28", freezes: 0 }, "2026-10-28").today, true);
  assert.equal(flameNow({ n: 4, last: "2026-10-27", freezes: 0 }, "2026-10-28").n, 4);
  assert.equal(flameNow({ n: 4, last: "2026-10-26", freezes: 0 }, "2026-10-28").alive, false);
  assert.equal(flameNow({ n: 4, last: "2026-10-26", freezes: 1 }, "2026-10-28").alive, true);
});

test("a mark and a signal move the flame and the counters on the server", async () => {
  const task = { minutes: 30, difficulty: 1, repeat: "daily" };
  const base = { ...pair, active: {}, stats: {} };
  const id = "t1_do_2026-10-28", data = { uid: "a", day: "2026-10-28" };
  const db = fakeDb({ "pairs/p": base, "pairs/p/tasks/t1": task, [`pairs/p/log/${id}`]: data });
  await onLogCreated({ db, now }, { pid: "p", logId: id, data });
  let p = db.docs.get("pairs/p");
  assert.deepEqual([p.active.a, p.stats.chores, p.flame], ["2026-10-28", 1, undefined]);
  const sd = { from: "b", kind: "message", key: "love", day: "2026-10-28" };
  db.docs.set("pairs/p/signals/s", sd); db.docs.set("pairs/p/devices/d3", { uid: "a", token: "T3", lang: "en" });
  await onSignalCreated({ db, messaging: fakeMessaging(), now }, { pid: "p", id: "s", data: sd });
  p = db.docs.get("pairs/p");
  assert.deepEqual([p.stats.signals, p.flame], [1, { n: 1, last: "2026-10-28", freezes: 0 }]);
  // done together counts for both and for the "together" counter
  const t2 = "t1_do_once", d2 = { uid: "a", day: "2026-10-28", together: true };
  const db2 = fakeDb({ "pairs/p": base, "pairs/p/tasks/t1": { ...task, repeat: "once" }, [`pairs/p/log/${t2}`]: d2 });
  await onLogCreated({ db: db2, now }, { pid: "p", logId: t2, data: d2 });
  const q = db2.docs.get("pairs/p");
  assert.deepEqual([q.stats.together, q.flame.n, q.active.b], [1, 1, "2026-10-28"]);
});

test("revealed games count for both partners", async () => {
  const a = ans("guess", 2, "a", { v: 1, g: 3 }), b = ans("guess", 2, "b", { v: 3, g: 1 });
  const { db } = await answer({ [`pairs/p/answers/${idOf(a)}`]: a, "pairs/p": { ...gp, active: {} } }, b);
  const p = db.docs.get("pairs/p");
  assert.deepEqual([p.stats.reveals, p.flame.n, p.active.a, p.active.b], [1, 1, "2026-10-28", "2026-10-28"]);
});

test("character shows what the pair does most, and only once there is enough of it", () => {
  assert.equal(traitOf({ chores: 3 }), null);
  assert.equal(traitOf({ chores: 20, together: 2 }), "homebody");
  assert.equal(traitOf({ chores: 4, together: 3, reveals: 2 }), "romantic");
  assert.equal(traitOf({ signals: 30, chores: 10, together: 1 }), "chatty");
  assert.equal(traitOf(undefined), null);
});

test("album milestones come from the counters", () => {
  const got = pr => MILESTONES.filter(m => m.test(pr)).map(m => m.id);
  assert.deepEqual(got({}), []);
  assert.deepEqual(got({ xp: 520, flame: { n: 8 }, stats: { together: 1, signals: 1 }, decor: { a: 1, b: 1, c: 1, d: 1, e: 1 } }),
    ["xp100", "xp500", "teen", "flame7", "together1", "signals1", "decor5"]);
  assert.equal(new Set(MILESTONES.map(m => m.id)).size, MILESTONES.length);
});

test("decor: bought with the pot when the partner agrees, once", async () => {
  const shop = { ...shopPair, decor: {} };
  const { db, messaging, res } = await run({ "pairs/p": shop }, "o1", order("decor", "lamp"));
  assert.equal(res, "proposed");
  assert.deepEqual([db.docs.get("pairs/p/orders/o1").cost, db.docs.get("pairs/p").pot], [DECOR.lamp.cost, 50]);
  assert.match(messaging.sent.find(m => m.tokens[0] === "T2").notification.body, /Лампа/);
  const after = { ...db.docs.get("pairs/p/orders/o1"), approvedBy: "b" };
  db.docs.set("pairs/p/orders/o1", after);
  await onOrderUpdated({ db, messaging }, { pid: "p", id: "o1", before: { ...after, approvedBy: undefined }, after });
  const p = db.docs.get("pairs/p");
  assert.deepEqual([p.decor.lamp, p.pot, p.stats.bought], [true, 50 - DECOR.lamp.cost, 1]);
  assert.equal((await run({ "pairs/p": p }, "o2", order("decor", "lamp"))).res, "bad-decor");
  assert.equal((await run({ "pairs/p": shop }, "o3", order("decor", "castle"))).res, "bad-decor");
});

test("decor and pet catalogues are complete", () => {
  assert.deepEqual(Object.keys(DECOR).sort(), Object.keys(DECOR_NAMES).sort());
  assert.ok(Object.values(DECOR_NAMES).every(n => n.length === 3 && n.every(x => x.length > 2)));
  assert.ok(Object.values(DECOR).every(d => Number.isInteger(d.cost) && d.cost > 0 && d.icon));
  assert.equal(STAGES.length, 4);
});

test("date wheel: every idea is tagged and the filters pick the right ones", () => {
  assert.ok(G.WHEEL.every(w => w.length === 5 && ["home", "out", "both"].includes(w[3]) && ["free", "paid", "both"].includes(w[4])));
  const all = G.wheelPool().length;
  assert.equal(all, 100);
  const home = G.wheelPool("home"), out = G.wheelPool("out"), free = G.wheelPool("any", "free"), paid = G.wheelPool("any", "paid");
  assert.ok(home.every(i => G.WHEEL[i][3] !== "out") && out.every(i => G.WHEEL[i][3] !== "home"));
  assert.ok(free.every(i => G.WHEEL[i][4] !== "paid") && paid.every(i => G.WHEEL[i][4] !== "free"));
  assert.ok(home.length + out.length >= all);
  // each of the four combinations has plenty of ideas, so no filter leaves the wheel empty
  for (const [p, c] of [["home", "free"], ["home", "paid"], ["out", "free"], ["out", "paid"]]) assert.ok(G.wheelPool(p, c).length >= 8, p + c);
  // ideas tagged "both" show up for either choice
  const either = G.WHEEL.map((w, i) => i).filter(i => G.WHEEL[i][3] === "both" && G.WHEEL[i][4] === "both");
  assert.ok(either.length >= 1 && either.every(i => G.wheelPool("home", "free").includes(i) && G.wheelPool("out", "paid").includes(i)));
  assert.deepEqual(G.wheelPool("home", "free").filter(i => !G.WHEEL[i][3].match(/home|both/) || !G.WHEEL[i][4].match(/free|both/)), []);
  assert.equal(G.wheelPool("nowhere", "never").length, 0);
});

test("the last cards of the 100 work: item 99 of guess and of wishes", async () => {
  const a = ans("guess", 99, "a", { v: 3, g: 0 }), b = ans("guess", 99, "b", { v: 0, g: 3 });
  const { db, res } = await answer({ [`pairs/p/answers/${idOf(a)}`]: a }, b);
  assert.equal(res, "revealed");
  assert.ok(db.docs.has("pairs/p/results/guess_99"));
  const w = ans("wishes", 99, "a", { v: "yes" }), x = ans("wishes", 99, "b", { v: "yes" });
  assert.equal((await answer({ [`pairs/p/answers/${idOf(w)}`]: w }, x)).res, "match");
  assert.equal((await answer({}, ans("wishes", 100, "a", { v: "yes" }))).res, "bad-answer");
});

// ---- push diagnostics ----
test("every send is recorded on the device: ok, or the error code", async () => {
  const db = fakeDb({ "pairs/p": sigPair, ...devs, "pairs/p/signals/s": sig }), messaging = fakeMessaging();
  await onSignalCreated({ db, messaging, now }, { pid: "p", id: "s", data: sig });
  assert.deepEqual([db.docs.get("pairs/p/devices/d1").lastResult.ok, db.docs.get("pairs/p/devices/d2").lastResult.ok], [true, true]);
  assert.equal(db.docs.get("pairs/p/devices/d3").lastResult, undefined); // the sender's own phone is not messaged
  // another failure than a dead token: kept, with the code, and logged
  const failing = { sent: [], sendEachForMulticast: async m => ({ responses: m.tokens.map(() => ({ success: false, error: { code: "messaging/third-party-auth-error" } })) }) };
  const db2 = fakeDb({ "pairs/p": sigPair, ...devs, "pairs/p/signals/s": sig }), logged = [], orig = console.error;
  console.error = (...a) => logged.push(a.join(" "));
  try { await onSignalCreated({ db: db2, messaging: failing, now }, { pid: "p", id: "s", data: sig }); } finally { console.error = orig; }
  assert.deepEqual(db2.docs.get("pairs/p/devices/d1").lastResult.code, "messaging/third-party-auth-error");
  assert.equal(db2.docs.has("pairs/p/devices/d1"), true);
  assert.equal(logged.length, 2);
});

test("a test request sends one notification to that phone in its language and records the result", async () => {
  const dev = { uid: "b", token: "T1", lang: "el", at: 1 };
  const db = fakeDb({ "pairs/p": sigPair, "pairs/p/devices/d1": { ...dev, test: 5 } }), messaging = fakeMessaging();
  assert.equal(await onDeviceUpdated({ db, messaging }, { pid: "p", id: "d1", before: dev, after: { ...dev, test: 5 } }), "sent");
  assert.deepEqual(messaging.sent.map(m => [m.tokens, m.notification.title, m.notification.body]), [[["T1"], "Folia", "Έλεγχος ειδοποιήσεων: λειτουργεί! 🦊"]]);
  assert.equal(db.docs.get("pairs/p/devices/d1").lastResult.ok, true);
  // writing the result back (test unchanged), a missing token or no request: nothing is sent
  const same = { ...dev, test: 5 };
  assert.equal(await onDeviceUpdated({ db, messaging }, { pid: "p", id: "d1", before: same, after: { ...same, lastResult: { ok: true } } }), "ignored");
  assert.equal(await onDeviceUpdated({ db, messaging }, { pid: "p", id: "d1", before: dev, after: dev }), "ignored");
  assert.equal(await onDeviceUpdated({ db, messaging }, { pid: "p", id: "d1", before: {}, after: { uid: "b", test: 9 } }), "ignored");
  assert.equal(messaging.sent.length, 1);
  // a failed test says why
  const bad = { sendEachForMulticast: async () => ({ responses: [{ success: false, error: { code: "messaging/invalid-argument" } }] }) };
  assert.equal(await onDeviceUpdated({ db, messaging: bad }, { pid: "p", id: "d1", before: dev, after: { ...dev, test: 6 } }), "failed");
  assert.equal(db.docs.has("pairs/p/devices/d1"), false); // a token Google calls invalid is removed, so the app registers again
});
