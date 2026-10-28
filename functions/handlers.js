// Server logic, kept free of Firebase triggers so it can be tested with fakes.
// deps: { db, now } — an Admin Firestore instance (or a fake with the same surface) and the current time.
import { FieldValue } from "firebase-admin/firestore";
import { stageStars, togetherStars, parseLogId, periodKey } from "./economy.js";

const inc = n => FieldValue.increment(n);

// The phone's day may differ from the server's by a time zone, never by more than a day.
function nearToday(day, now) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day || "");
  if (!m) return false;
  return Math.abs(Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) <= 86400000;
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
