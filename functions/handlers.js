// Server logic, kept free of Firebase triggers so it can be tested with fakes.
// deps: { db, now } — an Admin Firestore instance (or a fake with the same surface) and the current time.
import { FieldValue } from "firebase-admin/firestore";
import { stageStars, togetherStars, parseLogId, periodKey } from "./economy.js";
import { isKnown, pushText, LIMITS } from "./signals.js";

const inc = n => FieldValue.increment(n);

// The phone's day may differ from the server's by a time zone, never by more than a day.
function nearToday(day, now) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day || "");
  if (!m) return false;
  return Math.abs(Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) <= 86400000;
}

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
    tx.update(pairRef, { [`sigDay.${data.from}`]: Object.assign({}, used, { [data.kind]: (used[data.kind] || 0) + 1 }) });
    return { partner, name: (p.names && p.names[data.from]) || "" };
  });
  if (res.reason) return res.reason;
  let taskTitle = "";
  const parsed = data.kind === "reaction" && data.ref ? parseLogId(data.ref) : null;
  if (parsed) { const t = await db.doc(`pairs/${pid}/tasks/${parsed.taskId}`).get(); taskTitle = t.exists ? t.data().title : ""; }
  await pushTo(deps, pid, res.partner, res.name || "Nora", lang => pushText(data.kind, data.key, lang, taskTitle));
  return "sent";
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
      tx.update(pairRef, { pot: inc(stars), xp: inc(stars) });
      return stars;
    }
    const stars = stageStars(t, parsed.stage, p.scale);
    if (!stars) return reject("bad-stage");
    tx.update(logRef, { stars });
    tx.update(pairRef, { [`balances.${data.uid}`]: inc(stars), pot: inc(stars), xp: inc(stars) });
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
