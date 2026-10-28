// Star economy shared by the app (to show prices) and the server (the only place that awards stars).
// Plain functions without imports, so the app can import this file directly.

export const STAGES = ["notice", "plan", "do"];
export const DIFF_MULT = { 1: 1, 2: 1.5, 3: 2 };
export const DEFAULT_SCALE = 10; // minutes of work per star
export const REPEATS = ["once", "daily", "weekly"];

// Stars for the "do" stage: time over scale, weighted by difficulty, at least 1.
export function baseStars(task, scale = DEFAULT_SCALE) {
  const min = Math.max(1, Math.min(480, Number(task && task.minutes) || 0));
  const mult = DIFF_MULT[task && task.difficulty] || 1;
  return Math.max(1, Math.round((min / (Number(scale) || DEFAULT_SCALE)) * mult));
}

// Noticing is always 1 star, planning half of the work, doing the full work.
export function stageStars(task, stage, scale) {
  if (!STAGES.includes(stage)) return 0;
  if (stage !== "do" && !(task && task.full)) return 0;
  const b = baseStars(task, scale);
  if (stage === "notice") return 1;
  if (stage === "plan") return Math.max(1, Math.round(b / 2));
  return b;
}

// Local calendar day "YYYY-MM-DD".
export function dayKey(d = new Date()) {
  const p = n => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}

// ISO week "YYYY-Www" of a day key.
export function weekKey(day) {
  const [y, m, dd] = day.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, dd));
  const wd = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - wd);
  const y0 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const w = Math.ceil(((d - y0) / 86400000 + 1) / 7);
  return d.getUTCFullYear() + "-W" + String(w).padStart(2, "0");
}

// The period a stage belongs to: a repeating task can be done again in the next day or week.
export function periodKey(task, day) {
  if (task && task.repeat === "daily") return day;
  if (task && task.repeat === "weekly") return weekKey(day);
  return "once";
}

// Log document id. It makes every stage of every period claimable exactly once, by either partner.
export function logId(taskId, stage, period) { return taskId + "_" + stage + "_" + period; }

export function parseLogId(id) {
  const m = /^(.+)_(notice|plan|do)_(once|\d{4}-\d{2}-\d{2}|\d{4}-W\d{2})$/.exec(String(id));
  return m ? { taskId: m[1], stage: m[2], period: m[3] } : null;
}
