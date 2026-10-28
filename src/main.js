import "./styles.css";
import { t, getLang, setLang } from "./i18n.js";
import * as V from "./views.js";
import { configured } from "./fb.js";
import { taskView, dayKey, PACKS, packTask } from "./domain.js";

const demo = new URLSearchParams(location.search).has("demo");
const store = demo ? await import("./demo.js") : configured ? await import("./store.js") : null;
const S = store && store.M;

const $ = s => document.querySelector(s);
const LS = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const THEME_KEY = "nora-theme";
const NEW_TASK = () => ({ title: "", minutes: 15, difficulty: 1, repeat: "once", full: true });

const ui = { tab: "tasks", sheet: null, welcome: "choose", name: "", code: "", consent: false, err: "", busy: false, theme: LS.get(THEME_KEY) || "system" };

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
  if (name.startsWith("d.")) { ui.sheet.draft[name.slice(2)] = value; return; }
  ui[name] = value;
}
document.addEventListener("input", e => {
  const f = e.target.dataset.field; if (!f) return;
  const v = e.target.type === "checkbox" ? e.target.checked : e.target.tagName === "SELECT" ? Number(e.target.value) : e.target.value;
  setField(f, v);
  // the star preview depends on these
  if (e.target.type === "checkbox" || e.target.tagName === "SELECT") render();
});

const findView = id => {
  const task = S.tasks.find(x => x.id === id);
  return task && taskView(task, S.logs, S.pair.scale, dayKey());
};

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
  tab: el => { ui.tab = el.dataset.v; ui.err = ""; render(); },
  set: el => {
    const { name, v } = el.dataset;
    if (name === "lang") { setLang(v); store && S.user && store.saveLang(v).catch(() => {}); render(); return; }
    if (name === "theme") { ui.theme = v; LS.set(THEME_KEY, v); applyTheme(); render(); return; }
    if (name === "scale") { run(() => store.saveScale(Number(v)), "Сохранено"); return; }
    if (name === "help-tab") { ui.sheet.tab = v; render(); return; }
    setField(name, name === "d.repeat" ? v : Number(v));
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
document.addEventListener("keydown", e => { if (e.key === "Escape" && ui.sheet) actions.close(); });

// ---------- start ----------
setLang(getLang());
applyTheme();
try { matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => render()); } catch (e) {}
if (store) store.start(render);
render();
if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
  import("@capacitor/app").then(({ App }) => App.addListener("backButton", ({ canGoBack }) => {
    if (ui.sheet) actions.close(); else if (ui.tab !== "tasks") { ui.tab = "tasks"; render(); } else App.exitApp();
  })).catch(() => {});
}
