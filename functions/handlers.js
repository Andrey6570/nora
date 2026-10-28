// Server logic, kept free of Firebase triggers so it can be tested with fakes.
// deps: { db, now } — an Admin Firestore instance (or a fake with the same surface) and the current time.
import { FieldValue } from "firebase-admin/firestore";
import { stageStars, togetherStars, parseLogId, periodKey } from "./economy.js";
import { isKnown, pushText, shopText, LIMITS } from "./signals.js";
import { GAMES, isPaidGame, gameName, isUnlocked } from "./games.js";
import { GUESS_OPTIONS, WISHES, WISH_ANSWERS, wishLevel } from "./gamedata.js";
import { flamePatch, DECOR, decorName } from "./pet.js";

const inc = n => FieldValue.increment(n);

// The phone's day may differ from the server's by a time zone, never by more than a day.
function nearToday(day, now) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day || "");
  if (!m) return false;
  return Math.abs(Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) <= 86400000;
}

const nowDay = d => d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0");
const LANGS = ["ru", "en", "el"];
const DEAD = ["messaging/registration-token-not-registered", "messaging/invalid-registration-token", "messaging/invalid-argument"];

// Push to every device of one partner, one message per language; devices with a dead token are removed.
async function pushTo({ db, messaging }, pid, uid, title, build) {
  const snap = await db.collection(`pairs/${pid}/devices`).where("uid", "==", uid).get();
  const list = snap.docs.map(d => ({ ref: d.ref, token: d.data().token, lang: LANGS.includes(d.data().lang) ? d.data().lang : "en" })).filter(d => d.token);
  const byLang = {};
  list.forEach(d => { (byLang[d.lang] = byLang[d.lang] || []).push(d); });
  for (const [lang, group] of Object.entries(byLang)) {
    const res = await messaging.sendEachForMulticast({
      tokens: group.map(d => d.token), notification: { title, body: build(lang) },
      android: { priority: "high", notification: { channelId: "default" } }
    });
    await Promise.all(res.responses.map((r, i) => (!r.success && r.error && DEAD.includes(r.error.code)) ? group[i].ref.delete() : null));
  }
  return list.length;
}

// A partner sent a reaction or a warm signal: check it against the catalogue and the daily limit,
// then tell the other partner. A rejected signal is removed.
export async function onSignalCreated(deps, { pid, id, data }) {
  const { db, now = () => new Date() } = deps;
  const ref = db.doc(`pairs/${pid}/signals/${id}`), pairRef = db.doc(`pairs/${pid}`);
  const res = await db.runTransaction(async tx => {
    const pair = await tx.get(pairRef);
    const p = pair.exists ? pair.data() : null;
    const reject = reason => { tx.delete(ref); return { reason }; };
    if (!p || !data || !(p.members || []).includes(data.from)) return reject("bad-signal");
    if (!isKnown(data.kind, data.key) || !nearToday(data.day, now())) return reject("bad-signal");
    const partner = (p.members || []).find(u => u !== data.from);
    if (!partner) return reject("no-partner");
    const mine = (p.sigDay && p.sigDay[data.from]) || {};
    const used = mine.day === data.day ? mine : { day: data.day, message: 0, reaction: 0 };
    if ((used[data.kind] || 0) >= LIMITS[data.kind]) return reject("limit");
    tx.update(pairRef, Object.assign({ [`sigDay.${data.from}`]: Object.assign({}, used, { [data.kind]: (used[data.kind] || 0) + 1 }), "stats.signals": inc(1) },
      flamePatch(p, [data.from], data.day)));
    return { partner, name: (p.names && p.names[data.from]) || "" };
  });
  if (res.reason) return res.reason;
  let taskTitle = "";
  const parsed = data.kind === "reaction" && data.ref ? parseLogId(data.ref) : null;
  if (parsed) { const t = await db.doc(`pairs/${pid}/tasks/${parsed.taskId}`).get(); taskTitle = t.exists ? t.data().title : ""; }
  await pushTo(deps, pid, res.partner, res.name || "Nora", lang => pushText(data.kind, data.key, lang, taskTitle));
  return "sent";
}

