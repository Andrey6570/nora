// What the screens show, derived from the pair, its tasks and its marks. No Firebase here.
import { STAGES, stageStars, periodKey, logId, parseLogId, dayKey } from "../functions/economy.js";

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
    return { stage, stars: stageStars(task, stage, scale), id: logId(task.id, stage, period), mark };
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
export function weekStats(logList, members, today) {
  const days = new Set();
  const [y, m, d] = today.split("-").map(Number);
  for (let i = 0; i < 7; i++) days.add(dayKey(new Date(y, m - 1, d - i)));
  const by = Object.fromEntries(members.map(u => [u, { notice: 0, plan: 0, do: 0, total: 0 }]));
  for (const l of logList) {
    const p = parseLogId(l.id);
    if (!p || !days.has(l.day) || !by[l.uid] || !l.stars) continue;
    by[l.uid][p.stage] += l.stars; by[l.uid].total += l.stars;
  }
  return by;
}

// Logs that matter for the screens: recent ones and every mark of a one-off task (those never repeat).
export function logCutoff(today) {
  const [y, m, d] = today.split("-").map(Number);
  return dayKey(new Date(y, m - 1, d - 8));
}
