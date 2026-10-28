// Live data from Firestore plus every write the app makes. Stars are never written here: the server awards them.
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, query, where, onSnapshot, writeBatch, arrayUnion, arrayRemove } from "firebase/firestore";
import { auth, db, googleSignIn, appSignOut } from "./fb.js";
import { POLICY_VERSION } from "./config.js";
import { DEFAULT_SCALE } from "../functions/economy.js";
import { newInviteCode, normCode, dayKey, logCutoff, PACKS, packTask } from "./domain.js";

export const M = { ready: false, user: null, profile: null, pair: null, tasks: [], logs: new Map(), logList: [], error: "" };

let notify = () => {};
let unsubs = [];
const RECENT = new Map(), ONCE = new Map();

const rows = snap => snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
const me = () => M.user.uid;
const pairRef = () => doc(db, "pairs", M.pair.id);
const userRef = () => doc(db, "users", me());

function stopPair() {
  unsubs.forEach(f => f()); unsubs = [];
  M.pair = null; M.tasks = []; M.logs = new Map(); M.logList = [];
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
export async function signOutAll() { stopPair(); await appSignOut(); }

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
  stopPair();
  await updateDoc(ref, { members: arrayRemove(me()) });
  await setProfile({ pairId: null });
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
export async function addPack(packId, tr) {
  const pack = PACKS.find(p => p.id === packId);
  const b = writeBatch(db);
  pack.tasks.forEach((row, i) => {
    const task = packTask(row);
    b.set(doc(collection(db, "pairs", M.pair.id, "tasks")), Object.assign(task, { title: tr(task.title), createdBy: me(), createdAt: Date.now() + i }));
  });
  await b.commit();
}

// Mark a stage as done. The id makes it unique; the server checks it and awards the stars.
export const claim = (view, stage) => setDoc(doc(db, "pairs", M.pair.id, "log", stage.id),
  Object.assign({ uid: me(), day: dayKey(), at: Date.now() }, view.period === "once" ? { once: true } : {}));
export const unclaim = markId => deleteDoc(doc(db, "pairs", M.pair.id, "log", markId));