// ---- answers to the games where both partners answer in private ----
// An answer is stored under pairs/{pid}/answers/{game}_{item}_{uid} and can be read only by its author. When the partner's
// answer is there too, the server writes pairs/{pid}/results/{game}_{item}, which both can read:
//   guess  -> both answers and guesses
//   wishes -> only a match ("yes" when both said yes, "maybe" when both are at least open); a "no" is never revealed
const isIndex = (n, size) => Number.isInteger(n) && n >= 0 && n < size;
function validAnswer(data) {
  const item = Number(data.item);
  if (!/^\d{1,2}$/.test(String(data.item))) return false;
  if (data.game === "guess") return isIndex(item, GUESS_OPTIONS.length) && isIndex(data.v, GUESS_OPTIONS[item]) && isIndex(data.g, GUESS_OPTIONS[item]);
  if (data.game === "wishes") return isIndex(item, WISHES.length) && WISH_ANSWERS.includes(data.v) && data.g === undefined;
  return false;
}
export async function onAnswerCreated({ db, now = () => new Date() }, { pid, id, data }) {
  const ref = db.doc(`pairs/${pid}/answers/${id}`), pairRef = db.doc(`pairs/${pid}`);
  return db.runTransaction(async tx => {
    const pair = await tx.get(pairRef);
    const p = pair.exists ? pair.data() : null;
    const reject = reason => { tx.delete(ref); return reason; };
    if (!p || !data || !(p.members || []).includes(data.uid) || id !== `${data.game}_${data.item}_${data.uid}`) return reject("bad-answer");
    if (!isUnlocked(p, data.game) || !validAnswer(data)) return reject("bad-answer");
    const partner = (p.members || []).find(u => u !== data.uid);
    if (!partner) return "waiting";
    const other = await tx.get(db.doc(`pairs/${pid}/answers/${data.game}_${data.item}_${partner}`));
    if (!other.exists) return "waiting";
    const o = other.data(), resRef = db.doc(`pairs/${pid}/results/${data.game}_${data.item}`);
    if (data.game === "guess") {
      tx.set(resRef, { game: "guess", item: data.item, answers: { [data.uid]: { v: data.v, g: data.g }, [partner]: { v: o.v, g: o.g } }, at: now().getTime() });
      tx.update(pairRef, Object.assign({ "stats.reveals": inc(1) }, flamePatch(p, p.members, nowDay(now()))));
      return "revealed";
    }
    const level = wishLevel(data.v, o.v);
    if (!level) return "no-match";
    tx.set(resRef, { game: "wishes", item: data.item, level, at: now().getTime() });
    tx.update(pairRef, Object.assign({ "stats.reveals": inc(1), "stats.matches": inc(1) }, flamePatch(p, p.members, nowDay(now()))));
    return "match";
  });
}

// A game or a piece of decor is named by its catalogue id; a reward by the title the pair gave it.
const orderName = (named, ref, title, lang) => named === "game" ? gameName(ref, lang) : named === "decor" ? decorName(ref, lang) : title;

// ---- the shop: personal rewards from one's own stars, joint rewards and games from the pot with the partner's consent ----
// An order document holds only who and what; the server decides the price, the source of the stars and the status:
//   personal reward -> bought at once from the buyer's balance
//   joint reward / game -> proposed, bought when the partner agrees (approvedBy), from the pot
export async function onOrderCreated(deps, { pid, id, data }) {
  const { db } = deps;
  const ref = db.doc(`pairs/${pid}/orders/${id}`), pairRef = db.doc(`pairs/${pid}`);
  const res = await db.runTransaction(async tx => {
    const pair = await tx.get(pairRef);
    const p = pair.exists ? pair.data() : null;
    const reject = reason => { tx.delete(ref); return { reason }; };
    if (!p || !data || !(p.members || []).includes(data.uid)) return reject("bad-order");
    const partner = (p.members || []).find(u => u !== data.uid);
    let title, cost, joint;
    if (data.kind === "reward") {
      const r = await tx.get(db.doc(`pairs/${pid}/rewards/${data.ref}`));
      if (!r.exists) return reject("no-reward");
      ({ title, cost } = r.data()); joint = r.data().scope === "joint";
    } else if (data.kind === "game") {
      if (!isPaidGame(data.ref) || (p.games && p.games[data.ref])) return reject("bad-game");
      title = data.ref; cost = GAMES[data.ref].cost; joint = true;
    } else if (data.kind === "decor") {
      if (!DECOR[data.ref] || (p.decor && p.decor[data.ref])) return reject("bad-decor");
      title = data.ref; cost = DECOR[data.ref].cost; joint = true;
    } else return reject("bad-order");
    if (!Number.isInteger(cost) || cost < 1) return reject("bad-cost");
    if (joint) {
      if (!partner) return reject("no-partner");
      if ((p.pot || 0) < cost) return reject("not-enough");
      tx.update(ref, { status: "proposed", cost, title, joint: true });
      return { partner, name: (p.names && p.names[data.uid]) || "", title, cost, kind: "proposed", named: data.kind === "reward" ? "" : data.kind, ref: data.ref };
    }
    if (((p.balances && p.balances[data.uid]) || 0) < cost) return reject("not-enough");
    tx.update(ref, { status: "bought", cost, title, joint: false });
    tx.update(pairRef, { [`balances.${data.uid}`]: inc(-cost) });
    return partner ? { partner, name: (p.names && p.names[data.uid]) || "", title, cost, kind: "personal" } : { done: true };
  });
  if (res.reason) return res.reason;
  if (res.done) return "bought";
  await pushTo(deps, pid, res.partner, res.name || "Nora", lang => shopText(res.kind, lang, orderName(res.named, res.ref, res.title, lang), res.cost));
  return res.kind === "personal" ? "bought" : "proposed";
}

