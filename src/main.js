import "./styles.css";
import { t, getLang, setLang } from "./i18n.js";
import * as V from "./views.js";
import { configured } from "./fb.js";
import { taskView, dayKey, PACKS, packTask, REWARD_PACKS, rewardRow } from "./domain.js";
import { initialGame, shuffle, deckKey, dayNumber } from "./gameviews.js";
import { WHEEL, COUPONS, DECKS, pick } from "../functions/gamedata.js";
import { DEFAULT_NAMES } from "./petdata.js";
import { stageOf } from "../functions/pet.js";

const demo = new URLSearchParams(location.search).has("demo");
const store = demo ? await import("./demo.js") : configured ? await import("./store.js") : null;
const S = store && store.M;

const $ = s => document.querySelector(s);
const LS = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const THEME_KEY = "nora-theme", SEEN_KEY = "nora-seen-signals";
const NEW_REWARD = () => ({ title: "", cost: 20, scope: "personal" });
const NEW_TASK = () => ({ title: "", minutes: 15, difficulty: 1, repeat: "once", full: true });

const ui = { game: null, seenAt: Number(LS.get(SEEN_KEY)) || 0, tab: "tasks", sheet: null, welcome: "choose", name: "", code: "", consent: false, err: "", busy: false, theme: LS.get(THEME_KEY) || "system" };

// ---------- messages ----------
function errText(e) {
  const c = (e && (e.code || e.message)) || "";
  if (/popup-closed|cancel|canceled|12501|user-cancelled/i.test(c)) return "";
  if (/bad-code/.test(c)) return t("Такого кода нет. Проверьте его у партнёра.");
  if (/pair-full/.test(c)) return t("В этой паре уже двое.");
  if (/need-name/.test(c)) return t("Введите имя");
  if (/need-consent/.test(c)) return t("Нужно подтвердить согласие");
  if (/need-title/.test(c)) return t("Напишите, что нужно сделать");
  if (/other-account/.test(c)) return t("Для удаления войдите в тот же аккаунт Google.");
  if (/limit/.test(c)) return t("Лимит на сегодня исчерпан.");
  if (/not-enough/.test(c)) return t("Не хватает звёзд.");
  if (/bad-cost/.test(c)) return t("Цена от 1 до 9999 звёзд.");
  if (/already-exists|permission-denied/.test(c)) return t("Этот этап уже отметили. Обновите экран.");
  if (/network|unavailable/.test(c)) return t("Нет связи с интернетом");
  return t("Не получилось") + (c ? " (" + c + ")" : "");
}
function toast(msg, ms = 2400) { const el = $("#toast"); el.textContent = msg; el.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("on"), ms); }
async function run(fn, okMsg) {
  if (ui.busy) return;
  ui.err = ""; ui.busy = true; render();
  try { await fn(); if (okMsg) toast(t(okMsg)); } catch (e) { ui.err = errText(e); }
  ui.busy = false; render();
}

// ---------- theme ----------
function applyTheme() {
  const r = document.documentElement;
  if (ui.theme === "light" || ui.theme === "dark") r.setAttribute("data-theme", ui.theme); else r.removeAttribute("data-theme");
}

// ---------- render ----------
let lastScreen = "";
function render() {
  const app = $("#app");
  // typing in an input must survive re-renders caused by live data
  const focused = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.field;
  const caret = focused && document.activeElement.selectionStart;
  let html, screen;
  if (!store) { html = V.setup(); screen = "setup"; }
  else if (!S.ready) { html = V.loading(); screen = "loading"; }
  else if (!S.user) { html = V.signIn(ui); screen = "signin"; }
  else if (!S.pair) { if (!ui.name && S.profile && S.profile.name) ui.name = S.profile.name; html = V.welcome(ui); screen = "welcome"; }
  else if (S.pair.loading) { html = V.loading(); screen = "loading"; }
  else { if (!ui.name) ui.name = S.pair.names[S.user.uid] || ""; html = V.main(S, ui); screen = "main:" + ui.tab; }
  // documents and help also open before sign-in
  if (!screen.startsWith("main") && ui.sheet) html += V.overlay(S, ui);
  const scroll = window.scrollY;
  app.innerHTML = html;
  if (screen === lastScreen) window.scrollTo(0, scroll); else window.scrollTo(0, 0);
  lastScreen = screen;
  if (focused) {
    const el = app.querySelector(`[data-field="${focused}"]`);
    if (el) { el.focus(); try { if (caret != null) el.setSelectionRange(caret, caret); } catch (e) {} }
  }
  if (S && S.error) { ui.err = errText({ code: S.error }); S.error = ""; }
}

