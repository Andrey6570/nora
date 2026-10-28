// The pet as the screens need it: mood from recent activity, what it says, what it looks like. Pure functions.
import { prevDay, stageOf, flameNow, traitOf, MILESTONES, DECOR } from "../functions/pet.js";
import { PHRASES } from "./petdata.js";

// the last `n` days ending today
export function lastDays(today, n) { const out = [today]; while (out.length < n) out.push(prevDay(out[out.length - 1])); return out; }

// Three meters 0..100 from the last days: comfort (chores), care (warm words), closeness (together, games, coupons).
export function meters(S, today) {
  const d3 = new Set(lastDays(today, 3)), d7 = new Set(lastDays(today, 7)), d2 = new Set(lastDays(today, 2));
  const logs = (S.logList || []).filter(l => l.stars > 0);
  const day = at => { const d = new Date(at || 0); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const signals = S.signals || [], results = [...(S.results ? S.results.values() : [])], coupons = S.coupons || [];
  const marks3 = logs.filter(l => d3.has(l.day)).length;
  const signals3 = signals.filter(s => d3.has(s.day)).length;
  const together7 = logs.filter(l => l.together && d7.has(l.day)).length;
  const reveals7 = results.filter(r => r.at && d7.has(day(r.at))).length;
  const coupons7 = coupons.filter(c => c.at && d7.has(day(c.at))).length;
  const comfort = Math.min(100, marks3 * 12), care = Math.min(100, signals3 * 20), close = Math.min(100, together7 * 25 + reveals7 * 20 + coupons7 * 15);
  const recent = logs.some(l => d2.has(l.day)) || signals.some(s => d2.has(s.day));
  return { comfort, care, close, avg: (comfort + care + close) / 3, recent };
}
export const moodOf = m => (!m.recent ? "sleepy" : m.avg >= 60 ? "happy" : m.avg >= 30 ? "calm" : "calm");
export const MOOD_ICON = { happy: "✨", calm: "", sleepy: "💤" };

// Which situations apply now, most important first.
export function situations(S, me, today, m, opts = {}) {
  const p = S.pair, xp = p.xp || 0, out = [];
  const todayLogs = (S.logList || []).filter(l => l.day === today && l.stars > 0);
  const partnerToday = todayLogs.filter(l => l.uid !== me && !l.together).length;
  if (opts.grew) out.push("grew");
  if (xp < 20) out.push("hello");
  if (m.recent && m.comfort < 30) out.push("comfortLow");
  if (m.recent && m.care < 30) out.push("careLow");
  if (m.recent && m.close < 30) out.push("closeLow");
  if (todayLogs.some(l => /_(notice|plan)_/.test(l.id))) out.push("invisible");
  if (todayLogs.some(l => l.together)) out.push("together");
  const fl = flameNow(p.flame, today);
  if (fl.alive && fl.n >= 3) out.push("flame");
  if (partnerToday > 0) out.push("partnerBusy");
  out.push(moodOf(m));
  return out;
}

// One phrase: steady during the day, another after each pat.
export function phraseFor(S, me, today, m, vars, opts = {}) {
  const sits = situations(S, me, today, m, opts).slice(0, 3);
  const pool = sits.flatMap(s => PHRASES[s].map(ph => ({ s, ph })));
  const seed = Number(today.replace(/-/g, "")) % pool.length;
  const pick = pool[(seed + (opts.pats || 0)) % pool.length];
  return { situation: pick.s, text: pick.ph, vars: Object.assign({ n: 0 }, vars) };
}

export function petView(S, me, today, opts = {}) {
  const p = S.pair, st = stageOf(p.xp), m = meters(S, today), fl = flameNow(p.flame, today);
  return { stage: st, meters: m, mood: moodOf(m), flame: fl, trait: st.index >= 1 ? traitOf(p.stats) : null,
    milestones: MILESTONES.map(x => ({ id: x.id, icon: x.icon, got: x.test(p) })), owned: Object.keys(p.decor || {}).filter(k => DECOR[k]) };
}
