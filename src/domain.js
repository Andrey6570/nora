// What the screens show, derived from the pair, its tasks and its marks. No Firebase here.
import { LIMITS } from "../functions/signals.js";
import { STAGES, stageStars, togetherStars, periodKey, logId, parseLogId, dayKey } from "../functions/economy.js";

export { STAGES, dayKey };
export const MINUTES = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180];
export const DIFFS = [[1, "Легко"], [2, "Средне"], [3, "Тяжело"]];
export const REPEAT_LABELS = [["once", "Разово"], ["daily", "Каждый день"], ["weekly", "Каждую неделю"]];
export const STAGE_LABELS = { notice: "Заметить", plan: "Спланировать", do: "Сделать" };
export const STAGE_ICONS = { notice: "👀", plan: "🗓", do: "✅" };

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function newInviteCode(rand = Math.random) {
  let s = ""; for (let i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(rand() * CODE_CHARS.length)];
  return s;
}
export const normCode = s => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// Ready-made sets. Titles are Russian keys, translated on screen and when added.
export const PACKS = [
  { id: "kitchen", title: "Кухня", icon: "🍳", tasks: [
    ["Помыть посуду", 15, 1, "daily", false], ["Приготовить ужин", 45, 2, "daily", false], ["Вынести мусор", 5, 1, "daily", false],
    ["Разобрать холодильник", 20, 2, "weekly", false], ["Спланировать меню на неделю", 20, 2, "weekly", true]] },
  { id: "cleaning", title: "Уборка", icon: "🧹", tasks: [
    ["Пропылесосить", 20, 2, "weekly", false], ["Помыть полы", 30, 2, "weekly", false], ["Убрать ванную", 30, 3, "weekly", false],
    ["Постирать и развесить бельё", 20, 1, "weekly", false], ["Сменить постельное бельё", 15, 1, "weekly", false]] },
  { id: "shopping", title: "Покупки", icon: "🛒", tasks: [
    ["Закупка продуктов на неделю", 60, 2, "weekly", true], ["Купить бытовую химию", 30, 1, "once", true], ["Заказать воду", 5, 1, "weekly", false]] },
  { id: "money", title: "Финансы", icon: "💳", tasks: [
    ["Оплатить коммунальные счета", 15, 2, "once", true], ["Свести семейный бюджет за месяц", 45, 3, "once", true], ["Продлить страховку", 30, 2, "once", true]] },
  { id: "home", title: "Дом и здоровье", icon: "🏠", tasks: [
    ["Записаться к врачу", 15, 2, "once", true], ["Вызвать мастера", 20, 2, "once", true], ["Полить цветы", 5, 1, "weekly", false],
    ["Купить подарок на день рождения", 45, 2, "once", true]] }
];
export const packTask = ([title, minutes, difficulty, repeat, full]) => ({ title, minutes, difficulty, repeat, full });

// The state of one task today: which stages are claimed, by whom, and for how many stars.
export function taskView(task, logs, scale, today) {
  const period = periodKey(task, today);
  const stages = (task.full ? STAGES : ["do"]).map(stage => {
    const mark = logs.get(logId(task.id, stage, period)) || null;
    return { stage, stars: stageStars(task, stage, scale), together: stage === "do" ? togetherStars(task, scale) : 0, id: logId(task.id, stage, period), mark };
  });
  const done = !!(stages.find(s => s.stage === "do") || {}).mark;
  return { task, period, stages, done };
}

// Groups for the task list. A one-off task disappears once done, except on the day it was done.
export function taskGroups(tasks, logs, scale, today) {
  const g = { daily: [], weekly: [], once: [], doneOnce: [] };
  for (const task of tasks) {
    const v = taskView(task, logs, scale, today);
    const r = task.repeat || "once";
    if (r === "once") {
      if (!v.done) g.once.push(v);
      else if (v.stages.find(s => s.stage === "do").mark.day === today) g.doneOnce.push(v);
    } else g[r].push(v);
  }
  const order = (a, b) => (a.done - b.done) || ((a.task.createdAt || 0) - (b.task.createdAt || 0));
  Object.values(g).forEach(list => list.sort(order));
  return g;
}

