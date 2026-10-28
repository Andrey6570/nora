import test from "node:test";
import assert from "node:assert/strict";
import { ruStrings } from "../tools/ru-strings.mjs";
import { EN } from "../src/i18n-en.js";
import { EL } from "../src/i18n-el.js";
import { taskView, taskGroups, weekStats, newInviteCode, normCode, logCutoff, PACKS } from "../src/domain.js";

test("every Russian string has English and Greek", () => {
  const keys = ruStrings();
  assert.deepEqual(keys.filter(k => !EN[k]), [], "missing in English");
  assert.deepEqual(keys.filter(k => !EL[k]), [], "missing in Greek");
});

test("translations keep the placeholders", () => {
  for (const [k, v] of [...Object.entries(EN), ...Object.entries(EL)]) {
    const ph = s => (s.match(/\{\w+\}/g) || []).sort().join();
    assert.equal(ph(v), ph(k), k);
  }
});

test("no translation is left that the code no longer uses", () => {
  const keys = new Set(ruStrings());
  assert.deepEqual(Object.keys(EN).filter(k => !keys.has(k)), []);
  assert.deepEqual(Object.keys(EL).filter(k => !keys.has(k)), []);
});

const today = "2026-10-28";
const logs = list => new Map(list.map(l => [l.id, l]));

test("a task shows which stages are claimed in the current period", () => {
  const task = { id: "t", minutes: 30, difficulty: 1, repeat: "daily", full: true };
  const v = taskView(task, logs([{ id: "t_notice_2026-10-28", uid: "a", stars: 1 }, { id: "t_do_2026-10-27", uid: "b", stars: 3 }]), 10, today);
  assert.deepEqual(v.stages.map(s => [s.stage, s.stars, !!s.mark]), [["notice", 1, true], ["plan", 2, false], ["do", 3, false]]);
  assert.equal(v.done, false);
  assert.deepEqual(taskView({ ...task, full: false }, new Map(), 10, today).stages.map(s => s.stage), ["do"]);
});

test("a one-off task disappears once done, except on that day", () => {
  const tasks = [{ id: "a", repeat: "once", minutes: 10, difficulty: 1 }, { id: "b", repeat: "once", minutes: 10, difficulty: 1 },
    { id: "c", repeat: "once", minutes: 10, difficulty: 1 }, { id: "d", repeat: "weekly", minutes: 10, difficulty: 1 }];
  const g = taskGroups(tasks, logs([{ id: "a_do_once", uid: "x", day: today }, { id: "b_do_once", uid: "x", day: "2026-10-20" }]), 10, today);
  assert.deepEqual([g.once.map(v => v.task.id), g.doneOnce.map(v => v.task.id), g.weekly.map(v => v.task.id)], [["c"], ["a"], ["d"]]);
});

test("week stats split stars by stage and ignore old or pending marks", () => {
  const list = [
    { id: "t_notice_once", uid: "a", day: today, stars: 1 }, { id: "t_plan_once", uid: "a", day: "2026-10-22", stars: 2 },
    { id: "u_do_2026-10-28", uid: "b", day: today, stars: 3 }, { id: "u_do_2026-10-21", uid: "b", day: "2026-10-21", stars: 3 },
    { id: "v_do_once", uid: "b", day: today }
  ];
  assert.deepEqual(weekStats(list, ["a", "b"], today), { a: { notice: 1, plan: 2, do: 0, total: 3 }, b: { notice: 0, plan: 0, do: 3, total: 3 } });
});

test("invite codes and helpers", () => {
  assert.match(newInviteCode(), /^[A-HJ-NP-Z2-9]{6}$/);
  assert.equal(normCode(" k7m-2qx "), "K7M2QX");
  assert.equal(logCutoff("2026-03-02"), "2026-02-22");
  for (const p of PACKS) for (const r of p.tasks) assert.ok(["once", "daily", "weekly"].includes(r[3]), r[0]);
});
