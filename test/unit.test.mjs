import test from "node:test";
import assert from "node:assert/strict";
import { ruStrings } from "../tools/ru-strings.mjs";
import { EN } from "../src/i18n-en.js";
import { EL } from "../src/i18n-el.js";
import { meters, moodOf, situations, phraseFor, lastDays, petView } from "../src/pet.js";
import { PHRASES, STAGE_NAMES, DEFAULT_NAMES, KIND_NAMES, TRAIT_TEXT, MILESTONE_TEXT } from "../src/petdata.js";
import { PET_KINDS, STAGES, TRAITS, MILESTONES } from "../functions/pet.js";
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
  assert.deepEqual(v.stages.map(s => s.together), [0, 0, 6]);
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
    { id: "v_do_once", uid: "b", day: today }, { id: "w_do_once", uid: "a", day: today, stars: 8, together: true }
  ];
  assert.deepEqual(weekStats(list, ["a", "b"], today), { by: { a: { notice: 1, plan: 2, do: 0, total: 3 }, b: { notice: 0, plan: 0, do: 3, total: 3 } }, together: 8 });
});

test("invite codes and helpers", () => {
  assert.match(newInviteCode(), /^[A-HJ-NP-Z2-9]{6}$/);
  assert.equal(normCode(" k7m-2qx "), "K7M2QX");
  assert.equal(logCutoff("2026-03-02"), "2026-02-22");
  for (const p of PACKS) for (const r of p.tasks) assert.ok(["once", "daily", "weekly"].includes(r[3]), r[0]);
});

// ---- the pet ----
const ph = x => (x.match(/\{\w+\}/g) || []).sort().join();
test("pet texts: three languages, same placeholders, nothing missing", () => {
  const all = [...Object.values(PHRASES).flat(), ...Object.values(STAGE_NAMES), ...Object.values(DEFAULT_NAMES), ...Object.values(KIND_NAMES), ...Object.values(TRAIT_TEXT), ...Object.values(MILESTONE_TEXT)];
  for (const tr of all) { assert.equal(tr.length, 3); assert.ok(tr.every(x => x.length > 2), tr[0]); assert.equal(ph(tr[1]), ph(tr[0]), tr[0]); assert.equal(ph(tr[2]), ph(tr[0]), tr[0]); }
  assert.deepEqual(Object.keys(STAGE_NAMES), STAGES.map(x => x.id));
  assert.deepEqual(Object.keys(DEFAULT_NAMES).sort(), Object.keys(PET_KINDS).sort());
  assert.deepEqual(Object.keys(KIND_NAMES).sort(), Object.keys(PET_KINDS).sort());
  assert.deepEqual(Object.keys(TRAIT_TEXT).sort(), [...TRAITS].sort());
  assert.deepEqual(MILESTONES.map(m => m.id).sort(), Object.keys(MILESTONE_TEXT).sort());
  for (const k of ["grew", "hello", "happy", "calm", "sleepy", "comfortLow", "careLow", "closeLow", "partnerBusy", "flame", "invisible", "together"]) assert.ok(PHRASES[k].length >= 2, k);
});

const T = "2026-10-28";
const S0 = (over = {}) => ({ pair: { members: ["a", "b"], xp: 100, ...over.pair }, logList: [], signals: [], results: new Map(), coupons: [], ...over });
test("meters rise with recent chores, warm words and joint activity", () => {
  assert.deepEqual(lastDays(T, 3), [T, "2026-10-27", "2026-10-26"]);
  const quiet = meters(S0(), T);
  assert.deepEqual([quiet.comfort, quiet.care, quiet.close, quiet.recent], [0, 0, 0, false]);
  const busy = meters(S0({
    logList: [1, 2, 3, 4].map(i => ({ id: "t_do_" + i, uid: "a", day: T, stars: 2 })).concat([{ id: "u_do_once", uid: "a", day: "2026-10-26", stars: 4, together: true }]),
    signals: [{ day: T }, { day: T }], coupons: [{ at: Date.now() }]
  }), T);
  assert.deepEqual([busy.comfort, busy.care, busy.close, busy.recent], [60, 40, 40, true]);
  assert.equal(meters(S0({ logList: [{ id: "x", day: "2026-10-01", stars: 5 }] }), T).comfort, 0);
  assert.equal(moodOf({ recent: false, avg: 90 }), "sleepy");
  assert.equal(moodOf({ recent: true, avg: 70 }), "happy");
  assert.equal(moodOf({ recent: true, avg: 10 }), "calm");
});

test("the pet says something fitting and the same thing all day until patted", () => {
  const log = (id, uid, extra) => ({ id, uid, day: T, stars: 2, ...extra });
  const S = S0({ logList: [log("t_notice_2026-10-28", "b"), log("t_do_2026-10-28", "b"), log("u_do_once", "a", { together: true })], pair: { xp: 400, flame: { n: 5, last: T, freezes: 0 } } });
  const m = meters(S, T);
  const sits = situations(S, "a", T, m);
  assert.ok(["invisible", "together", "flame", "partnerBusy"].every(x => sits.includes(x)), sits.join());
  assert.equal(sits[sits.length - 1], moodOf(m));
  assert.deepEqual(situations(S0({ pair: { xp: 5 } }), "a", T, meters(S0(), T)).slice(0, 1), ["hello"]);
  assert.equal(situations(S0(), "a", T, meters(S0(), T), { grew: true })[0], "grew");
  const a = phraseFor(S, "a", T, m, {}), b = phraseFor(S, "a", T, m, {});
  assert.deepEqual(a.text, b.text);
  const seen = new Set([0, 1, 2, 3, 4, 5, 6].map(pats => phraseFor(S, "a", T, m, {}, { pats }).text[1]));
  assert.ok(seen.size >= 5);
});

test("the pet view: stage, flame, character and album together", () => {
  const S = S0({ pair: { xp: 520, flame: { n: 8, last: T, freezes: 1 }, stats: { chores: 20, together: 1, signals: 2 }, decor: { lamp: true, ghost: true } } });
  const v = petView(S, "a", T);
  assert.deepEqual([v.stage.stage.id, v.flame.n, v.trait, v.owned], ["teen", 8, "homebody", ["lamp"]]);
  assert.equal(petView(S0({ pair: { xp: 50, stats: { chores: 20 } } }), "a", T).trait, null);
  assert.ok(v.milestones.filter(m => m.got).length >= 4);
});