// Last 7 days (today included): stars per partner and per stage. It shows who notices and plans, not only who does.
// Chores done together belong to both, so they are counted for the pair as a whole.
export function weekStats(logList, members, today) {
  const days = new Set();
  const [y, m, d] = today.split("-").map(Number);
  for (let i = 0; i < 7; i++) days.add(dayKey(new Date(y, m - 1, d - i)));
  const by = Object.fromEntries(members.map(u => [u, { notice: 0, plan: 0, do: 0, total: 0 }]));
  let together = 0;
  for (const l of logList) {
    const p = parseLogId(l.id);
    if (!p || !days.has(l.day) || !l.stars) continue;
    if (l.together) { together += l.stars; continue; }
    if (!by[l.uid]) continue;
    by[l.uid][p.stage] += l.stars; by[l.uid].total += l.stars;
  }
  return { by, together };
}

// Logs that matter for the screens: recent ones and every mark of a one-off task (those never repeat).
export function logCutoff(today) {
  const [y, m, d] = today.split("-").map(Number);
  return dayKey(new Date(y, m - 1, d - 8));
}

// ---- reactions and warm signals ----
// How many signals of a kind this partner can still send today (the server counts them in pair.sigDay).
export function signalsLeft(pair, uid, today, kind) {
  const used = pair && pair.sigDay && pair.sigDay[uid];
  return Math.max(0, LIMITS[kind] - (used && used.day === today ? used[kind] || 0 : 0));
}

// Reactions under each mark: Map markId -> [reaction key, ...]
export function reactionsByRef(signals) {
  const m = new Map();
  for (const s of signals) if (s.kind === "reaction" && s.ref) (m.get(s.ref) || m.set(s.ref, []).get(s.ref)).push(s.key);
  return m;
}

// Signals from the partner that arrived after the moment the Warmth tab was last opened.
export function unseenSignals(signals, uid, seenAt) {
  return signals.filter(s => s.from !== uid && s.kind === "message" && (s.at || 0) > seenAt).length;
}

// ---- the shop ----
export const SCOPES = [["personal", "Из моих звёзд"], ["joint", "Из копилки, вдвоём"]];
// Ready-made rewards: [title, cost in stars, scope]. Costs follow the default 1 star = 10 minutes.
export const REWARD_PACKS = [
  { id: "personal", title: "Для себя", icon: "🧘", rewards: [
    ["Два часа свободного времени", 15, "personal"], ["Сплю до 10 утра", 10, "personal"], ["Вечер с друзьями", 25, "personal"],
    ["Я выбираю фильм", 5, "personal"], ["Дело на выбор делает партнёр", 12, "personal"], ["Завтрак в постель", 15, "personal"]] },
  { id: "joint", title: "Для двоих", icon: "💞", rewards: [
    ["Ужин вдвоём вне дома", 40, "joint"], ["Кино вдвоём", 20, "joint"], ["Выходной без домашних дел", 60, "joint"],
    ["Спа или массаж на двоих", 50, "joint"], ["Пикник", 25, "joint"], ["Вечер настольных игр", 10, "joint"]] }
];
export const rewardRow = ([title, cost, scope]) => ({ title, cost, scope });

// What the shop shows: waiting proposals, the catalogue, unused purchases.
export function shopView(pair, me, rewards, orders) {
  const bal = (pair.balances && pair.balances[me]) || 0, pot = pair.pot || 0;
  const proposals = orders.filter(o => o.status === "proposed" || (!o.status && o.joint !== false)).sort((a, b) => (b.at || 0) - (a.at || 0));
  const bought = orders.filter(o => o.status === "bought").sort((a, b) => (b.at || 0) - (a.at || 0));
  const canBuy = r => r.scope === "joint" ? pot >= r.cost : bal >= r.cost;
  const byTitle = (a, b) => a.cost - b.cost || a.title.localeCompare(b.title);
  return {
    proposals, bought, unused: bought.filter(o => o.kind === "reward" && !o.used), canBuy,
    personal: rewards.filter(r => r.scope === "personal").sort(byTitle), joint: rewards.filter(r => r.scope === "joint").sort(byTitle)
  };
}