// ---------- input ----------
function setField(name, value) {
  if (name.startsWith("petDraft.")) { ui.petDraft[name.slice(9)] = value; render(); return; }
  if (name.startsWith("d.")) { ui.sheet.draft[name.slice(2)] = value; return; }
  if (name.startsWith("g.")) { ui.game[name.slice(2)] = value; render(); return; }
  ui[name] = value;
}
document.addEventListener("input", e => {
  const f = e.target.dataset.field; if (!f) return;
  const v = e.target.type === "checkbox" ? e.target.checked : e.target.tagName === "SELECT" || e.target.type === "number" ? Number(e.target.value) : e.target.value;
  setField(f, v);
  // the star preview depends on these
  if (e.target.type === "checkbox" || e.target.tagName === "SELECT") render();
});

const findView = id => {
  const task = S.tasks.find(x => x.id === id);
  return task && taskView(task, S.logs, S.pair.scale, dayKey());
};

let wheelTimer = null;
const stopWheel = () => { if (wheelTimer) { clearInterval(wheelTimer); wheelTimer = null; } };
function saveDeck() { LS.set(deckKey(ui.game.id), String(ui.game.idx)); }

const actions = {
  demo: () => { location.search = "?demo"; },
  signin: () => run(() => store.signIn()),
  signout: () => run(async () => { ui.sheet = null; ui.tab = "tasks"; await store.signOutAll(); }),
  welcome: el => { ui.welcome = el.dataset.v; ui.err = ""; render(); },
  create: () => run(async () => {
    const name = ui.name.trim();
    if (!name) throw { code: "need-name" };
    if (!ui.consent) throw { code: "need-consent" };
    await store.createPair(name);
  }),
  join: () => run(async () => {
    const name = ui.name.trim();
    if (!name) throw { code: "need-name" };
    if (!ui.consent) throw { code: "need-consent" };
    await store.joinPair(ui.code, name);
  }, "Вы в паре!"),
  tab: el => {
    ui.tab = el.dataset.v; ui.err = "";
    if (ui.tab === "warm") { ui.seenAt = Date.now(); LS.set(SEEN_KEY, String(ui.seenAt)); }
    render();
  },
  signal: el => run(() => store.sendSignal("message", el.dataset.id), "Отправлено"),
  react: el => { ui.err = ""; ui.sheet = { type: "react", id: el.dataset.id }; render(); },
  "react-send": el => run(async () => { await store.sendSignal("reaction", el.dataset.id, el.dataset.ref); ui.sheet = null; }, "Отправлено"),
  set: el => {
    const { name, v } = el.dataset;
    if (name === "lang") { setLang(v); if (store && S.user) { store.saveLang(v).catch(() => {}); store.setDeviceLang(v); } render(); return; }
    if (name === "theme") { ui.theme = v; LS.set(THEME_KEY, v); applyTheme(); render(); return; }
    if (name === "scale") { run(() => store.saveScale(Number(v)), "Сохранено"); return; }
    if (name === "help-tab") { ui.sheet.tab = v; render(); return; }
    if (name === "burrow-tab") { ui.sheet.tab = v; render(); return; }
    setField(name, name === "d.repeat" || name === "d.scope" ? v : Number(v));
    render();
  },
  "copy-code": async () => {
    try { await navigator.clipboard.writeText(S.pair.inviteCode); toast(t("Код скопирован")); } catch (e) { toast(S.pair.inviteCode); }
  },
  "share-code": async () => {
    const text = t("Давай играть в Нору вдвоём! Установи приложение и введи код: {code}", { code: S.pair.inviteCode });
    try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); toast(t("Текст приглашения скопирован")); } } catch (e) {}
  },
  "new-invite": () => run(() => store.newInvite(), "Новый код готов"),
  "save-name": () => run(async () => { const n = ui.name.trim(); if (!n) throw { code: "need-name" }; await store.saveName(n.slice(0, 40)); }, "Сохранено"),
  "new-task": () => { ui.err = ""; ui.sheet = { type: "task", draft: NEW_TASK() }; render(); },
  "edit-task": el => {
    const task = S.tasks.find(x => x.id === el.dataset.id); if (!task) return;
    ui.err = ""; ui.sheet = { type: "task", draft: Object.assign({}, task) }; render();
  },
  "save-task": () => run(async () => {
    const d = ui.sheet.draft;
    if (!d.title.trim()) throw { code: "need-title" };
    await store.saveTask(d); ui.sheet = null;
  }, "Сохранено"),
  "delete-task": el => run(async () => { await store.deleteTask(el.dataset.id); ui.sheet = null; }, "Дело удалено"),
  packs: () => { ui.err = ""; ui.sheet = { type: "packs", picked: new Set() }; render(); },
  // ---- the pet ----
  "pet-kind": el => {
    const k = el.dataset.id, d = ui.petDraft || (ui.petDraft = {});
    const wasDefault = !d.name || Object.values(DEFAULT_NAMES).some(n => n.includes(d.name));
    d.kind = k; if (wasDefault) d.name = pick(DEFAULT_NAMES[k], getLang()); render();
  },
  "pet-save": () => run(async () => { const d = ui.petDraft; if (!d || !d.name.trim()) throw { code: "need-name" }; await store.savePet({ kind: d.kind, name: d.name.trim().slice(0, 20) }); ui.petDraft = null; }, "Готово"),
  "pet-edit": () => { ui.petDraft = Object.assign({}, S.pair.pet); S.pair.pet && (ui.editingPet = true); ui.sheet = { type: "petname" }; render(); },
  "pet-name-save": () => run(async () => { const n = (ui.petDraft.name || "").trim(); if (!n) throw { code: "need-name" }; await store.savePet({ kind: S.pair.pet.kind, name: n.slice(0, 20) }); ui.sheet = null; ui.petDraft = null; }, "Сохранено"),
  "pet-pat": () => {
    ui.pats = (ui.pats || 0) + 1; ui.grew = null; ui.bounce = true; render();
    setTimeout(() => { ui.bounce = false; render(); }, 650);
  },
  burrow: el => { ui.err = ""; ui.sheet = { type: "burrow", tab: el.dataset.v }; render(); },
  "buy-decor": el => { ui.err = ""; ui.sheet = { type: "buydecor", id: el.dataset.id }; render(); },
  "buy-decor-yes": el => run(async () => { await store.placeOrder("decor", el.dataset.id); ui.sheet = { type: "burrow", tab: "burrow" }; }, "Предложено партнёру"),
  // ---- games ----
  "game-open": el => { ui.err = ""; ui.game = initialGame(el.dataset.id); render(); window.scrollTo(0, 0); },
  "game-back": () => { stopWheel(); ui.game = null; ui.err = ""; render(); },
  "buy-game": el => { ui.err = ""; ui.sheet = { type: "buygame", id: el.dataset.id }; render(); },
  "buy-game-yes": el => run(async () => { await store.placeOrder("game", el.dataset.id); ui.sheet = null; }, "Предложено партнёру"),
  "wheel-spin": () => {
    const g = ui.game; if (g.spinning) return;
    g.spinning = true; let n = 0; const final = Math.floor(Math.random() * WHEEL.length);
    wheelTimer = setInterval(() => {
      n++; g.cur = n > 14 ? final : Math.floor(Math.random() * WHEEL.length);
      if (n > 14) { stopWheel(); g.spinning = false; }
      render();
    }, 100);
    render();
  },
  "deck-next": () => { ui.game.idx++; saveDeck(); render(); },
  "deck-prev": () => { ui.game.idx = Math.max(0, ui.game.idx - 1); saveDeck(); render(); },
  "deck-restart": () => { ui.game.idx = 0; if (ui.game.id !== "questions36") ui.game.order = shuffle(DECKS[ui.game.id].length); saveDeck(); render(); },
  "guess-open": el => { ui.game.open = Number(el.dataset.id); ui.game.step = 0; ui.game.v = null; ui.err = ""; render(); },
  "guess-close": () => { ui.game.open = null; render(); },
  "guess-pick": el => {
    const g = ui.game, k = Number(el.dataset.k);
    if (g.step === 0) { g.v = k; g.step = 1; render(); return; }
    const item = g.open, v = g.v; g.step = 0; g.v = null;
    run(() => store.sendAnswer("guess", item, { v, g: k }), "Ответ принят");
  },
  wish: el => run(() => store.sendAnswer("wishes", Number(el.dataset.id), { v: el.dataset.v }), "Ответ записан"),
  "coupon-adding": el => { ui.game.adding = el.dataset.v === "1"; render(); },
  "coupon-give": el => run(async () => { await store.addCoupon(pick(COUPONS[Number(el.dataset.id)], getLang())); ui.game.adding = false; }, "Купон подарен"),
  "coupon-give-custom": () => run(async () => { await store.addCoupon(ui.game.text); ui.game.text = ""; ui.game.adding = false; }, "Купон подарен"),
  "coupon-use": el => run(() => store.useCoupon(el.dataset.id), "Отмечено"),
  "coupon-del": el => run(() => store.deleteCoupon(el.dataset.id)),
  "script-open": el => { ui.game.script = Number(el.dataset.id); ui.game.done = new Set(); render(); },
  "script-step": el => { const d = ui.game.done, i = Number(el.dataset.id); d.has(i) ? d.delete(i) : d.add(i); render(); },
  "script-close": () => { ui.game.script = null; render(); },
  "days-start": () => run(() => store.saveProgress({ start: dayKey(), done: [] })),
  "days-done": el => run(() => {
    const pr = S.progress, n = Number(el.dataset.id);
    if (!pr || n < 1 || n > Math.min(30, dayNumber(pr.start, dayKey()))) return;
    return store.saveProgress({ start: pr.start, done: [...new Set([...(pr.done || []), n])].sort((a, b) => a - b) });
  }, "Отмечено"),
  "new-reward": () => { ui.err = ""; ui.sheet = { type: "reward", draft: NEW_REWARD() }; render(); },
  "edit-reward": el => { const r = S.rewards.find(x => x.id === el.dataset.id); if (r) { ui.err = ""; ui.sheet = { type: "reward", draft: Object.assign({}, r) }; render(); } },
  "save-reward": () => run(async () => {
    const d = ui.sheet.draft;
    if (!d.title.trim()) throw { code: "need-title" };
    if (!Number.isInteger(d.cost) || d.cost < 1 || d.cost > 9999) throw { code: "bad-cost" };
    await store.saveReward(d); ui.sheet = null;
  }, "Сохранено"),
  "delete-reward": el => run(async () => { await store.deleteReward(el.dataset.id); ui.sheet = null; }, "Награда удалена"),
  "reward-packs": () => { ui.err = ""; ui.sheet = { type: "rewardpacks", picked: new Set() }; render(); },
  "add-picked-rewards": () => run(async () => {
    const list = [...ui.sheet.picked].map(id => {
      const [packId, i] = id.split(":"), r = rewardRow(REWARD_PACKS.find(p => p.id === packId).rewards[Number(i)]);
      return Object.assign(r, { title: t(r.title) });
    });
    await store.addRewards(list); ui.sheet = null;
  }, "Награды добавлены"),
  buy: el => { ui.err = ""; ui.sheet = { type: "buy", id: el.dataset.id }; render(); },
  "buy-yes": el => run(async () => { await store.placeOrder("reward", el.dataset.id); ui.sheet = null; }, "Готово"),
  "approve-order": el => run(() => store.approveOrder(el.dataset.id), "Согласие отправлено"),
  "cancel-order": el => run(() => store.cancelOrder(el.dataset.id)),
  "use-order": el => run(() => store.markUsed(el.dataset.id), "Отмечено"),
  pick: el => { const p = ui.sheet.picked, id = el.dataset.id; p.has(id) ? p.delete(id) : p.add(id); render(); },
  "pick-all": el => {
    const have = new Set(S.tasks.map(x => x.title.trim().toLowerCase()));
    const pack = PACKS.find(p => p.id === el.dataset.id);
    const ids = pack.tasks.map((r, i) => [pack.id + ":" + i, t(r[0])]).filter(([, title]) => !have.has(title.toLowerCase())).map(([id]) => id);
    const p = ui.sheet.picked, all = ids.every(id => p.has(id));
    ids.forEach(id => all ? p.delete(id) : p.add(id));
    render();
  },
  "add-picked": () => run(async () => {
    const tasks = [...ui.sheet.picked].map(id => {
      const [packId, i] = id.split(":"), task = packTask(PACKS.find(p => p.id === packId).tasks[Number(i)]);
      return Object.assign(task, { title: t(task.title) });
    });
    await store.addTasks(tasks); ui.sheet = null;
  }, "Дела добавлены"),
  claim: el => {
    const v = findView(el.dataset.task); if (!v) return;
    const stage = v.stages.find(s => s.stage === el.dataset.stage);
    run(() => store.claim(v, stage, !!el.dataset.together), el.dataset.together ? "Вместе — двойные звёзды в копилку!" : "");
  },
  undo: el => { ui.sheet = { type: "undo", id: el.dataset.id }; render(); },
  "undo-yes": el => run(async () => { await store.unclaim(el.dataset.id); ui.sheet = null; }),
  leave: () => { ui.sheet = { type: "leave" }; render(); },
  doc: el => { ui.sheet = { type: "doc", v: el.dataset.v }; render(); document.querySelector(".sheet").scrollTop = 0; },
  help: () => { ui.sheet = { type: "help", tab: "guide" }; render(); },
  "delete-account": () => { ui.sheet = { type: "delete" }; render(); },
  "delete-yes": () => run(async () => { await store.deleteAccount(); ui.sheet = null; ui.tab = "tasks"; ui.name = ""; ui.consent = false; ui.welcome = "choose"; }, "Аккаунт удалён"),
  "leave-yes": () => run(async () => { ui.sheet = null; ui.tab = "tasks"; await store.leavePair(); }),
  close: () => { ui.sheet = null; ui.err = ""; render(); }
};

