// Live data from Firestore plus every write the app makes. Stars are never written here: the server awards them.
import { onAuthStateChanged, deleteUser } from "firebase/auth";
import { collection, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, query, where, onSnapshot, writeBatch, arrayUnion, arrayRemove, deleteField } from "firebase/firestore";
import { auth, db, googleSignIn, appSignOut } from "./fb.js";
import { startPush, stopPush, pushSupported } from "./push.js";
import { POLICY_VERSION } from "./config.js";
import { DEFAULT_SCALE } from "../functions/economy.js";
import { newInviteCode, normCode, dayKey, logCutoff, uid as newId } from "./domain.js";

export const M = { ready: false, user: null, profile: null, pair: null, tasks: [], logs: new Map(), logList: [], signals: [], rewards: [], orders: [], error: "" };

let notify = () => {};
let unsubs = [];
const RECENT = new Map(), ONCE = new Map();

const rows = snap => snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
const me = () => M.user.uid;
const pairRef = () => doc(db, "pairs", M.pair.id);
const userRef = () => doc(db, "users", me());

function stopPair() {
  unsubs.forEach(f => f()); unsubs = [];
  M.pair = null; M.tasks = []; M.logs = new Map(); M.logList = []; M.signals = []; M.rewards = []; M.orders = [];
  RECENT.clear(); ONCE.clear();
}
function rebuildLogs() {
  M.logs = new Map([...ONCE, ...RECENT]);
  M.logList = [...M.logs.values()];
  notify();
}
function onErr(e) { M.error = (e && (e.code || e.message)) || "error"; notify(); }

function watchPair(pid) {
  if (M.pair && M.pair.id === pid) return;
  stopPair();
  M.pair = { id: pid, members: [], names: {}, loading: true };
  const base = ["pairs", pid];
  unsubs.push(onSnapshot(doc(db, ...base), snap => {
    // we were removed from the pair (left on another phone) or it no longer exists
    if (!snap.exists() || !(snap.data().members || []).includes(me())) { stopPair(); M.profile = Object.assign({}, M.profile, { pairId: null }); notify(); return; }
    M.pair = Object.assign({ id: pid }, snap.data());
    notify();
  }, e => { stopPair(); onErr(e); }));
  unsubs.push(onSnapshot(collection(db, ...base, "tasks"), s => { M.tasks = rows(s).filter(t => !t.archived); notify(); }, onErr));
  unsubs.push(onSnapshot(query(collection(db, ...base, "log"), where("day", ">=", logCutoff(dayKey()))), s => {
    RECENT.clear(); rows(s).forEach(r => RECENT.set(r.id, r)); rebuildLogs();
  }, onErr));
  unsubs.push(onSnapshot(collection(db, ...base, "rewards"), s => { M.rewards = rows(s); notify(); }, onErr));
  unsubs.push(onSnapshot(collection(db, ...base, "orders"), s => { M.orders = rows(s); notify(); }, onErr));
  unsubs.push(onSnapshot(query(collection(db, ...base, "signals"), where("day", ">=", logCutoff(dayKey()))), s => {
    M.signals = rows(s).sort((a, b) => (b.at || 0) - (a.at || 0)); notify();
  }, onErr));
  unsubs.push(onSnapshot(query(collection(db, ...base, "log"), where("once", "==", true)), s => {
    ONCE.clear(); rows(s).forEach(r => ONCE.set(r.id, r)); rebuildLogs();
  }, onErr));
}

export function start(onChange) {
  notify = onChange;
  onAuthStateChanged(auth, async user => {
    stopPair();
    M.user = user; M.profile = null; M.error = "";
    if (user) {
      try {
        const p = await getDoc(doc(db, "users", user.uid));
        M.profile = p.exists() ? p.data() : {};
        if (M.profile.pairId) watchPair(M.profile.pairId);
      } catch (e) { onErr(e); M.profile = {}; }
    }
    M.ready = true; notify();
  });
}

