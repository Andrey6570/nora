// In-memory store with the same surface as store.js. Opens with ?demo in a browser: lets you look at every
// screen before Firebase is set up, and drives the layout smoke test. It awards stars the way the server does.
import { stageStars, togetherStars, parseLogId, DEFAULT_SCALE } from "../functions/economy.js";
import { newInviteCode, dayKey, uid } from "./domain.js";

export const M = { ready: false, user: null, profile: null, pair: null, tasks: [], logs: new Map(), logList: [], error: "", demo: true };
let notify = () => {};
const ME = "me", PARTNER = "partner";
const sync = () => { M.logList = [...M.logs.values()]; notify(); };

function seed(stage) {
  M.user = { uid: ME };
  if (stage === "signedout") { M.user = null; return; }
  M.profile = { name: "Андрей" };
  if (stage === "nopair") return;
  M.profile.pairId = "demo";
  M.pair = { id: "demo", members: [ME], names: { [ME]: "Андрей" }, inviteCode: "K7M2QX", scale: DEFAULT_SCALE, balances: {}, pot: 0, xp: 0 };
  if (stage === "alone") return;
  M.pair.members.push(PARTNER); M.pair.names[PARTNER] = "Мария";
  const now = Date.now(), today = dayKey(), y = new Date(); y.setDate(y.getDate() - 1);
  M.tasks = [
    { id: "t1", title: "Помыть посуду", minutes: 15, difficulty: 1, repeat: "daily", full: false, createdAt: now - 5 },
    { id: "t2", title: "Приготовить ужин", minutes: 45, difficulty: 2, repeat: "daily", full: false, createdAt: now - 4 },
    { id: "t3", title: "Закупка продуктов на неделю", minutes: 60, difficulty: 2, repeat: "weekly", full: true, createdAt: now - 3 },
    { id: "t4", title: "Записаться к врачу", minutes: 15, difficulty: 2, repeat: "once", full: true, createdAt: now - 2 },
    { id: "t5", title: "Вызвать мастера", minutes: 20, difficulty: 2, repeat: "once", full: true, createdAt: now - 1 }
  ];
  const mark = (id, who, day) => award(id, { uid: who, day, at: now });
  mark("t1_do_" + today, PARTNER, today);
  award("t2_do_" + today, { uid: PARTNER, day: today, at: now, together: true });
  mark("t2_do_" + dayKey(y), ME, dayKey(y));
  mark("t4_notice_once", PARTNER, dayKey(y));
  mark("t4_plan_once", PARTNER, today);
  mark("t5_notice_once", ME, today);
}

function award(id, data) {
  const p = parseLogId(id), task = M.tasks.find(t => t.id === p.taskId);
  const stars = !task ? 0 : data.together ? togetherStars(task, M.pair.scale) : stageStars(task, p.stage, M.pair.scale);
  M.logs.set(id, Object.assign({ id, stars }, data));
  if (!data.together) M.pair.balances[data.uid] = (M.pair.balances[data.uid] || 0) + stars;
  M.pair.pot += stars; M.pair.xp += stars;
}

export function start(onChange) {
  notify = onChange;
  seed(new URLSearchParams(location.search).get("demo") || "full");
  M.ready = true; notify();
}

export async function signIn() { M.user = { uid: ME }; M.profile = {}; notify(); }
export async function signOutAll() { M.user = null; M.profile = null; M.pair = null; notify(); }
export async function saveLang() {}
export async function createPair(name) {
  M.profile = { name, pairId: "demo" };
  M.pair = { id: "demo", members: [ME], names: { [ME]: name }, inviteCode: newInviteCode(), scale: DEFAULT_SCALE, balances: {}, pot: 0, xp: 0 };
  notify();
}
export async function joinPair(code, name) {
  if (code.length < 6) throw { code: "bad-code" };
  M.profile = { name, pairId: "demo" };
  M.pair = { id: "demo", members: [PARTNER, ME], names: { [PARTNER]: "Мария", [ME]: name }, scale: DEFAULT_SCALE, balances: {}, pot: 0, xp: 0 };
  notify();
}
export async function newInvite() { M.pair.inviteCode = newInviteCode(); notify(); }
export async function deleteAccount() { M.user = null; M.profile = null; M.pair = null; M.tasks = []; M.logs = new Map(); sync(); }
export async function leavePair() { M.pair = null; M.tasks = []; M.logs = new Map(); M.profile.pairId = null; sync(); }
export async function saveName(name) { M.pair.names[ME] = name; M.profile.name = name; notify(); }
export async function saveScale(n) { M.pair.scale = n; notify(); }
export async function saveTask(t) {
  const fields = { title: t.title.trim(), minutes: t.minutes, difficulty: t.difficulty, repeat: t.repeat, full: !!t.full };
  if (t.id) Object.assign(M.tasks.find(x => x.id === t.id), fields);
  else M.tasks.push(Object.assign(fields, { id: uid(), createdAt: Date.now() }));
  notify();
}
export async function deleteTask(id) { M.tasks = M.tasks.filter(t => t.id !== id); notify(); }
export async function addTasks(tasks) {
  tasks.forEach((t, i) => M.tasks.push(Object.assign({}, t, { id: uid(), createdAt: Date.now() + i })));
  notify();
}
export async function claim(view, stage, together) {
  if (M.logs.has(stage.id)) throw { code: "already-exists" };
  award(stage.id, Object.assign({ uid: ME, day: dayKey(), at: Date.now() }, together ? { together: true } : {})); sync();
}
export async function unclaim(id) {
  const l = M.logs.get(id); if (!l) return;
  M.logs.delete(id);
  if (!l.together) M.pair.balances[l.uid] -= l.stars;
  M.pair.pot -= l.stars; M.pair.xp -= l.stars; sync();
}