// The partner agreed to a proposal: spend the pot (if it still holds enough) and unlock a game.
export async function onOrderUpdated(deps, { pid, id, before, after }) {
  if (!before || !after || before.approvedBy || !after.approvedBy || after.status !== "proposed") return "ignored";
  const { db } = deps;
  const ref = db.doc(`pairs/${pid}/orders/${id}`), pairRef = db.doc(`pairs/${pid}`);
  const res = await db.runTransaction(async tx => {
    const [order, pair] = [await tx.get(ref), await tx.get(pairRef)];
    if (!order.exists || !pair.exists) return { reason: "gone" };
    const o = order.data(), p = pair.data();
    if (o.status !== "proposed" || !o.approvedBy) return { reason: "ignored" };
    if (o.approvedBy === o.uid || !(p.members || []).includes(o.approvedBy)) { tx.update(ref, { approvedBy: FieldValue.delete() }); return { reason: "bad-approval" }; }
    if ((p.pot || 0) < o.cost) { tx.delete(ref); return { reason: "not-enough" }; }
    tx.update(ref, { status: "bought" });
    tx.update(pairRef, Object.assign({ pot: inc(-o.cost), "stats.bought": inc(1) }, o.kind === "game" ? { [`games.${o.ref}`]: true } : {}, o.kind === "decor" ? { [`decor.${o.ref}`]: true } : {}));
    return { buyer: o.uid, approver: o.approvedBy, title: o.title, named: o.kind === "reward" ? "" : o.kind, ref: o.ref, names: p.names || {} };
  });
  if (res.reason) return res.reason;
  await pushTo(deps, pid, res.buyer, res.names[res.approver] || "Nora", lang => shopText("approved", lang, orderName(res.named, res.ref, res.title, lang)));
  return "bought";
}

// A partner marked a stage: check it against the task and award the stars to them and to the shared pot.
// A chore done together brings double stars, all into the shared pot and none to personal balances.
export async function onLogCreated({ db, now = () => new Date() }, { pid, logId, data }) {
  const logRef = db.doc(`pairs/${pid}/log/${logId}`);
  const pairRef = db.doc(`pairs/${pid}`);
  const parsed = parseLogId(logId);
  return db.runTransaction(async tx => {
    const pair = await tx.get(pairRef);
    const p = pair.exists ? pair.data() : null;
    // a rejected mark is removed so the stage stays free to claim
    const reject = reason => { tx.delete(logRef); return reason; };
    if (!p || !data || !parsed || !(p.members || []).includes(data.uid)) return reject("bad-log");
    if (!nearToday(data.day, now())) return reject("bad-day");
    const task = await tx.get(db.doc(`pairs/${pid}/tasks/${parsed.taskId}`));
    if (!task.exists) return reject("no-task");
    const t = task.data();
    if (periodKey(t, data.day || "") !== parsed.period) return reject("bad-period");
    if (data.together) {
      if (parsed.stage !== "do" || (p.members || []).length !== 2) return reject("bad-together");
      const stars = togetherStars(t, p.scale);
      tx.update(logRef, { stars });
      // done together: both partners count for the flame
      tx.update(pairRef, Object.assign({ pot: inc(stars), xp: inc(stars), "stats.together": inc(1) }, flamePatch(p, p.members, data.day)));
      return stars;
    }
    const stars = stageStars(t, parsed.stage, p.scale);
    if (!stars) return reject("bad-stage");
    tx.update(logRef, { stars });
    tx.update(pairRef, Object.assign({ [`balances.${data.uid}`]: inc(stars), pot: inc(stars), xp: inc(stars) },
      parsed.stage === "do" ? { "stats.chores": inc(1) } : {}, flamePatch(p, [data.uid], data.day)));
    return stars;
  });
}

// A partner took a mark back: return the stars it brought.
export async function onLogDeleted({ db }, { pid, data }) {
  const stars = Number(data && data.stars) || 0;
  if (!stars || !data.uid) return 0;
  const pairRef = db.doc(`pairs/${pid}`);
  const pair = await pairRef.get();
  if (!pair.exists) return 0;
  await pairRef.update(Object.assign({ pot: inc(-stars), xp: inc(-stars) }, data.together ? {} : { [`balances.${data.uid}`]: inc(-stars) }));
  return -stars;
}

// The last partner left: remove the pair with everything inside it.
export async function onPairUpdated({ db }, { pid, after }) {
  if (!after || (after.members || []).length > 0) return false;
  await db.recursiveDelete(db.doc(`pairs/${pid}`));
  if (after.inviteCode) await db.doc(`invites/${after.inviteCode}`).delete().catch(() => {});
  return true;
}