document.addEventListener("click", e => {
  const el = e.target.closest("[data-act]");
  if (!el || el.disabled) return;
  const f = actions[el.dataset.act];
  if (f) { e.preventDefault(); f(el); }
});
// the Android back button closes a sheet first
document.addEventListener("keydown", e => { if (e.key === "Escape") { if (ui.sheet) actions.close(); else if (ui.game) actions["game-back"](); } });

// ---------- start ----------
setLang(getLang());
applyTheme();
try { matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => render()); } catch (e) {}
let registered = false;
function afterRender() {
  // a new growth stage is announced once, by the pet
  if (store && S.user && S.pair && S.pair.pet && ui.grew == null) {
    const key = "nora-stage-" + S.pair.id, now = stageOf(S.pair.xp).index, was = LS.get(key);
    if (was === null) LS.set(key, String(now));
    else if (now > Number(was)) { LS.set(key, String(now)); ui.grew = now; render(); }
  }
  // ask for the notification permission once, when the pair is open
  if (store && !registered && S.user && S.pair && !S.pair.loading) {
    registered = true;
    store.registerDevice(getLang(), m => toast([m.title, m.body].filter(Boolean).join(": "), 4000));
  }
}
if (store) store.start(() => { render(); afterRender(); });
render();
if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
  import("@capacitor/app").then(({ App }) => App.addListener("backButton", ({ canGoBack }) => {
    if (ui.sheet) actions.close(); else if (ui.game) actions["game-back"](); else if (ui.tab !== "tasks") { ui.tab = "tasks"; render(); } else App.exitApp();
  })).catch(() => {});
}