export const signIn = () => googleSignIn();
export async function signOutAll() { await unregisterDevice(); stopPair(); await appSignOut(); }

// ---- the shop ----
const rewardFields = r => ({ title: r.title.trim().slice(0, 80), cost: r.cost, scope: r.scope });
export async function saveReward(r) {
  if (r.id) return updateDoc(doc(db, "pairs", M.pair.id, "rewards", r.id), rewardFields(r));
  await addDoc(collection(db, "pairs", M.pair.id, "rewards"), Object.assign(rewardFields(r), { createdBy: me(), createdAt: Date.now() }));
}
export const deleteReward = id => deleteDoc(doc(db, "pairs", M.pair.id, "rewards", id));
export async function addRewards(list) {
  const b = writeBatch(db);
  list.forEach((r, i) => b.set(doc(collection(db, "pairs", M.pair.id, "rewards")), Object.assign(rewardFields(r), { createdBy: me(), createdAt: Date.now() + i })));
  await b.commit();
}
// Ask to buy a reward or a game. The server prices and charges it; a joint one waits for the partner.
export const placeOrder = (kind, ref) => addDoc(collection(db, "pairs", M.pair.id, "orders"), { uid: me(), kind, ref, at: Date.now() });
export const approveOrder = id => updateDoc(doc(db, "pairs", M.pair.id, "orders", id), { approvedBy: me() });
export const cancelOrder = id => deleteDoc(doc(db, "pairs", M.pair.id, "orders", id));
export const markUsed = id => updateDoc(doc(db, "pairs", M.pair.id, "orders", id), { used: true });

// ---- push: this phone's token, so the partner's reactions and signals reach it ----
let token = "", deviceLang = "ru", onPushMessage = () => {};
const LS = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
function deviceId() { let id = LS.get("nora-device"); if (!id) { id = newId(); LS.set("nora-device", id); } return id; }
async function writeDevice() {
  if (!token || !M.pair || !M.user) return;
  await setDoc(doc(db, "pairs", M.pair.id, "devices", deviceId()), { uid: me(), token, lang: deviceLang, at: Date.now() });
}
export async function registerDevice(lang, onMessage) {
  if (!pushSupported()) return false;
  deviceLang = lang; onPushMessage = onMessage || onPushMessage;
  return startPush(t => { token = t; writeDevice().catch(() => {}); }, m => onPushMessage(m));
}
export const setDeviceLang = lang => { deviceLang = lang; return writeDevice().catch(() => {}); };
async function unregisterDevice() {
  if (!M.pair || !M.user || !token) return;
  await deleteDoc(doc(db, "pairs", M.pair.id, "devices", deviceId())).catch(() => {});
  token = ""; await stopPush();
}

// A reaction to a mark or a warm signal. The server checks it, counts the daily limit and sends the push.
export const sendSignal = (kind, key, ref) => addDoc(collection(db, "pairs", M.pair.id, "signals"),
  Object.assign({ from: me(), kind, key, day: dayKey(), at: Date.now() }, ref ? { ref } : {}));

async function setProfile(patch) {
  M.profile = Object.assign({}, M.profile, patch);
  await setDoc(userRef(), patch, { merge: true });
}
export const saveLang = lang => M.user ? setProfile({ lang }) : Promise.resolve();

export async function createPair(name) {
  const code = newInviteCode();
  const ref = doc(collection(db, "pairs"));
  const b = writeBatch(db);
  b.set(ref, { members: [me()], names: { [me()]: name }, inviteCode: code, createdAt: Date.now(), scale: DEFAULT_SCALE, consent: POLICY_VERSION });
  b.set(doc(db, "invites", code), { pid: ref.id });
  b.set(userRef(), { pairId: ref.id, name, consent: POLICY_VERSION, createdAt: Date.now() }, { merge: true });
  await b.commit();
  M.profile = Object.assign({}, M.profile, { pairId: ref.id, name });
  watchPair(ref.id);
}

