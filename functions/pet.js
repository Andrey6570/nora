// The pair's pet, "the keeper of the burrow": growth, the flame of the pair, character, album milestones and burrow decor.
// Pure functions without imports, shared by the app (to show) and the server (the flame and counters live on the pair).

export const PET_KINDS = { fox: "🦊", cat: "🐱", hedgehog: "🦔", panda: "🐼", raccoon: "🦝" };
export const PET_NAME_MAX = 20;

// Experience (pair.xp, one per star earned together) needed for each stage.
export const STAGES = [
  { id: "baby", xp: 0, size: 64 }, { id: "teen", xp: 300, size: 80 }, { id: "adult", xp: 1500, size: 96 }, { id: "wise", xp: 5000, size: 108 }
];
export function stageOf(xp) {
  const x = Math.max(0, Number(xp) || 0);
  let i = 0; STAGES.forEach((s, k) => { if (x >= s.xp) i = k; });
  const next = STAGES[i + 1] || null;
  return { index: i, stage: STAGES[i], next, progress: next ? (x - STAGES[i].xp) / (next.xp - STAGES[i].xp) : 1, toNext: next ? next.xp - x : 0 };
}

// ---- the flame: days in a row when both partners did something ----
export function prevDay(day) {
  const [y, m, d] = day.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d - 1));
  return t.getUTCFullYear() + "-" + String(t.getUTCMonth() + 1).padStart(2, "0") + "-" + String(t.getUTCDate()).padStart(2, "0");
}

// The fields to write when `uids` were active on `day`: who was active, and the flame if both were.
// A freeze (earned every 7 days, at most 2) saves the flame when exactly one day was missed.
export function flamePatch(pair, uids, day) {
  const active = Object.assign({}, pair.active || {});
  const patch = {};
  uids.forEach(u => { active[u] = day; patch[`active.${u}`] = day; });
  const members = pair.members || [], fl = pair.flame || { n: 0, last: "", freezes: 0 };
  if (members.length !== 2 || !members.every(u => active[u] === day) || fl.last === day || (fl.last && day < fl.last)) return patch;
  let n, freezes = fl.freezes || 0;
  if (!fl.last || fl.last === prevDay(day)) n = (fl.n || 0) + 1;
  else if (fl.last === prevDay(prevDay(day)) && freezes > 0) { n = (fl.n || 0) + 1; freezes -= 1; }
  else n = 1;
  if (n % 7 === 0) freezes = Math.min(2, freezes + 1);
  patch.flame = { n, last: day, freezes };
  return patch;
}

// The flame as the pair sees it today: still burning if both were active today or yesterday (or a freeze can cover a gap).
export function flameNow(flame, today) {
  if (!flame || !flame.last) return { n: 0, alive: false, today: false, freezes: 0 };
  const y = prevDay(today);
  const alive = flame.last === today || flame.last === y || (flame.last === prevDay(y) && (flame.freezes || 0) > 0);
  return { n: alive ? flame.n : 0, alive, today: flame.last === today, freezes: flame.freezes || 0 };
}

// ---- character: what the pair does most (shown from the teen stage) ----
export const TRAITS = ["homebody", "romantic", "chatty"];
export function traitOf(stats) {
  const s = stats || {};
  const score = { homebody: (s.chores || 0), romantic: (s.together || 0) * 3 + (s.reveals || 0) * 2 + (s.matches || 0) * 3, chatty: (s.signals || 0) };
  const best = TRAITS.reduce((a, b) => (score[b] > score[a] ? b : a), TRAITS[0]);
  return score[best] >= 5 ? best : null;
}

// ---- album: milestones, true or false from the pair's counters ----
export const MILESTONES = [
  { id: "xp100", icon: "⭐", test: p => (p.xp || 0) >= 100 }, { id: "xp500", icon: "🌟", test: p => (p.xp || 0) >= 500 },
  { id: "xp1000", icon: "💫", test: p => (p.xp || 0) >= 1000 }, { id: "teen", icon: "🐾", test: p => (p.xp || 0) >= STAGES[1].xp },
  { id: "adult", icon: "🏡", test: p => (p.xp || 0) >= STAGES[2].xp }, { id: "wise", icon: "🔮", test: p => (p.xp || 0) >= STAGES[3].xp },
  { id: "flame7", icon: "🔥", test: p => ((p.flame && p.flame.n) || 0) >= 7 }, { id: "flame30", icon: "🌋", test: p => ((p.flame && p.flame.n) || 0) >= 30 },
  { id: "together1", icon: "👫", test: p => ((p.stats && p.stats.together) || 0) >= 1 }, { id: "together10", icon: "💞", test: p => ((p.stats && p.stats.together) || 0) >= 10 },
  { id: "signals1", icon: "💌", test: p => ((p.stats && p.stats.signals) || 0) >= 1 }, { id: "signals50", icon: "🥰", test: p => ((p.stats && p.stats.signals) || 0) >= 50 },
  { id: "reveals1", icon: "🎲", test: p => ((p.stats && p.stats.reveals) || 0) >= 1 }, { id: "matches1", icon: "🗝", test: p => ((p.stats && p.stats.matches) || 0) >= 1 },
  { id: "bought1", icon: "🎁", test: p => ((p.stats && p.stats.bought) || 0) >= 1 }, { id: "decor5", icon: "🛋", test: p => Object.keys(p.decor || {}).length >= 5 }
];

// ---- burrow decor, bought with the pot together ----
export const DECOR = {
  flowers: { icon: "🌷", cost: 6 }, candles: { icon: "🕯", cost: 6 }, lamp: { icon: "💡", cost: 8 }, toy: { icon: "🧸", cost: 8 },
  plant: { icon: "🪴", cost: 10 }, rug: { icon: "🧶", cost: 10 }, curtain: { icon: "🪟", cost: 10 }, picture: { icon: "🖼", cost: 12 },
  mirror: { icon: "🪞", cost: 12 }, garland: { icon: "🎏", cost: 12 }, pantry: { icon: "🍯", cost: 14 }, shelf: { icon: "📚", cost: 15 },
  musicbox: { icon: "🎼", cost: 18 }, sofa: { icon: "🛋", cost: 20 }, starlamp: { icon: "🌠", cost: 25 }
};
export const DECOR_NAMES = {
  flowers: ["Цветы", "Flowers", "Λουλούδια"], candles: ["Свечи", "Candles", "Κεριά"], lamp: ["Лампа", "Lamp", "Λάμπα"], toy: ["Мягкая игрушка", "Soft toy", "Αρκουδάκι"],
  plant: ["Растение", "Plant", "Φυτό"], rug: ["Ковёр", "Rug", "Χαλί"], curtain: ["Занавески", "Curtains", "Κουρτίνες"], picture: ["Картина", "Picture", "Πίνακας"],
  mirror: ["Зеркало", "Mirror", "Καθρέφτης"], garland: ["Гирлянда", "Garland", "Γιρλάντα"], pantry: ["Кладовая с мёдом", "Honey pantry", "Αποθήκη με μέλι"], shelf: ["Книжная полка", "Bookshelf", "Βιβλιοθήκη"],
  musicbox: ["Музыкальная шкатулка", "Music box", "Μουσικό κουτί"], sofa: ["Диван", "Sofa", "Καναπές"], starlamp: ["Лампа-звёздное небо", "Starry-sky lamp", "Λάμπα έναστρου ουρανού"]
};
export const decorName = (id, lang) => { const n = DECOR_NAMES[id]; return n ? n[{ ru: 0, en: 1, el: 2 }[lang] ?? 1] : id; };
