// In-memory store with the same surface as store.js. Opens with ?demo in a browser: lets you look at every
// screen before Firebase is set up, and drives the layout smoke test. It awards stars the way the server does.
import { stageStars, togetherStars, parseLogId, DEFAULT_SCALE } from "../functions/economy.js";
import { newInviteCode, dayKey, uid } from "./domain.js";
import { isKnown, LIMITS } from "../functions/signals.js";
import { wishLevel } from "../functions/gamedata.js";
import { GAMES } from "../functions/games.js";
import { DECOR } from "../functions/pet.js";

export const M = { ready: false, user: null, profile: null, pair: null, tasks: [], logs: new Map(), logList: [], signals: [], rewards: [], orders: [], answers: new Map(), results: new Map(), coupons: [], progress: null, error: "", demo: true };
let notify = () => {};
const ME = "me", PARTNER = "partner";
const sync = () => { M.logList = [...M.logs.values()]; notify(); };

const PARTNER_ANSWERS = { guess: {}, wishes: {} };
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
  M.pair.sigDay = { [ME]: { day: today, message: 1, reaction: 0 } };
  M.pair.games = { wishes: true, coupons: true, dreams: true, intimacy30: true };
  M.pair.pet = { kind: "fox", name: "Рыжик" }; M.pair.xp = 340;
  M.pair.flame = { n: 5, last: dayKey(y), freezes: 1 }; M.pair.decor = { lamp: true, plant: true, rug: true };
  M.pair.stats = { chores: 12, together: 3, signals: 8, reveals: 2, matches: 1, bought: 2 };
  M.coupons = [{ id: "c1", from: PARTNER, title: "Массаж на 20 минут", at: now - 7200e3 }, { id: "c2", from: ME, title: "Завтрак в постель", at: now - 86400e3 }];
  // the partner has already answered some items, so revealing can be tried
  PARTNER_ANSWERS.guess = { 0: { v: 0, g: 1 }, 1: { v: 2, g: 0 }, 2: { v: 1, g: 1 } };
  PARTNER_ANSWERS.wishes = { 0: "yes", 1: "maybe", 2: "no", 3: "yes", 4: "maybe", 5: "yes" };
  M.results.set("guess_0", { id: "guess_0", game: "guess", item: "0", answers: { [ME]: { v: 1, g: 0 }, [PARTNER]: { v: 0, g: 1 } } });
  M.answers.set("guess_0_" + ME, { id: "guess_0_" + ME, uid: ME, game: "guess", item: "0", v: 1, g: 0 });
  M.answers.set("guess_1_" + ME, { id: "guess_1_" + ME, uid: ME, game: "guess", item: "1", v: 1, g: 2 });
  M.rewards = [
    { id: "r1", title: "Сплю до 10 утра", cost: 10, scope: "personal" }, { id: "r2", title: "Я выбираю фильм", cost: 5, scope: "personal" },
    { id: "r3", title: "Ужин вдвоём вне дома", cost: 40, scope: "joint" }, { id: "r4", title: "Кино вдвоём", cost: 20, scope: "joint" }
  ];
  M.orders = [
    { id: "o1", uid: PARTNER, kind: "reward", ref: "r4", status: "proposed", cost: 20, title: "Кино вдвоём", joint: true, at: now - 1800e3 },
    { id: "o4", uid: PARTNER, kind: "decor", ref: "sofa", status: "proposed", cost: 20, title: "sofa", joint: true, at: now - 600e3 },
    { id: "o3", uid: PARTNER, kind: "game", ref: "flirt", status: "proposed", cost: 20, title: "flirt", joint: true, at: now - 900e3 },
    { id: "o2", uid: ME, kind: "reward", ref: "r2", status: "bought", cost: 5, title: "Я выбираю фильм", joint: false, at: now - 86400e3 }
  ];
  M.signals = [
    { id: "s1", from: PARTNER, kind: "message", key: "thanks_dinner", day: today, at: now - 3600e3 },
    { id: "s2", from: PARTNER, kind: "reaction", key: "heart", ref: "t2_do_" + dayKey(y), day: today, at: now - 3000e3 },
    { id: "s3", from: ME, kind: "message", key: "proud", day: today, at: now - 7200e3 }
  ];
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
export async function savePet(pet) { M.pair.pet = pet; notify(); }
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
// Same checks as the server: known signal, daily limit.
export async function sendSignal(kind, key, ref) {
  if (!isKnown(kind, key)) return;
  const today = dayKey(), used = M.pair.sigDay && M.pair.sigDay[ME];
  const n = used && used.day === today ? used[kind] || 0 : 0;
  if (n >= LIMITS[kind]) throw { code: "limit" };
  M.pair.sigDay = Object.assign({}, M.pair.sigDay, { [ME]: Object.assign({ day: today, message: 0, reaction: 0 }, used && used.day === today ? used : {}, { [kind]: n + 1 }) });
  M.signals = [{ id: uid(), from: ME, kind, key, day: today, at: Date.now(), ...(ref ? { ref } : {}) }, ...M.signals];
  notify();
}
// The shop, with the server's rules: personal at once from one's balance, joint proposed and spent on agreement.
export async function saveReward(r) {
  const f = { title: r.title.trim(), cost: r.cost, scope: r.scope };
  if (r.id) Object.assign(M.rewards.find(x => x.id === r.id), f); else M.rewards.push(Object.assign(f, { id: uid() }));
  notify();
}
export async function deleteReward(id) { M.rewards = M.rewards.filter(r => r.id !== id); notify(); }
export async function addRewards(list) { list.forEach(r => M.rewards.push({ id: uid(), title: r.title, cost: r.cost, scope: r.scope })); notify(); }
export async function placeOrder(kind, ref) {
  if (kind === "game" || kind === "decor") {
    const cost = kind === "game" ? GAMES[ref].cost : DECOR[ref].cost;
    if ((M.pair.pot || 0) < cost) throw { code: "not-enough" };
    M.orders.push({ id: uid(), uid: ME, kind, ref, at: Date.now(), cost, title: ref, status: "proposed", joint: true }); notify(); return;
  }
  const r = M.rewards.find(x => x.id === ref); if (!r) return;
  const o = { id: uid(), uid: ME, kind, ref, at: Date.now(), cost: r.cost, title: r.title };
  if (r.scope === "joint") {
    if ((M.pair.pot || 0) < r.cost) throw { code: "not-enough" };
    M.orders.push(Object.assign(o, { status: "proposed", joint: true }));
  } else {
    if ((M.pair.balances[ME] || 0) < r.cost) throw { code: "not-enough" };
    M.pair.balances[ME] -= r.cost; M.orders.push(Object.assign(o, { status: "bought", joint: false }));
  }
  notify();
}
export async function approveOrder(id) {
  const o = M.orders.find(x => x.id === id); if (!o || o.uid === ME) return;
  if ((M.pair.pot || 0) < o.cost) { M.orders = M.orders.filter(x => x.id !== id); notify(); throw { code: "not-enough" }; }
  M.pair.pot -= o.cost; o.status = "bought";
  if (o.kind === "game") M.pair.games = Object.assign({}, M.pair.games, { [o.ref]: true });
  if (o.kind === "decor") M.pair.decor = Object.assign({}, M.pair.decor, { [o.ref]: true });
  notify();
}
export async function cancelOrder(id) { M.orders = M.orders.filter(o => o.id !== id); notify(); }
export async function markUsed(id) { const o = M.orders.find(x => x.id === id); if (o) o.used = true; notify(); }
// Games: the same reveal rules as the server (guess shows both, wishes only a match).
export async function sendAnswer(game, item, values) {
  const id = `${game}_${item}_${ME}`;
  M.answers.set(id, Object.assign({ id, uid: ME, game, item: String(item) }, values));
  const other = PARTNER_ANSWERS[game] && PARTNER_ANSWERS[game][item];
  if (other !== undefined) {
    if (game === "guess") M.results.set(`guess_${item}`, { id: `guess_${item}`, game, item: String(item), answers: { [ME]: { v: values.v, g: values.g }, [PARTNER]: other } });
    else { const level = wishLevel(values.v, other); if (level) M.results.set(`wishes_${item}`, { id: `wishes_${item}`, game, item: String(item), level }); }
  }
  notify();
}
export async function addCoupon(title) { M.coupons.unshift({ id: uid(), from: ME, title: title.trim(), at: Date.now() }); notify(); }
export async function useCoupon(id) { const c = M.coupons.find(x => x.id === id); if (c) c.used = true; notify(); }
export async function deleteCoupon(id) { M.coupons = M.coupons.filter(c => c.id !== id); notify(); }
export async function saveProgress(p) { M.progress = { start: p.start, done: p.done }; notify(); }
export async function registerDevice() { return false; }
export async function setDeviceLang() {}
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