export async function joinPair(codeIn, name) {
  const code = normCode(codeIn);
  const inv = code && await getDoc(doc(db, "invites", code));
  if (!inv || !inv.exists()) throw { code: "bad-code" };
  const pid = inv.data().pid;
  try {
    await updateDoc(doc(db, "pairs", pid), { members: arrayUnion(me()), [`names.${me()}`]: name, joinProof: code });
  } catch (e) { throw e && e.code === "permission-denied" ? { code: "pair-full" } : e; }
  await setProfile({ pairId: pid, name, consent: POLICY_VERSION, createdAt: Date.now() });
  watchPair(pid);
}

// The code stays valid while the pair exists, so a partner who left can come back with it.
// The one who stays can replace it, and the old code stops working.
export async function newInvite() {
  const code = newInviteCode();
  const b = writeBatch(db);
  b.update(pairRef(), { inviteCode: code });
  b.set(doc(db, "invites", code), { pid: M.pair.id });
  if (M.pair.inviteCode) b.delete(doc(db, "invites", M.pair.inviteCode));
  await b.commit();
}

export async function leavePair() {
  const ref = pairRef();
  await unregisterDevice();
  stopPair();
  await updateDoc(ref, { members: arrayRemove(me()) });
  await setProfile({ pairId: null });
}

// GDPR erasure: remove the name from the pair, leave it, delete the profile and the sign-in record.
// Marks stay in the pair's history with the technical id only and go away with the pair.
// Google asks for a fresh sign-in before an account can be deleted, so we sign in again first.
export async function deleteAccount() {
  const uid = me(), pid = M.pair && M.pair.id;
  const cred = await googleSignIn();
  if (cred.user.uid !== uid) throw { code: "other-account" };
  await unregisterDevice();
  stopPair();
  if (pid) {
    const ref = doc(db, "pairs", pid);
    await updateDoc(ref, { [`names.${uid}`]: deleteField() });
    await updateDoc(ref, { members: arrayRemove(uid) });
  }
  await deleteDoc(doc(db, "users", uid));
  await deleteUser(auth.currentUser);
  await appSignOut().catch(() => {});
}

export const saveName = name => Promise.all([updateDoc(pairRef(), { [`names.${me()}`]: name }), setProfile({ name })]);
export const saveScale = n => updateDoc(pairRef(), { scale: n });

const taskFields = t => ({ title: t.title.trim().slice(0, 80), minutes: t.minutes, difficulty: t.difficulty, repeat: t.repeat, full: !!t.full });
export async function saveTask(t) {
  if (t.id) return updateDoc(doc(db, "pairs", M.pair.id, "tasks", t.id), taskFields(t));
  const ref = await addDoc(collection(db, "pairs", M.pair.id, "tasks"), Object.assign(taskFields(t), { createdBy: me(), createdAt: Date.now() }));
  return ref.id;
}
export const deleteTask = id => deleteDoc(doc(db, "pairs", M.pair.id, "tasks", id));
export async function addTasks(tasks) {
  const b = writeBatch(db);
  tasks.forEach((task, i) => b.set(doc(collection(db, "pairs", M.pair.id, "tasks")), Object.assign(taskFields(task), { createdBy: me(), createdAt: Date.now() + i })));
  await b.commit();
}

// Mark a stage as done (alone or, for the doing stage, together). The id makes it unique; the server checks it and awards the stars.
export const claim = (view, stage, together) => setDoc(doc(db, "pairs", M.pair.id, "log", stage.id),
  Object.assign({ uid: me(), day: dayKey(), at: Date.now() }, view.period === "once" ? { once: true } : {}, together ? { together: true } : {}));
export const unclaim = markId => deleteDoc(doc(db, "pairs", M.pair.id, "log", markId));
